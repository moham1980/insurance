import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};

    try {
      await this.dataSource.query('SELECT 1');
      components.db = 'ok';
    } catch {
      components.db = 'error';
      return {
        status: 'degraded',
        service: 'product-service',
        timestamp: new Date().toISOString(),
        components,
      };
    }

    try {
      const pendingResult = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM outbox_events WHERE status = 'pending'`
      );
      const pendingCount = pendingResult?.[0]?.cnt || 0;
      components.outbox = pendingCount === 0 ? 'ok' : 'backlog';
      if (pendingCount > 100) {
        return {
          status: 'degraded',
          service: 'product-service',
          timestamp: new Date().toISOString(),
          components,
          outboxPending: pendingCount,
        };
      }
    } catch {
      components.outbox = 'unknown';
    }

    return {
      status: 'ok',
      service: 'product-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components,
    };
  }
}
