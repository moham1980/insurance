import express, { Application, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { Logger, createLogger } from '../observability';
import { OutboxPublisher } from '../events';
import { KafkaProducer } from '../messaging';

export interface ServiceConfig {
  name: string;
  port: number;
  dbConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  kafkaConfig?: {
    brokers: string[];
  };
}

export abstract class BaseService {
  protected app: Application;
  protected dataSource: DataSource;
  protected logger: Logger;
  protected outboxPublisher: OutboxPublisher;
  protected kafkaProducer?: KafkaProducer;
  protected config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.app = express();
    this.logger = createLogger({ serviceName: config.name, prettyPrint: process.env.NODE_ENV !== 'production' });
    
    // Setup middleware
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    
    // Correlation ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string || this.generateCorrelationId();
      (req as any).correlationId = correlationId;
      res.setHeader('X-Correlation-Id', correlationId);
      next();
    });

    // Logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.info(`${req.method} ${req.path}`, {
        correlationId: (req as any).correlationId,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract setupRoutes(): void;

  async initialize(): Promise<void> {
    try {
      // Initialize database
      const { createDataSource } = await import('../database');
      this.dataSource = createDataSource({
        ...this.config.dbConfig,
        entities: this.getEntities(),
        synchronize: process.env.NODE_ENV === 'development',
      });
      
      await this.dataSource.initialize();
      this.logger.info('Database connected');

      // Initialize outbox publisher
      this.outboxPublisher = new OutboxPublisher(this.dataSource);

      // Initialize Kafka producer if configured
      if (this.config.kafkaConfig) {
        this.kafkaProducer = new KafkaProducer(
          {
            clientId: this.config.name,
            brokers: this.config.kafkaConfig.brokers,
          },
          this.logger
        );
        await this.kafkaProducer.connect();
      }

      // Setup routes
      this.setupRoutes();

      // Health check endpoint
      this.app.get('/health', (req: Request, res: Response) => {
        res.json({ status: 'ok', service: this.config.name });
      });

      this.logger.info('Service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize service', error as Error);
      throw error;
    }
  }

  abstract getEntities(): any[];

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        this.logger.info(`Service ${this.config.name} listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    await this.dataSource.destroy();
    await this.kafkaProducer?.disconnect();
    this.logger.info('Service stopped');
  }
}
