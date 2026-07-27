import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', service: 'knowledge-layer-service', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'error', service: 'knowledge-layer-service', timestamp: new Date().toISOString(), message: error instanceof Error ? error.message : 'DB error' };
    }
  }
}
