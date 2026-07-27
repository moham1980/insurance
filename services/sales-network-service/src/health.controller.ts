import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};
    
    // Check DB connectivity
    try {
      await this.dataSource.query('SELECT 1');
      components.db = 'ok';
    } catch (err) {
      components.db = 'error';
      return { 
        status: 'degraded', 
        service: 'sales-network-service', 
        timestamp: new Date().toISOString(),
        components,
        error: err instanceof Error ? err.message : 'DB connection failed'
      };
    }

    return { 
      status: 'ok', 
      service: 'sales-network-service', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components
    };
  }
}
