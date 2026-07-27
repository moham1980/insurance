import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};
    const timestamp = new Date().toISOString();
    let status: 'ok' | 'degraded' = 'ok';

    // Check DB connectivity
    try {
      await this.dataSource.query('SELECT 1');
      components.db = 'ok';
    } catch (err) {
      components.db = 'error';
      status = 'degraded';
    }

    // Check ML model server
    const mlUrl = process.env.ML_MODEL_SERVER_URL;
    if (mlUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${mlUrl}/health`, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);
        components.ml = res.ok ? 'ok' : `error:${res.status}`;
        if (!res.ok) status = 'degraded';
      } catch (err) {
        components.ml = 'error';
        status = 'degraded';
      }
    } else {
      components.ml = 'not_configured';
    }

    // Check Kafka configuration
    const kafkaBrokers = process.env.KAFKA_BROKERS;
    if (kafkaBrokers) {
      components.kafka = 'configured';
    } else {
      components.kafka = 'not_configured';
    }

    const response: any = {
      status,
      service: 'fraud-service',
      timestamp,
      uptime: process.uptime(),
      components,
    };

    if (status === 'degraded') {
      response.error = 'One or more components are unhealthy';
    }

    return response;
  }
}
