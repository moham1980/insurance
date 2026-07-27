import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@insurance/shared';
import { DocumentAiJob, type DocumentAiJobStatus } from './entities/DocumentAiJob';
import { DocumentAiProcessor } from './document-ai.processor';

@Injectable()
export class DocumentAiJobWorker implements OnModuleInit {
  private logger = createLogger({
    serviceName: 'document-ai-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  private readonly workerId: string;
  private pollingTimer: any;

  constructor(
    @InjectRepository(DocumentAiJob) private readonly jobRepo: Repository<DocumentAiJob>,
    private readonly processor: DocumentAiProcessor
  ) {
    this.workerId = process.env.WORKER_ID || `doc-ai-${process.pid}`;
  }

  async onModuleInit(): Promise<void> {
    const enabled = (process.env.DOCUMENT_AI_WORKER_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) {
      this.logger.info('DocumentAiJobWorker disabled by env');
      return;
    }

    const intervalMs = Math.max(250, parseInt(process.env.DOCUMENT_AI_POLL_INTERVAL_MS || '1000', 10) || 1000);

    this.logger.info('DocumentAiJobWorker started', { workerId: this.workerId, intervalMs });

    this.pollingTimer = setInterval(() => {
      this.tick().catch((e) => {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error('DocumentAiJobWorker tick failed', err);
      });
    }, intervalMs);
  }

  private backoffMs(attempt: number): number {
    const base = Math.max(250, parseInt(process.env.DOCUMENT_AI_RETRY_BASE_MS || '1000', 10) || 1000);
    const max = Math.max(base, parseInt(process.env.DOCUMENT_AI_RETRY_MAX_MS || '60000', 10) || 60000);
    const pow = Math.min(10, Math.max(0, attempt));
    const ms = Math.min(max, base * Math.pow(2, pow));
    const jitter = Math.floor(Math.random() * Math.min(500, Math.floor(ms * 0.2)));
    return ms + jitter;
  }

  private async claimNextJob(): Promise<DocumentAiJob | null> {
    const statuses: DocumentAiJobStatus[] = ['pending', 'retry'];
    const now = new Date();

    const job = await this.jobRepo
      .createQueryBuilder('j')
      .setLock('pessimistic_write')
      .useTransaction(true)
      .where('j.status IN (:...statuses)', { statuses })
      .andWhere('(j.next_run_at IS NULL OR j.next_run_at <= :now)', { now })
      .andWhere('(j.locked_at IS NULL OR j.locked_at < :lockExpiry)', {
        lockExpiry: new Date(Date.now() - (parseInt(process.env.DOCUMENT_AI_LOCK_TTL_MS || '600000', 10) || 600000)),
      })
      .orderBy('j.created_at', 'ASC')
      .getOne();

    if (!job) return null;

    job.status = 'processing';
    job.lockedAt = new Date();
    job.lockedBy = this.workerId;
    await this.jobRepo.save(job);

    return job;
  }

  private async tick(): Promise<void> {
    const batchSize = Math.max(1, Math.min(50, parseInt(process.env.DOCUMENT_AI_BATCH_SIZE || '5', 10) || 5));

    for (let i = 0; i < batchSize; i++) {
      const job = await this.jobRepo.manager.transaction(async (em) => {
        const repo = em.getRepository(DocumentAiJob);
        const statuses: DocumentAiJobStatus[] = ['pending', 'retry'];
        const now = new Date();

        const candidate = await repo
          .createQueryBuilder('j')
          .setLock('pessimistic_write')
          .where('j.status IN (:...statuses)', { statuses })
          .andWhere('(j.next_run_at IS NULL OR j.next_run_at <= :now)', { now })
          .andWhere('(j.locked_at IS NULL OR j.locked_at < :lockExpiry)', {
            lockExpiry: new Date(Date.now() - (parseInt(process.env.DOCUMENT_AI_LOCK_TTL_MS || '600000', 10) || 600000)),
          })
          .orderBy('j.created_at', 'ASC')
          .getOne();

        if (!candidate) return null;

        candidate.status = 'processing';
        candidate.lockedAt = new Date();
        candidate.lockedBy = this.workerId;
        await repo.save(candidate);
        return candidate;
      });

      if (!job) return;

      try {
        await this.processor.processDocument({
          documentId: job.documentId,
          correlationId: job.correlationId || 'n/a',
          tenantId: job.tenantId,
          actorUserId: job.actorUserId,
          traceparent: job.traceparent,
        });

        job.status = 'completed';
        job.lockedAt = null;
        job.lockedBy = null;
        job.nextRunAt = null;
        await this.jobRepo.save(job);
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        job.attempt = (job.attempt || 0) + 1;
        job.lastErrorMessage = err.message;
        job.lastErrorStack = err.stack || null;

        if (job.attempt >= (job.maxAttempts || 5)) {
          job.status = 'dead_letter';
          job.dlqReason = 'MAX_ATTEMPTS_EXCEEDED';
          job.lockedAt = null;
          job.lockedBy = null;
          job.nextRunAt = null;
          await this.jobRepo.save(job);

          this.logger.error('Document AI job moved to dead_letter', err, {
            jobId: job.jobId,
            documentId: job.documentId,
            attempt: job.attempt,
          });
          continue;
        }

        job.status = 'retry';
        job.lockedAt = null;
        job.lockedBy = null;
        job.nextRunAt = new Date(Date.now() + this.backoffMs(job.attempt));
        await this.jobRepo.save(job);

        this.logger.warn('Document AI job scheduled for retry', {
          jobId: job.jobId,
          documentId: job.documentId,
          attempt: job.attempt,
          nextRunAt: job.nextRunAt.toISOString(),
        });
      }
    }
  }
}
