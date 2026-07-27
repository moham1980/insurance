import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { AppModule } from './app.module';

@Catch()
class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request: any = ctx.getRequest();
    const reply: any = ctx.getResponse();

    const correlationId =
      request?.correlationId ||
      request?.headers?.['x-correlation-id'] ||
      request?.headers?.['X-Correlation-Id'] ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (reply?.header) {
      reply.header('X-Correlation-Id', correlationId);
    }

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const r: any = exception.getResponse();

      if (r && typeof r === 'object') {
        const err = (r as any).error;
        if (err && typeof err === 'object') {
          if (typeof err.code === 'string' && err.code.length > 0) code = err.code;
          if (typeof err.message === 'string' && err.message.length > 0) message = err.message;
        }
      }

      if (statusCode === 401 && code === 'INTERNAL_ERROR') code = 'UNAUTHORIZED';
      if (statusCode === 403 && code === 'INTERNAL_ERROR') code = 'FORBIDDEN';
      if (statusCode === 404 && code === 'INTERNAL_ERROR') code = 'NOT_FOUND';
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    const body = {
      success: false,
      error: { code, message },
      correlationId,
    };

    if (reply?.status && reply?.send) {
      reply.status(statusCode).send(body);
      return;
    }

    return body as any;
  }
}

async function bootstrap() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const fastify: any = app.getHttpAdapter().getInstance();
  if (fastify?.addHook) {
    fastify.addHook('onRequest', async (req: any, reply: any) => {
      const correlationId =
        req?.headers?.['x-correlation-id'] ||
        req?.headers?.['X-Correlation-Id'] ||
        `document-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      req.correlationId = correlationId;
      reply.header('X-Correlation-Id', correlationId);
    });
  }

  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  const port = parseInt(process.env.PORT || '3021', 10);
    // OutboxWorker setup for reliable event publishing
  const dataSource = app.get(DataSource);
  const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || [];
  if (kafkaBrokers.length > 0) {
    const { KafkaProducer, OutboxWorker, createLogger } = await import('@insurance/shared');
    const logger = createLogger({ serviceName: 'document-ai-service', level: process.env.LOG_LEVEL || 'info' });
    const kafkaProducer = new KafkaProducer({ brokers: kafkaBrokers, clientId: 'document-ai-service' }, logger);
    await kafkaProducer.connect();
    const outboxWorker = new OutboxWorker({
      dataSource,
      producer: kafkaProducer,
      logger,
      producerName: 'document-ai-service',
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '50', 10),
      maxAttempts: parseInt(process.env.OUTBOX_MAX_ATTEMPTS || '5', 10),
    });
    outboxWorker.start();
    console.log('OutboxWorker started for document-ai-service');
  }

await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
