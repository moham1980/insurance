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
    } catch (err) {
      components.db = 'error';
      return {
        status: 'degraded',
        service: 'policy-service',
        timestamp: new Date().toISOString(),
        components,
      };
    }

    const paymentsUrl = process.env.PAYMENTS_SERVICE_URL;
    if (paymentsUrl) {
      try {
        const res = await fetch(`${paymentsUrl}/health`, { method: 'GET' });
        components.payments = res.ok ? 'ok' : 'degraded';
      } catch {
        components.payments = 'unreachable';
      }
    } else {
      components.payments = 'not_configured';
    }

    const regulatoryUrl = process.env.REGULATORY_GATEWAY_URL || process.env.REGULATORY_URL;
    if (regulatoryUrl) {
      try {
        const res = await fetch(`${regulatoryUrl}/health`, { method: 'GET' });
        components.regulatory = res.ok ? 'ok' : 'degraded';
      } catch {
        components.regulatory = 'unreachable';
      }
    } else {
      components.regulatory = 'not_configured';
    }

    const kafkaBrokers = process.env.KAFKA_BROKERS;
    components.kafka = kafkaBrokers ? 'configured' : 'not_configured';

    const overall = Object.values(components).every((v) => v === 'ok' || v === 'configured' || v === 'not_configured')
      ? 'ok'
      : 'degraded';

    return {
      status: overall,
      service: 'policy-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components,
    };
  }
}
