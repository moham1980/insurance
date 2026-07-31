import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, In, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createLogger, Logger, OutboxPublisher } from '@insurance/shared';
import { WorkItem, WorkItemPriority, WorkItemStatus } from './entities/WorkItem';
import { SagaInstance } from './entities/SagaInstance';

@Injectable()
export class SlaMonitorService implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  private slaTimer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(WorkItem) private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(SagaInstance) private readonly sagaRepo: Repository<SagaInstance>,
    private readonly dataSource: DataSource
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
  async checkSlaBreaches(tenantId?: string): Promise<{
    breached: WorkItem[];
    metrics: {
      totalBreached: number;
      byWorkItemType: Record<string, number>;
      averageOverdueHours: number;
    };
  }> {
    const now = new Date();

    // Find work items with due date passed and status not completed/rejected/escalated
    const where: any = {
      dueDate: LessThan(now),
      status: Not(In([WorkItemStatus.completed, WorkItemStatus.rejected, WorkItemStatus.escalated])),
    };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const breachedItems = await this.workItemRepo.find({
      where,
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
  async getSlaStats(tenantId: string, sagaId: string): Promise<{
    sagaStatus: string;
    totalWorkItems: number;
    completedOnTime: number;
    breached: number;
    pendingWithDueDate: number;
    pendingWithoutDueDate: number;
    averageResolutionHours: number;
  }> {
    const saga = await this.sagaRepo.findOne({ where: { sagaId, tenantId } });
    if (!saga) {
      throw new Error('Saga not found');
    }

    const workItems = await this.workItemRepo.find({ where: { sagaId, tenantId } });
    const now = new Date();

    let completedOnTime = 0;
    let breached = 0;
    let pendingWithDueDate = 0;
    let pendingWithoutDueDate = 0;
    let totalResolutionMs = 0;
    let completedCount = 0;

    for (const item of workItems) {
      if (item.status === WorkItemStatus.completed || item.status === WorkItemStatus.rejected || item.status === WorkItemStatus.escalated) {
        completedCount++;
        if (item.dueDate && item.updatedAt && item.updatedAt <= item.dueDate) {
          completedOnTime++;
        }
        if (item.createdAt && item.updatedAt) {
          totalResolutionMs += item.updatedAt.getTime() - item.createdAt.getTime();
        }
      } else if (item.status === WorkItemStatus.pending || item.status === WorkItemStatus.in_progress) {
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
  async processSlaBreaches(tenantId?: string): Promise<{
    processed: number;
    escalated: number;
    details: Array<{
      workItemId: string;
      workItemType: string;
      overdueHours: number;
      action: string;
    }>;
  }> {
    const { breached } = await this.checkSlaBreaches(tenantId);
    const now = new Date();

    let processed = 0;
    let escalated = 0;
    const details: Array<{
      workItemId: string;
      workItemType: string;
      overdueHours: number;
      action: string;
    }> = [];

    if (breached.length === 0) {
      return { processed, escalated, details };
    }

    await this.dataSource.transaction(async (manager) => {
      const workItemRepoTx = manager.getRepository(WorkItem);
      const outboxPublisher = new OutboxPublisher(manager);

      for (const item of breached) {
        if (!item.dueDate) continue;

        const overdueMs = now.getTime() - item.dueDate.getTime();
        const overdueHours = Math.round(overdueMs / (1000 * 60 * 60) * 100) / 100;

        let action = 'notified';

        // Publish SLA breach event for every overdue work item
        const correlationId = uuidv4();
        await outboxPublisher.publish({
          topic: 'insurance.sla.breached',
          eventType: 'insurance.sla.breached',
          eventVersion: 1,
          correlationId,
          tenantId: item.tenantId,
          subject: {
            sagaId: item.sagaId,
            workItemId: item.workItemId,
            workItemType: item.workItemType || 'unknown',
          },
          payload: {
            sagaId: item.sagaId,
            workItemId: item.workItemId,
            workItemType: item.workItemType,
            stepName: item.stepName,
            overdueHours,
            dueDate: item.dueDate.toISOString(),
            tenantId: item.tenantId,
          },
        });

        // Escalate if severely overdue (> 48 hours)
        if (overdueHours > 48) {
          action = 'escalated';
          escalated++;

          // Update work item to mark as escalated
          item.decisionNotes = item.decisionNotes
            ? `${item.decisionNotes}\n[SLA ESCALATED] Overdue by ${overdueHours}h at ${now.toISOString()}`
            : `[SLA ESCALATED] Overdue by ${overdueHours}h at ${now.toISOString()}`;
          item.status = WorkItemStatus.escalated;
          item.updatedAt = now;
          await workItemRepoTx.save(item);

          // Create an escalation work item linked to the same saga
          const escalationItem = workItemRepoTx.create({
            workItemId: uuidv4(),
            tenantId: item.tenantId,
            sagaId: item.sagaId,
            stepName: `${item.stepName}_SLA_ESCALATION`,
            workItemType: 'sla_escalation',
            status: WorkItemStatus.pending,
            claimId: item.claimId,
            policyId: item.policyId,
            priority: WorkItemPriority.critical,
            context: {
              originalWorkItemId: item.workItemId,
              originalStepName: item.stepName,
              overdueHours,
            },
          });
          await workItemRepoTx.save(escalationItem);

          await outboxPublisher.publish({
            topic: 'insurance.sla.escalated',
            eventType: 'insurance.sla.escalated',
            eventVersion: 1,
            correlationId,
            tenantId: item.tenantId,
            subject: {
              sagaId: item.sagaId,
              workItemId: item.workItemId,
              escalationWorkItemId: escalationItem.workItemId,
            },
            payload: {
              sagaId: item.sagaId,
              workItemId: item.workItemId,
              escalationWorkItemId: escalationItem.workItemId,
              stepName: item.stepName,
              overdueHours,
              tenantId: item.tenantId,
            },
          });
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
    });

    return { processed, escalated, details };
  }
}
