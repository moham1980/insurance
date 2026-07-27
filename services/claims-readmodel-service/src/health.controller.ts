import { Controller, Get, Inject } from '@nestjs/common';
import { ReadModelService } from './readmodel.service';

@Controller()
export class HealthController {
  constructor(@Inject(ReadModelService) private readonly readModelService: ReadModelService) {}

  @Get('/health')
  async health() {
    const metrics = await this.readModelService.getHealthMetrics();

    const status = metrics.db === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      service: 'claims-readmodel-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: {
        db: metrics.db,
        kafka: metrics.kafka,
        dlqCount: metrics.dlqCount,
        lastProcessedAt: metrics.lastProcessedAt ? metrics.lastProcessedAt.toISOString() : null,
      },
    };
  }
}
