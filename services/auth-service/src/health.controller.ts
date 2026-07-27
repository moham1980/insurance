import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
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
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        components,
        error: err instanceof Error ? err.message : 'DB connection failed',
      };
    }

    // Check required secrets are configured (do not validate values, only presence)
    components.jwt_secret = process.env.JWT_SECRET ? 'ok' : 'missing';
    components.service_token_issuer_key = process.env.SERVICE_TOKEN_ISSUER_KEY ? 'ok' : 'missing';
    components.pii_encryption_key = process.env.PII_ENCRYPTION_KEY ? 'ok' : 'missing';

    // Check Redis connectivity when configured
    const useRedis = process.env.SESSION_STORE === 'redis';
    let redisHealthy = false;
    if (useRedis) {
      let redis: Redis | null = null;
      try {
        const redisUrl = process.env.REDIS_URL ||
          `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
        redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableReadyCheck: false });
        await redis.ping();
        components.redis = 'ok';
        redisHealthy = true;
      } catch (err) {
        components.redis = 'error';
      } finally {
        if (redis) await redis.quit();
      }
    } else {
      components.redis = 'not_configured';
    }

    // Session store readiness (Redis if configured, otherwise DB-backed)
    components.session_store = useRedis ? (redisHealthy ? 'ok' : 'error') : 'db_managed';

    // Check migration status
    try {
      const hasPending = await this.dataSource.showMigrations();
      components.migrations = hasPending ? 'pending' : 'ok';
    } catch (err) {
      components.migrations = 'error';
    }

    // Check Kafka connectivity when configured
    const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',').filter(Boolean) || [];
    if (kafkaBrokers.length > 0) {
      let admin: any = null;
      try {
        const kafka = new Kafka({
          clientId: 'auth-health',
          brokers: kafkaBrokers,
          connectionTimeout: 3000,
          requestTimeout: 3000,
        });
        admin = kafka.admin();
        await admin.connect();
        await admin.listTopics();
        components.kafka = 'ok';
      } catch (err) {
        components.kafka = 'error';
      } finally {
        if (admin) await admin.disconnect().catch(() => {});
      }
    } else {
      components.kafka = 'not_configured';
    }

    const hasError = Object.values(components).some((v) => v === 'missing' || v === 'error' || v === 'pending');

    return {
      status: hasError ? 'degraded' : 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components,
    };
  }
}
