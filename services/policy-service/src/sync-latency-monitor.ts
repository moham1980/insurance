import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyProjection } from './entities/PolicyProjection';

export interface SyncLatencyMetric {
  tenantId: string;
  totalProjections: number;
  staleCount: number;
  maxLagSeconds: number;
  avgLagSeconds: number;
  measuredAt: Date;
}

@Injectable()
export class SyncLatencyMonitor implements OnModuleInit {
  private readonly logger = new Logger(SyncLatencyMonitor.name);
  private readonly STALE_THRESHOLD_SECONDS = 60;
  private metricsCache = new Map<string, SyncLatencyMetric>();

  constructor(
    @InjectRepository(PolicyProjection)
    private readonly projectionRepo: Repository<PolicyProjection>,
  ) {}

  onModuleInit(): void {
    setInterval(() => this.measureSyncLatency(), 60 * 1000);
  }

  async measureSyncLatency(): Promise<void> {
    this.logger.debug('Measuring projection sync latency...');

    const projections = await this.projectionRepo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: 'active' })
      .orderBy('p.updatedAt', 'DESC')
      .limit(1000)
      .getMany();

    const byTenant = new Map<string, PolicyProjection[]>();
    for (const p of projections) {
      const arr = byTenant.get(p.tenantId) || [];
      arr.push(p);
      byTenant.set(p.tenantId, arr);
    }

    for (const [tenantId, tenantProjections] of byTenant) {
      const now = Date.now();
      const lags = tenantProjections.map(p => {
        const receivedAt = new Date(p.receivedAt).getTime();
        const updatedAt = new Date(p.updatedAt).getTime();
        return Math.max(0, (updatedAt - receivedAt) / 1000);
      });

      const staleCount = tenantProjections.filter(p => {
        const ageSeconds = (now - new Date(p.updatedAt).getTime()) / 1000;
        return ageSeconds > this.STALE_THRESHOLD_SECONDS;
      }).length;

      const maxLag = lags.length > 0 ? Math.max(...lags) : 0;
      const avgLag = lags.length > 0 ? lags.reduce((a, b) => a + b, 0) / lags.length : 0;

      const metric: SyncLatencyMetric = {
        tenantId,
        totalProjections: tenantProjections.length,
        staleCount,
        maxLagSeconds: Math.round(maxLag),
        avgLagSeconds: Math.round(avgLag),
        measuredAt: new Date(),
      };

      this.metricsCache.set(tenantId, metric);

      if (staleCount > 0) {
        this.logger.warn(
          `Tenant ${tenantId}: ${staleCount}/${tenantProjections.length} projections stale (threshold: ${this.STALE_THRESHOLD_SECONDS}s)`,
        );
      }
    }
  }

  getMetricsForTenant(tenantId: string): SyncLatencyMetric | undefined {
    return this.metricsCache.get(tenantId);
  }

  getAllMetrics(): SyncLatencyMetric[] {
    return Array.from(this.metricsCache.values());
  }
}
