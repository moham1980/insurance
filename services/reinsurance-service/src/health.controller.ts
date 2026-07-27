import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Kafka } from 'kafkajs';

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
        service: 'reinsurance-service',
        timestamp: new Date().toISOString(),
        components,
        error: err instanceof Error ? err.message : 'DB connection failed',
      };
    }

    const kafkaBrokers = process.env.KAFKA_BROKERS;
    if (kafkaBrokers && kafkaBrokers.trim().length > 0) {
      try {
        const kafka = new Kafka({
          clientId: 'reinsurance-health-check',
          brokers: kafkaBrokers.split(',').map((x) => x.trim()).filter(Boolean),
        });
        const admin = kafka.admin();
        await admin.connect();
        await admin.describeCluster();
        await admin.disconnect();
        components.kafka = 'ok';
      } catch (err) {
        components.kafka = 'error';
      }
    } else {
      components.kafka = 'not_configured';
    }

    return {
      status: 'ok',
      service: 'reinsurance-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components,
    };
  }
}
