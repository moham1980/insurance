import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Kafka } from 'kafkajs';

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
        service: 'orchestrator-service',
        timestamp: new Date().toISOString(),
        components,
        error: err instanceof Error ? err.message : 'DB connection failed'
      };
    }

    // Check Kafka connectivity
    const kafkaBrokers = process.env.KAFKA_BROKERS;
    if (typeof kafkaBrokers === 'string' && kafkaBrokers.trim().length > 0) {
      try {
        const brokers = kafkaBrokers.split(',').map((x) => x.trim()).filter(Boolean);
        const kafka = new Kafka({
          clientId: process.env.KAFKA_CLIENT_ID || 'orchestrator-service-health',
          brokers,
          connectionTimeout: 5000,
          requestTimeout: 5000,
        });
        const admin = kafka.admin();
        await admin.connect();
        await admin.listTopics();
        await admin.disconnect();
        components.kafka = 'ok';
      } catch (err) {
        components.kafka = 'error';
        return {
          status: 'degraded',
          service: 'orchestrator-service',
          timestamp: new Date().toISOString(),
          components,
          error: err instanceof Error ? err.message : 'Kafka connection failed'
        };
      }
    } else {
      components.kafka = 'disabled';
    }

    return {
      status: 'ok',
      service: 'orchestrator-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components
    };
  }
}
