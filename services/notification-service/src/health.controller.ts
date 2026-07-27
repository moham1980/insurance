import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('/health')
  async health() {
    const components: Record<string, string> = {};
    let overall = 'ok';

    // Check DB connectivity
    try {
      await this.dataSource.query('SELECT 1');
      components.db = 'ok';
    } catch (err: any) {
      components.db = 'error';
      overall = 'degraded';
    }

    // Check Redis connectivity
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
    const redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: redisDb,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      await redis.ping();
      components.redis = 'ok';
    } catch (err: any) {
      components.redis = 'error';
      overall = 'degraded';
    } finally {
      try { await redis.quit(); } catch { /* ignore */ }
    }

    // Check Kafka availability (if configured)
    const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',').filter(Boolean) || [];
    if (kafkaBrokers.length > 0) {
      if (process.env.KAFKA_ENABLED !== 'false') {
        components.kafka = 'configured';
      } else {
        components.kafka = 'disabled';
      }
    } else {
      components.kafka = 'not_configured';
    }

    const result: any = {
      status: overall,
      service: 'notification-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components,
    };

    if (overall === 'degraded') {
      const dbError = components.db === 'error' ? 'DB connection failed' : undefined;
      const redisError = components.redis === 'error' ? 'Redis connection failed' : undefined;
      result.error = [dbError, redisError].filter(Boolean).join('; ') || 'Degraded';
    }

    return result;
  }
}
