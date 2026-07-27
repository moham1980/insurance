import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};
    const timestamp = new Date().toISOString();

    try {
      await this.dataSource.query('SELECT current_schema() as schema');
      components.db = 'ok';
      components.schema = process.env.DB_SCHEMA || 'claims';
    } catch (err) {
      components.db = 'error';
      return {
        status: 'degraded',
        service: 'claims-service',
        timestamp,
        uptime: process.uptime(),
        components,
        error: 'DB connection failed',
      };
    }

    return {
      status: 'ok',
      service: 'claims-service',
      timestamp,
      uptime: process.uptime(),
      components,
    };
  }
}
