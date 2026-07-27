import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { createLogger, Logger } from '@insurance/shared';
import { WorkItem } from './entities/WorkItem';
import { SagaInstance } from './entities/SagaInstance';

@Injectable()
export class SlaMonitorService implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  private slaTimer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(WorkItem) private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(SagaInstance) private readonly sagaRepo: Repository<SagaInstance>
  ) {
    this.logger = createLogger({
      serviceName: 'orchestrator-sla-monitor',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });
  }

  async onModuleInit(): Promise<void> {
    const intervalMs = parseInt(process.env.SLA_CHECK_INTERVAL_MS || '3600000', 10);
    this.slaTimer = setInterval(async () => {
      try {
        const result = await this.processSlaBreaches();
        if (result.processed > 0) {
          this.logger.info('SLA scheduled check completed', { processed: result.processed, escalated: result.escalated });
        }
      } catch (err) {
        this.logger.error('SLA scheduled check failed', err as Error);
      }
    }, intervalMs);
    this.logger.info('SLA monitor scheduler started', { intervalMs });
  }

  onModuleDestroy(): void {
    if (this.slaTimer) clearInterval(this.slaTimer);
  }

  /**
   * Check for SLA breaches in work items
   * Returns work items that have exceeded their due date and are not completed
   */
  async checkSlaBreaches(): Promise<{
    breached: WorkItem[];
    metrics: {
      totalBreached: number;
      byWorkItemType: Record<string, number>;
      averageOverdueHours: number;
    };
  }> {
    const now = new Date();

    // Find work items with due date passed and status not completed/rejected
    const breachedItems = await this.workItemRepo.find({
      where: {
        dueDate: LessThan(now),
        status: 'pending' as any,
      },
      order: { dueDate: 'ASC' },
    });

    // Filter out items without due dates (defensive)
    const breached = breachedItems.filter((item) => item.dueDate !== null);

    // Calculate metrics
    const byWorkItemType: Record<string, number> = {};
    let totalOverdueMs = 0;

    for (const item of breached) {
      const type = item.workItemType || 'unknown';
      byWorkItemType[type] = (byWorkItemType[type] || 0) + 1;

      if (item.dueDate) {
        totalOverdueMs += now.getTime() - item.dueDate.getTime();
      }
    }

    const averageOverdueHours = breached.length > 0
      ? Math.round((totalOverdueMs / breached.length) / (1000 * 60 * 60) * 100) / 100
      : 0;

    const metrics = {
      totalBreached: breached.length,
      byWorkItemType,
      averageOverdueHours,
    };

    if (breached.length > 0) {
      this.logger.warn('sla.breaches.detected', {
        count: breached.length,
        metrics,
      });
    }

    return { breached, metrics };
  }

  /**
   * Get SLA statistics for a specific saga
   */
  async getSlaStats(sagaId: string): Promise<{
    sagaStatus: string;
    totalWorkItems: number;
    completedOnTime: number;
    breached: number;
    pendingWithDueDate: number;
    pendingWithoutDueDate: number;
    averageResolutionHours: number;
  }> {
    const saga = await this.sagaRepo.findOne({ where: { sagaId } });
    if (!saga) {
      throw new Error('Saga not found');
    }

    const workItems = await this.workItemRepo.find({ where: { sagaId } });
    const now = new Date();

    let completedOnTime = 0;
    let breached = 0;
    let pendingWithDueDate = 0;
    let pendingWithoutDueDate = 0;
    let totalResolutionMs = 0;
    let completedCount = 0;

    for (const item of workItems) {
      if (item.status === 'completed' || item.status === 'rejected') {
        completedCount++;
        if (item.dueDate && item.updatedAt && item.updatedAt <= item.dueDate) {
          completedOnTime++;
        }
        if (item.createdAt && item.updatedAt) {
          totalResolutionMs += item.updatedAt.getTime() - item.createdAt.getTime();
        }
      } else if (item.status === 'pending') {
        if (item.dueDate) {
          if (item.dueDate < now) {
            breached++;
          } else {
            pendingWithDueDate++;
          }
        } else {
          pendingWithoutDueDate++;
        }
      }
    }

    const averageResolutionHours = completedCount > 0
      ? Math.round((totalResolutionMs / completedCount) / (1000 * 60 * 60) * 100) / 100
      : 0;

    return {
      sagaStatus: saga.status,
      totalWorkItems: workItems.length,
      completedOnTime,
      breached,
      pendingWithDueDate,
      pendingWithoutDueDate,
      averageResolutionHours,
    };
  }

  /**
   * Update SLA status for work items and publish breach events
   */
  async processSlaBreaches(): Promise<{
    processed: number;
    escalated: number;
    details: Array<{
      workItemId: string;
      workItemType: string;
      overdueHours: number;
      action: string;
    }>;
  }> {
    const { breached } = await this.checkSlaBreaches();
    const now = new Date();

    let processed = 0;
    let escalated = 0;
    const details: Array<{
      workItemId: string;
      workItemType: string;
      overdueHours: number;
      action: string;
    }> = [];

    for (const item of breached) {
      if (!item.dueDate) continue;

      const overdueMs = now.getTime() - item.dueDate.getTime();
      const overdueHours = Math.round(overdueMs / (1000 * 60 * 60) * 100) / 100;

      let action = 'notified';

      // Escalate if severely overdue (> 48 hours)
      if (overdueHours > 48) {
        action = 'escalated';
        escalated++;

        // Update work item to mark as escalated
        item.decisionNotes = item.decisionNotes
          ? `${item.decisionNotes}\n[SLA ESCALATED] Overdue by ${overdueHours}h at ${now.toISOString()}`
          : `[SLA ESCALATED] Overdue by ${overdueHours}h at ${now.toISOString()}`;
        item.updatedAt = now;
        await this.workItemRepo.save(item);
      }

      processed++;
      details.push({
        workItemId: item.workItemId,
        workItemType: item.workItemType || 'unknown',
        overdueHours,
        action,
      });

      this.logger.warn('sla.breach.processed', {
        workItemId: item.workItemId,
        workItemType: item.workItemType,
        overdueHours,
        action,
      });
    }

    return { processed, escalated, details };
  }
}
