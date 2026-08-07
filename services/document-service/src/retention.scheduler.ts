import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DocumentsService } from './documents.service';

/**
 * P2 #7: Scheduled task that applies the retention policy daily.
 *
 * Runs applyRetentionPolicy() once per day (configurable via
 * RETENTION_CRON_INTERVAL_MS env, default 24h). The first run is delayed
 * by the interval to avoid running immediately on startup.
 */
@Injectable()
export class RetentionScheduler implements OnModuleInit {
  private readonly logger = new Logger(RetentionScheduler.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  private readonly intervalMs = parseInt(process.env.RETENTION_CRON_INTERVAL_MS || '86400000', 10);

  constructor(private readonly documentsService: DocumentsService) {}

  onModuleInit(): void {
    if (process.env.RETENTION_CRON_ENABLED === 'false') {
      this.logger.log('Retention scheduler disabled via RETENTION_CRON_ENABLED=false');
      return;
    }
    this.logger.log(`Retention scheduler started (interval: ${this.intervalMs}ms)`);
    this.intervalHandle = setInterval(() => {
      this.runRetention().catch((err) => {
        this.logger.error('Retention policy run failed', err as Error);
      });
    }, this.intervalMs);
    // Don't keep the process alive solely for this timer
    if (this.intervalHandle.unref) this.intervalHandle.unref();
  }

  private async runRetention(): Promise<void> {
    const result = await this.documentsService.applyRetentionPolicy();
    if (result.deletedCount > 0) {
      this.logger.log(`Scheduled retention run: soft-deleted ${result.deletedCount} document(s)`);
    }
  }
}
