import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@insurance/shared';
import { DocumentAiEvalRun } from './entities/DocumentAiEvalRun';
import { DocumentAiEvalCase } from './entities/DocumentAiEvalCase';
import { DocumentAiEvalResult } from './entities/DocumentAiEvalResult';
import { DocumentAiProcessor } from './document-ai.processor';

@Injectable()
export class DocumentAiEvalWorker implements OnModuleInit {
  private logger = createLogger({
    serviceName: 'document-ai-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  private pollingTimer: any;
  private readonly workerId: string;

  constructor(
    @InjectRepository(DocumentAiEvalRun) private readonly runRepo: Repository<DocumentAiEvalRun>,
    @InjectRepository(DocumentAiEvalCase) private readonly caseRepo: Repository<DocumentAiEvalCase>,
    @InjectRepository(DocumentAiEvalResult) private readonly resultRepo: Repository<DocumentAiEvalResult>,
    private readonly processor: DocumentAiProcessor
  ) {
    this.workerId = process.env.DOCUMENT_AI_EVAL_WORKER_ID || `doc-ai-eval-${process.pid}`;
  }

  async onModuleInit(): Promise<void> {
    const enabled = (process.env.DOCUMENT_AI_EVAL_WORKER_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) {
      this.logger.info('DocumentAiEvalWorker disabled by env');
      return;
    }

    const intervalMs = Math.max(500, parseInt(process.env.DOCUMENT_AI_EVAL_POLL_INTERVAL_MS || '2000', 10) || 2000);
    this.logger.info('DocumentAiEvalWorker started', { workerId: this.workerId, intervalMs });

    this.pollingTimer = setInterval(() => {
      this.tick().catch((e) => {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error('DocumentAiEvalWorker tick failed', err);
      });
    }, intervalMs);
  }

  private normalizeScalar(v: any): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
    return String(v).trim().toLowerCase();
  }

  private scoreExpectedVsActual(expected: any, actual: any): { score: number; diff: any } {
    const expObj = expected && typeof expected === 'object' ? expected : {};
    const actObj = actual && typeof actual === 'object' ? actual : {};

    const keys = Object.keys(expObj);
    if (keys.length === 0) return { score: 0, diff: { reason: 'NO_EXPECTED_KEYS' } };

    const missing: string[] = [];
    const mismatched: Array<{ key: string; expected: any; actual: any }> = [];
    const matched: string[] = [];

    for (const k of keys) {
      if (!(k in actObj)) {
        missing.push(k);
        continue;
      }
      const ev = (expObj as any)[k];
      const av = (actObj as any)[k];
      if (this.normalizeScalar(ev) === this.normalizeScalar(av)) {
        matched.push(k);
      } else {
        mismatched.push({ key: k, expected: ev, actual: av });
      }
    }

    const score = matched.length / keys.length;
    return {
      score,
      diff: {
        totalExpectedKeys: keys.length,
        matched,
        missing,
        mismatched,
      },
    };
  }

  private async claimNextRun(): Promise<DocumentAiEvalRun | null> {
    const run = await this.runRepo
      .createQueryBuilder('r')
      .setLock('pessimistic_write')
      .useTransaction(true)
      .where('r.status = :status', { status: 'queued' })
      .orderBy('r.created_at', 'ASC')
      .getOne();

    if (!run) return null;

    run.status = 'running';
    run.startedAt = new Date();
    run.errorMessage = null;
    run.errorStack = null;
    await this.runRepo.save(run);

    return run;
  }

  private async tick(): Promise<void> {
    const run = await this.runRepo.manager.transaction(async (em) => {
      const repo = em.getRepository(DocumentAiEvalRun);
      const candidate = await repo
        .createQueryBuilder('r')
        .setLock('pessimistic_write')
        .where('r.status = :status', { status: 'queued' })
        .orderBy('r.created_at', 'ASC')
        .getOne();

      if (!candidate) return null;
      candidate.status = 'running';
      candidate.startedAt = new Date();
      candidate.errorMessage = null;
      candidate.errorStack = null;
      await repo.save(candidate);
      return candidate;
    });

    if (!run) return;

    const maxCases = Math.max(1, Math.min(500, parseInt((run.params as any)?.maxCases || process.env.DOCUMENT_AI_EVAL_MAX_CASES || '50', 10) || 50));
    const onlyEnabled = ((run.params as any)?.onlyEnabled ?? true) !== false;

    try {
      const qb = this.caseRepo.createQueryBuilder('c');
      if (onlyEnabled) qb.andWhere('c.enabled = true');
      qb.orderBy('c.created_at', 'ASC').limit(maxCases);
      const cases = await qb.getMany();

      for (const c of cases) {
        try {
          const extraction = await this.processor.extractForEval({ documentId: c.documentId, correlationId: `eval-${run.runId}` });
          const expected = c.expected;
          const actual = extraction.extractedFields;
          const scored = this.scoreExpectedVsActual(expected, actual);

          await this.resultRepo.save(
            this.resultRepo.create({
              runId: run.runId,
              caseId: c.caseId,
              documentId: c.documentId,
              expected,
              actual,
              score: String(scored.score),
              diff: scored.diff,
              errorMessage: null,
              errorStack: null,
            })
          );
        } catch (e: any) {
          const err = e instanceof Error ? e : new Error(String(e));
          await this.resultRepo.save(
            this.resultRepo.create({
              runId: run.runId,
              caseId: c.caseId,
              documentId: c.documentId,
              expected: c.expected,
              actual: null,
              score: null,
              diff: null,
              errorMessage: err.message,
              errorStack: err.stack || null,
            })
          );
        }
      }

      run.status = 'completed';
      run.finishedAt = new Date();
      await this.runRepo.save(run);
      this.logger.info('Eval run completed', { runId: run.runId, cases: cases.length });
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      run.status = 'failed';
      run.finishedAt = new Date();
      run.errorMessage = err.message;
      run.errorStack = err.stack || null;
      await this.runRepo.save(run);
      this.logger.error('Eval run failed', err, { runId: run.runId });
    }
  }
}
