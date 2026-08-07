import { Controller, Get, Post, Param, Optional, UseGuards } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AdminGuard } from './admin.guard';
import { resolveTarget, SERVICE_ROUTES } from './gateway.config';
import { createLogger } from '@insurance/shared';
import net from 'node:net';

const logger = createLogger({
  serviceName: 'api-gateway',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

@Controller()
export class HealthController {
  constructor(
    @Optional() @InjectDataSource() private readonly dataSource: DataSource | null
  ) {}

  @Get(['/health', '/gateway/health'])
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['/health/deep', '/gateway/health/deep'])
  @UseGuards(AdminGuard)
  async deepHealth() {
    const checks: any = {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Database check
    try {
      if (this.dataSource) {
        await this.dataSource.query('SELECT 1');
        checks.checks.database = {
          status: 'ok',
          message: 'Database connection successful',
        };
      } else {
        checks.checks.database = {
          status: 'skipped',
          message: 'No database configured',
        };
      }
    } catch (error) {
      checks.status = 'degraded';
      checks.checks.database = this.sanitizeHealthError(error, 'database');
    }

    // Real Kafka connectivity check (if configured)
    try {
      checks.checks.kafka = await this.checkKafka();
      if (checks.checks.kafka.status === 'error') {
        checks.status = 'degraded';
      }
    } catch (error) {
      checks.status = 'degraded';
      checks.checks.kafka = this.sanitizeHealthError(error, 'kafka');
    }

    // Upstream health checks using the canonical shared route registry.
    for (const route of SERVICE_ROUTES) {
      try {
        const target = resolveTarget(route);
        if (!target) {
          checks.checks[route.name] = {
            status: 'skipped',
            message: 'No upstream configured',
          };
          continue;
        }

        const response = await fetch(`${target}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          checks.checks[route.name] = {
            status: 'ok',
            message: `${route.name} is healthy`,
          };
        } else {
          checks.status = 'degraded';
          checks.checks[route.name] = {
            status: 'degraded',
            message: `${route.name} returned unexpected status`,
          };
        }
      } catch (error) {
        checks.status = 'degraded';
        checks.checks[route.name] = this.sanitizeHealthError(error, route.name);
      }
    }

    return checks;
  }

  @Get('/admin/circuit-breakers')
  @UseGuards(AdminGuard)
  async getCircuitBreakers() {
    const circuitBreakers = (global as any).circuitBreakers as Map<string, any>;
    if (!circuitBreakers) {
      return {
        success: true,
        data: [],
        message: 'No circuit breakers initialized yet',
      };
    }

    const entries = Array.from(circuitBreakers.entries());
    const data = await Promise.all(
      entries.map(async ([serviceName, cb]) => ({
        serviceName,
        state: await cb.getState(),
        failureCount: await cb.getFailureCount(),
      }))
    );

    return {
      success: true,
      data,
    };
  }

  @Post('/admin/circuit-breakers/:serviceName/reset')
  @UseGuards(AdminGuard)
  async resetCircuitBreaker(@Param('serviceName') serviceName: string) {
    const circuitBreakers = (global as any).circuitBreakers as Map<string, any>;
    if (!circuitBreakers) {
      return {
        success: false,
        error: { code: 'NO_CIRCUIT_BREAKERS', message: 'No circuit breakers initialized yet' },
      };
    }

    const cb = circuitBreakers.get(serviceName);
    if (!cb) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Circuit breaker for service ${serviceName} not found` },
      };
    }

    await cb.reset();
    return {
      success: true,
      message: `Circuit breaker for service ${serviceName} has been reset`,
    };
  }

  private async checkKafka(): Promise<{ status: string; message: string }> {
    const brokers = process.env.KAFKA_BROKERS || '';
    if (!brokers.trim()) {
      return { status: 'skipped', message: 'No Kafka brokers configured' };
    }

    const hosts = brokers.split(',').map((h) => h.trim()).filter(Boolean);
    if (hosts.length === 0) {
      return { status: 'skipped', message: 'No Kafka brokers configured' };
    }

    const errors: string[] = [];
    for (const host of hosts) {
      const [hostname, portStr] = host.split(':');
      const port = parseInt(portStr || '9092', 10);
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = new net.Socket();
          const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error(`Connection timeout`));
          }, 5000);

          socket.once('connect', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve();
          });

          socket.once('error', (err: Error) => {
            clearTimeout(timer);
            socket.destroy();
            reject(err);
          });

          socket.connect(port, hostname);
        });
      } catch (error: any) {
        errors.push(`${host}: ${error?.message || 'Connection failed'}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('kafka health check failed', { errors });
      return { status: 'error', message: 'One or more Kafka brokers are unreachable' };
    }

    return { status: 'ok', message: `Connected to ${hosts.length} Kafka broker(s)` };
  }

  private sanitizeHealthError(error: any, component: string): { status: string; message: string } {
    const err = error instanceof Error ? error : new Error(String(error));
    const msg = err.message?.toLowerCase() || '';
    logger.warn(`${component} health check failed`, { message: err.message, name: err.name });

    if (msg.includes('econnrefused') || msg.includes('enotfound') || msg.includes('conn')) {
      return { status: 'error', message: `${component} is unreachable` };
    }
    if (msg.includes('timeout') || err.name === 'AbortError' || msg.includes('timed out')) {
      return { status: 'error', message: `${component} health check timed out` };
    }
    return { status: 'error', message: `${component} health check failed` };
  }
}
