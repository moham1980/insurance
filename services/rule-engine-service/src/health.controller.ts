import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { Kafka } from 'kafkajs';
import { OutboxEvent } from '@insurance/shared';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const response: any = {
      service: 'rule-engine-service',
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, any>,
    };
    let status: 'ok' | 'degraded' | 'error' = 'ok';

    try {
      await this.dataSource.query('SELECT 1');
      response.checks.database = { status: 'ok' };
    } catch (error) {
      status = 'error';
      response.checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'DB error',
      };
    }

    try {
      const outboxRepo = this.dataSource.getRepository(OutboxEvent);
      const since = new Date(Date.now() - 5 * 60 * 1000);
      const [pending, failed] = await Promise.all([
        outboxRepo.count({ where: { status: 'pending', occurredAt: MoreThanOrEqual(since) } }),
        outboxRepo.count({ where: { status: 'failed', occurredAt: MoreThanOrEqual(since) } }),
      ]);
      response.checks.outbox = { status: 'ok', pending, failed };
      if (failed > 0) status = status === 'error' ? 'error' : 'degraded';
    } catch (error) {
      status = status === 'error' ? 'error' : 'degraded';
      response.checks.outbox = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Outbox check error',
      };
    }

    const brokers = process.env.KAFKA_BROKERS?.split(',').filter(Boolean) || [];
    if (brokers.length > 0) {
      try {
        const kafka = new Kafka({
          clientId: 'rule-engine-health',
          brokers,
          connectionTimeout: 3000,
        });
        const admin = kafka.admin();
        await admin.connect();
        await admin.listTopics();
        await admin.disconnect();
        response.checks.kafka = { status: 'ok' };
      } catch (error) {
        status = status === 'error' ? 'error' : 'degraded';
        response.checks.kafka = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Kafka check error',
        };
      }
    } else {
      response.checks.kafka = { status: 'ok', note: 'No KAFKA_BROKERS configured' };
    }

    response.status = status;
    return response;
  }
}
