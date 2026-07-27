import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BulkheadConfig {
  maxConcurrent: number;
  maxWaitTime: number; // milliseconds
  timeout: number; // milliseconds
}

export interface BulkheadStats {
  serviceName: string;
  activeConnections: number;
  waitingConnections: number;
  rejectedConnections: number;
  totalConnections: number;
}

export class BulkheadRejectionError extends Error {
  constructor(public serviceName: string, public reason: string) {
    super(`Bulkhead rejection for service ${serviceName}: ${reason}`);
    this.name = 'BulkheadRejectionError';
  }
}

@Injectable()
export class BulkheadService implements OnModuleDestroy {
  private readonly logger = new Logger(BulkheadService.name);
  private readonly bulkheads: Map<string, BulkheadConfig> = new Map();
  private readonly activeConnections: Map<string, Set<string>> = new Map();
  private readonly waitingQueue: Map<string, Array<{ resolve: () => void; reject: (error: Error) => void; timestamp: number }>> = new Map();
  private readonly stats: Map<string, { rejected: number; total: number }> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultBulkheads();
    this.cleanupInterval = setInterval(() => this.cleanupExpiredWaits(), 5000);
  }

  private initializeDefaultBulkheads() {
    // Default bulkhead configurations for different services
    this.registerBulkhead('policy-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_POLICY_MAX_CONCURRENT') || '50'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_POLICY_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_POLICY_TIMEOUT') || '30000'),
    });

    this.registerBulkhead('claims-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_CLAIMS_MAX_CONCURRENT') || '50'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_CLAIMS_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_CLAIMS_TIMEOUT') || '30000'),
    });

    this.registerBulkhead('fraud-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_FRAUD_MAX_CONCURRENT') || '30'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_FRAUD_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_FRAUD_TIMEOUT') || '30000'),
    });

    this.registerBulkhead('underwriting-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_UNDERWRITING_MAX_CONCURRENT') || '20'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_UNDERWRITING_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_UNDERWRITING_TIMEOUT') || '60000'),
    });

    this.registerBulkhead('payment-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_PAYMENT_MAX_CONCURRENT') || '25'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_PAYMENT_MAX_WAIT') || '3000'),
      timeout: parseInt(this.configService.get('BULKHEAD_PAYMENT_TIMEOUT') || '30000'),
    });

    this.registerBulkhead('sanhab-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_SANHAB_MAX_CONCURRENT') || '10'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_SANHAB_MAX_WAIT') || '3000'),
      timeout: parseInt(this.configService.get('BULKHEAD_SANHAB_TIMEOUT') || '60000'),
    });

    this.registerBulkhead('sms-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_SMS_MAX_CONCURRENT') || '20'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_SMS_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_SMS_TIMEOUT') || '30000'),
    });

    this.registerBulkhead('email-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_EMAIL_MAX_CONCURRENT') || '30'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_EMAIL_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_EMAIL_TIMEOUT') || '30000'),
    });

    this.registerBulkhead('document-ai-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_DOCUMENT_AI_MAX_CONCURRENT') || '15'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_DOCUMENT_AI_MAX_WAIT') || '10000'),
      timeout: parseInt(this.configService.get('BULKHEAD_DOCUMENT_AI_TIMEOUT') || '120000'),
    });

    this.registerBulkhead('copilot-service', {
      maxConcurrent: parseInt(this.configService.get('BULKHEAD_COPILOT_MAX_CONCURRENT') || '20'),
      maxWaitTime: parseInt(this.configService.get('BULKHEAD_COPILOT_MAX_WAIT') || '5000'),
      timeout: parseInt(this.configService.get('BULKHEAD_COPILOT_TIMEOUT') || '60000'),
    });

    this.logger.log('Default bulkheads initialized');
  }

  registerBulkhead(serviceName: string, config: BulkheadConfig) {
    this.bulkheads.set(serviceName, config);
    this.activeConnections.set(serviceName, new Set());
    this.waitingQueue.set(serviceName, []);
    this.stats.set(serviceName, { rejected: 0, total: 0 });
    this.logger.log(`Bulkhead registered for service: ${serviceName} (maxConcurrent: ${config.maxConcurrent})`);
  }

  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    operationId?: string
  ): Promise<T> {
    const config = this.bulkheads.get(serviceName);
    if (!config) {
      this.logger.warn(`No bulkhead configuration for service: ${serviceName}, executing without bulkhead`);
      return operation();
    }

    const id = operationId || `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const activeSet = this.activeConnections.get(serviceName)!;
    const queue = this.waitingQueue.get(serviceName)!;
    const stats = this.stats.get(serviceName)!;

    stats.total++;

    // Check if we can acquire the slot immediately
    if (activeSet.size < config.maxConcurrent) {
      return this.executeWithSlot(serviceName, id, operation, config, activeSet, stats);
    }

    // If at capacity, check if we can wait
    if (queue.length >= config.maxConcurrent * 2) {
      stats.rejected++;
      throw new BulkheadRejectionError(
        serviceName,
        'Bulkhead queue full'
      );
    }

    // Add to waiting queue
    this.logger.debug(`Adding to bulkhead queue for ${serviceName}: ${id}`);
    
    return new Promise((resolve, reject) => {
      const waitStart = Date.now();
      
      const timeoutId = setTimeout(() => {
        const index = queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          queue.splice(index, 1);
        }
        stats.rejected++;
        reject(new BulkheadRejectionError(
          serviceName,
          `Wait time exceeded ${config.maxWaitTime}ms`
        ));
      }, config.maxWaitTime);

      queue.push({
        resolve: async () => {
          clearTimeout(timeoutId);
          try {
            const result = await this.executeWithSlot(serviceName, id, operation, config, activeSet, stats);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        reject,
        timestamp: waitStart,
      });

      // Try to acquire slot
      this.processQueue(serviceName);
    });
  }

  private async executeWithSlot<T>(
    serviceName: string,
    id: string,
    operation: () => Promise<T>,
    config: BulkheadConfig,
    activeSet: Set<string>,
    stats: { rejected: number; total: number }
  ): Promise<T> {
    activeSet.add(id);
    this.logger.debug(`Acquired bulkhead slot for ${serviceName}: ${id} (active: ${activeSet.size}/${config.maxConcurrent})`);

    try {
      // Execute with timeout
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new BulkheadRejectionError(serviceName, `Operation timeout after ${config.timeout}ms`)), config.timeout)
        ),
      ]);
    } finally {
      activeSet.delete(id);
      this.logger.debug(`Released bulkhead slot for ${serviceName}: ${id} (active: ${activeSet.size}/${config.maxConcurrent})`);
      this.processQueue(serviceName);
    }
  }

  private processQueue(serviceName: string) {
    const config = this.bulkheads.get(serviceName);
    const activeSet = this.activeConnections.get(serviceName);
    const queue = this.waitingQueue.get(serviceName);

    if (!config || !activeSet || !queue) return;

    while (activeSet.size < config.maxConcurrent && queue.length > 0) {
      const next = queue.shift();
      if (next) {
        next.resolve();
      }
    }
  }

  private cleanupExpiredWaits() {
    for (const [serviceName, queue] of this.waitingQueue.entries()) {
      const config = this.bulkheads.get(serviceName);
      if (!config) continue;

      const now = Date.now();
      const validItems: Array<{ resolve: () => void; reject: (error: Error) => void; timestamp: number }> = [];

      for (const item of queue) {
        if (now - item.timestamp < config.maxWaitTime) {
          validItems.push(item);
        } else {
          item.reject(new BulkheadRejectionError(serviceName, 'Wait time expired'));
          const stats = this.stats.get(serviceName);
          if (stats) stats.rejected++;
        }
      }

      this.waitingQueue.set(serviceName, validItems);
    }
  }

  getStats(serviceName?: string): BulkheadStats | BulkheadStats[] {
    if (serviceName) {
      const config = this.bulkheads.get(serviceName);
      const activeSet = this.activeConnections.get(serviceName);
      const queue = this.waitingQueue.get(serviceName);
      const stats = this.stats.get(serviceName);

      if (!config || !activeSet || !stats) {
        throw new Error(`No bulkhead found for service: ${serviceName}`);
      }

      return {
        serviceName,
        activeConnections: activeSet.size,
        waitingConnections: queue?.length || 0,
        rejectedConnections: stats.rejected,
        totalConnections: stats.total,
      };
    }

    // Return stats for all services
    const allStats: BulkheadStats[] = [];
    for (const [name] of this.bulkheads) {
      const config = this.bulkheads.get(name);
      const activeSet = this.activeConnections.get(name);
      const queue = this.waitingQueue.get(name);
      const stats = this.stats.get(name);

      if (config && activeSet && stats) {
        allStats.push({
          serviceName: name,
          activeConnections: activeSet.size,
          waitingConnections: queue?.length || 0,
          rejectedConnections: stats.rejected,
          totalConnections: stats.total,
        });
      }
    }

    return allStats;
  }

  getConfig(serviceName: string): BulkheadConfig | undefined {
    return this.bulkheads.get(serviceName);
  }

  updateConfig(serviceName: string, config: Partial<BulkheadConfig>): void {
    const existing = this.bulkheads.get(serviceName);
    if (existing) {
      this.bulkheads.set(serviceName, { ...existing, ...config });
      this.logger.log(`Updated bulkhead config for ${serviceName}`);
    }
  }

  resetStats(serviceName?: string): void {
    if (serviceName) {
      const stats = this.stats.get(serviceName);
      if (stats) {
        stats.rejected = 0;
        stats.total = 0;
      }
    } else {
      for (const stats of this.stats.values()) {
        stats.rejected = 0;
        stats.total = 0;
      }
    }
  }

  async onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    
    // Reject all waiting connections
    for (const [serviceName, queue] of this.waitingQueue.entries()) {
      for (const item of queue) {
        item.reject(new BulkheadRejectionError(serviceName, 'Service shutting down'));
      }
    }
  }

  // Decorator for automatic bulkhead wrapping
  static createDecorator(serviceName: string, operationIdGenerator?: (...args: any[]) => string) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const bulkheadService: BulkheadService = this.bulkheadService;
        if (!bulkheadService) {
          return originalMethod.apply(this, args);
        }

        const operationId = operationIdGenerator ? operationIdGenerator(...args) : undefined;
        return bulkheadService.execute(
          serviceName,
          () => originalMethod.apply(this, args),
          operationId
        );
      };

      return descriptor;
    };
  }
}
