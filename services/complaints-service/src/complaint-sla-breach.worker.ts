import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@insurance/shared';
import { Complaint } from './entities/Complaint';
import { ComplaintSlaBreach } from './entities/ComplaintSlaBreach';
import { ComplaintsService } from './complaints.service';

@Injectable()
export class ComplaintSlaBreachWorker implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  private readonly logger = createLogger({
    serviceName: 'complaints-service',
    level: process.env.LOG_LEVEL || 'info',
  }).child({ component: 'ComplaintSlaBreachWorker' });

  constructor(
    private readonly dataSource: DataSource,
    private readonly complaintsService: ComplaintsService,
    @InjectRepository(Complaint) private readonly complaintsRepo: Repository<Complaint>,
    @InjectRepository(ComplaintSlaBreach) private readonly breachesRepo: Repository<ComplaintSlaBreach>
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = String(process.env.COMPLAINTS_SLA_BREACH_WORKER_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      this.logger.info('SLA breach worker disabled');
      return;
    }

    const intervalMs = this.getIntervalMs();
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    void this.tick();
    this.logger.info('SLA breach worker started', { intervalMs });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private getIntervalMs(): number {
    const raw = parseInt(process.env.COMPLAINTS_SLA_BREACH_POLL_INTERVAL_MS || '60000', 10);
    if (!Number.isFinite(raw) || raw < 5_000) return 60_000;
    return raw;
  }

  private getBatchSize(): number {
    const raw = parseInt(process.env.COMPLAINTS_SLA_BREACH_BATCH_SIZE || '50', 10);
    if (!Number.isFinite(raw) || raw <= 0) return 50;
    return Math.min(200, raw);
  }

  private async tryAcquireLeaderLock(): Promise<boolean> {
    const rows = (await this.dataSource.query(`SELECT pg_try_advisory_lock(hashtext($1)) as locked;`, [
      'complaints_sla_breach_worker_v1',
    ])) as Array<{ locked: boolean }>;

    return Array.isArray(rows) && rows.length > 0 ? Boolean((rows[0] as any).locked) : false;
  }

  private async releaseLeaderLock(): Promise<void> {
    await this.dataSource.query(`SELECT pg_advisory_unlock(hashtext($1));`, ['complaints_sla_breach_worker_v1']);
  }

  private hoursBetween(a: Date, b: Date): number {
    return Math.floor(Math.abs(b.getTime() - a.getTime()) / (60 * 60 * 1000));
  }

  private computeSlaHours(c: Complaint): number | null {
    if (!c.createdAt || !c.slaResolutionDueAt) return null;
    return this.hoursBetween(c.createdAt, c.slaResolutionDueAt);
  }

  async tick(): Promise<void> {
    const locked = await this.tryAcquireLeaderLock();
    if (!locked) return;

    const now = new Date();
    const batchSize = this.getBatchSize();

    try {
      const overdue = await this.complaintsRepo
        .createQueryBuilder('c')
        .where('c.status IN (:...statuses)', { statuses: ['open', 'in_review', 'escalated'] })
        .andWhere('c.resolved_at IS NULL')
        .andWhere('c.sla_resolution_due_at IS NOT NULL')
        .andWhere('c.sla_resolution_due_at < :now', { now: now.toISOString() })
        .orderBy('c.sla_resolution_due_at', 'ASC')
        .limit(batchSize)
        .getMany();

      if (!Array.isArray(overdue) || overdue.length === 0) return;

      for (const c of overdue) {
        if (!c.slaResolutionDueAt) continue;

        const elapsedHours = this.hoursBetween(c.slaResolutionDueAt, now);
        const slaHours = this.computeSlaHours(c);

        try {
          const breach = this.breachesRepo.create({
            complaintId: c.complaintId,
            breachType: 'resolution',
            slaDueAt: c.slaResolutionDueAt,
            breachedAt: now,
            slaHours,
            elapsedHours,
          });
          await this.breachesRepo.save(breach);
        } catch (e: any) {
          const msg = String(e?.message || e);
          if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
            continue;
          }
          this.logger.error('Failed to persist SLA breach record', e as Error, { complaintId: c.complaintId });
          continue;
        }

        try {
          await this.complaintsService.publishComplaintSlaBreachedEvent({
            complaint: c,
            breachedAt: now,
            slaHours,
            elapsedHours,
            audit: { correlationId: undefined, tenantId: undefined, actorUserId: undefined },
          });
        } catch (e: any) {
          this.logger.error('Failed to publish SLA breached event', e as Error, { complaintId: c.complaintId });
        }
      }

      this.logger.info('SLA breach tick completed', { scanned: overdue.length });
    } catch (e: any) {
      this.logger.error('SLA breach tick failed', e as Error);
    } finally {
      try {
        await this.releaseLeaderLock();
      } catch {
        // ignore
      }
    }
  }
}
