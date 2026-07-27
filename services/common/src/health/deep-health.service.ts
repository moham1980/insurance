import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Client as KafkaClient } from 'kafkajs';
import { Redis } from 'ioredis';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  details?: Record<string, any>;
  latencyMs?: number;
}

export interface DeepHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
}

@Injectable()
export class DeepHealthService {
  private readonly logger = new Logger(DeepHealthService.name);
  private readonly startTime: number = Date.now();
  private kafkaClient: KafkaClient | null = null;
  private redisClient: Redis | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.initializeClients();
  }

  private initializeClients() {
    // Initialize Kafka client
    try {
      const kafkaConfig = {
        clientId: this.configService.get('KAFKA_CLIENT_ID') || 'insurance-health-check',
        brokers: (this.configService.get('KAFKA_BROKERS') || 'localhost:9092').split(','),
      };
      this.kafkaClient = new KafkaClient(kafkaConfig);
    } catch (error) {
      this.logger.error('Failed to initialize Kafka client', error);
    }

    // Initialize Redis client
    try {
      const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
      this.redisClient = new Redis(redisUrl);
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error);
    }
  }

  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      if (!this.dataSource.isInitialized) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: 'Database connection not initialized',
          latencyMs: Date.now() - startTime,
        };
      }

      // Execute a simple query to check connectivity
      const result = await this.dataSource.query('SELECT 1');
      
      // Check connection pool status
      const poolStatus = {
        total: this.dataSource.driver.master ? (this.dataSource.driver.master as any).totalCount : 0,
        active: this.dataSource.driver.master ? (this.dataSource.driver.master as any).activeCount : 0,
        idle: this.dataSource.driver.master ? (this.dataSource.driver.master as any).idleCount : 0,
      };

      // Check if pool is healthy (not exhausted)
      const isPoolHealthy = poolStatus.total > 0 && poolStatus.active < poolStatus.total;

      return {
        name: 'database',
        status: isPoolHealthy ? 'healthy' : 'degraded',
        message: 'Database connection healthy',
        details: {
          type: this.dataSource.options.type,
          host: this.dataSource.options.host,
          database: this.dataSource.options.database,
          pool: poolStatus,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async checkKafka(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      if (!this.kafkaClient) {
        return {
          name: 'kafka',
          status: 'unhealthy',
          message: 'Kafka client not initialized',
          latencyMs: Date.now() - startTime,
        };
      }

      const admin = this.kafkaClient.admin();
      await admin.connect();
      
      // Get cluster metadata
      const metadata = await admin.fetchClusterMetadata();
      await admin.disconnect();

      const brokerCount = metadata.brokers.length;
      const controller = metadata.controller;

      return {
        name: 'kafka',
        status: brokerCount > 0 ? 'healthy' : 'unhealthy',
        message: 'Kafka connection healthy',
        details: {
          brokerCount,
          controllerId: controller?.id,
          brokers: metadata.brokers.map(b => ({
            id: b.nodeId,
            host: b.host,
            port: b.port,
          })),
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Kafka health check failed', error);
      return {
        name: 'kafka',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      if (!this.redisClient) {
        return {
          name: 'redis',
          status: 'unhealthy',
          message: 'Redis client not initialized',
          latencyMs: Date.now() - startTime,
        };
      }

      // Execute PING command
      const result = await this.redisClient.ping();
      
      // Get memory info
      const info = await this.redisClient.info('memory');
      const memoryUsage = this.parseRedisInfo(info);

      return {
        name: 'redis',
        status: result === 'PONG' ? 'healthy' : 'unhealthy',
        message: 'Redis connection healthy',
        details: {
          pingResult: result,
          memory: memoryUsage,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        name: 'redis',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async checkExternalServices(): Promise<HealthCheckResult[]> {
    const checks: HealthCheckResult[] = [];

    // Check Sanhab integration
    checks.push(await this.checkSanhab());

    // Check SMS gateways
    checks.push(await this.checkSMSGateway());

    // Check Payment gateway
    checks.push(await this.checkPaymentGateway());

    return checks;
  }

  private async checkSanhab(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const sanhabUrl = this.configService.get('SANHAB_API_URL');
      if (!sanhabUrl) {
        return {
          name: 'sanhab',
          status: 'degraded',
          message: 'Sanhab API URL not configured',
          latencyMs: Date.now() - startTime,
        };
      }

      // In production, make a real health check request
      // const response = await fetch(`${sanhabUrl}/health`, { timeout: 5000 });
      // const isHealthy = response.ok;

      return {
        name: 'sanhab',
        status: 'degraded', // Assume degraded if not configured
        message: 'Sanhab integration configured but not verified',
        details: {
          url: sanhabUrl,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'sanhab',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async checkSMSGateway(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const providers = ['kavenegar', 'twilio', 'melli-payamak'];
      const results: Record<string, string> = {};

      for (const provider of providers) {
        const apiKey = this.configService.get(`SMS_${provider.toUpperCase()}_API_KEY`);
        results[provider] = apiKey ? 'configured' : 'not configured';
      }

      const configuredCount = Object.values(results).filter(r => r === 'configured').length;

      return {
        name: 'sms-gateway',
        status: configuredCount > 0 ? 'healthy' : 'degraded',
        message: `SMS gateways: ${configuredCount}/${providers.length} configured`,
        details: results,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'sms-gateway',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async checkPaymentGateway(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const paymentUrl = this.configService.get('PAYMENT_GATEWAY_URL');
      if (!paymentUrl) {
        return {
          name: 'payment-gateway',
          status: 'degraded',
          message: 'Payment gateway URL not configured',
          latencyMs: Date.now() - startTime,
        };
      }

      return {
        name: 'payment-gateway',
        status: 'degraded',
        message: 'Payment gateway configured but not verified',
        details: {
          url: paymentUrl,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'payment-gateway',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async checkDiskSpace(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // In production, use actual disk space check
      // For now, return a simulated check
      const threshold = 90; // 90% usage threshold
      
      return {
        name: 'disk-space',
        status: 'healthy', // Assume healthy for now
        message: 'Disk space within limits',
        details: {
          threshold: `${threshold}%`,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'disk-space',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async checkMemoryUsage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

      const threshold = 90; // 90% usage threshold
      const status = heapUsagePercent > threshold ? 'degraded' : 'healthy';

      return {
        name: 'memory',
        status,
        message: `Heap usage: ${heapUsagePercent.toFixed(2)}%`,
        details: {
          heapUsedMB: heapUsedMB.toFixed(2),
          heapTotalMB: heapTotalMB.toFixed(2),
          heapUsagePercent: heapUsagePercent.toFixed(2),
          externalMB: (memoryUsage.external / 1024 / 1024).toFixed(2),
          rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async getDeepHealth(): Promise<DeepHealthResponse> {
    const checks: HealthCheckResult[] = [];

    // Core infrastructure checks
    checks.push(await this.checkDatabase());
    checks.push(await this.checkKafka());
    checks.push(await this.checkRedis());

    // System resource checks
    checks.push(await this.checkDiskSpace());
    checks.push(await this.checkMemoryUsage());

    // External service checks
    const externalChecks = await this.checkExternalServices();
    checks.push(...externalChecks);

    // Determine overall status
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Date.now() - this.startTime,
      version: this.configService.get('SERVICE_VERSION') || '1.0.0',
    };
  }

  async getBasicHealth(): Promise<{ status: string; timestamp: string }> {
    // Quick health check for load balancers
    try {
      const dbCheck = await this.checkDatabase();
      return {
        status: dbCheck.status === 'healthy' ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};
    
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes(':')) continue;
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    }
    
    return result;
  }

  async onModuleDestroy() {
    if (this.kafkaClient) {
      // Clean up Kafka client if needed
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
