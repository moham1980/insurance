import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';
import type { FastifyInstance } from 'fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const fastify: FastifyInstance = app.getHttpAdapter().getInstance();

  await fastify.register(helmet);
  await fastify.register(cors);

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: 15 * 60 * 1000,
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMIT', message: 'Too many requests' },
    }),
  });

  fastify.addHook('onRequest', async (req: any, reply: any) => {
    const correlationId = req.headers['x-correlation-id'] || `gw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.correlationId = correlationId;
    reply.header('X-Correlation-Id', correlationId);
  });

  const services: Record<string, { target: string; path: string }> = {
    claims: { target: process.env.CLAIMS_SERVICE_URL || 'http://localhost:3001', path: '/claims' },
    'claims-readmodel': { target: process.env.CLAIMS_READMODEL_URL || 'http://localhost:3002', path: '/rm' },
    fraud: { target: process.env.FRAUD_SERVICE_URL || 'http://localhost:3003', path: '/fraud' },
    documents: { target: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3004', path: '/documents' },
    copilot: { target: process.env.COPILOT_SERVICE_URL || 'http://localhost:3005', path: '/copilot' },
    orchestrator: { target: process.env.ORCHESTRATOR_URL || 'http://localhost:3006', path: '/orchestrations' },
    workitems: { target: process.env.ORCHESTRATOR_URL || 'http://localhost:3006', path: '/work-items' },
    regulatory: { target: process.env.REGULATORY_GATEWAY_URL || 'http://localhost:3009', path: '/reg' },
  };

  for (const [name, config] of Object.entries(services)) {
    await fastify.register(
      async (instance) => {
        await instance.register(proxy as any, {
          upstream: config.target,
          rewritePrefix: config.path,
          http2: false,
          preHandler: (req: any, _reply: any, done: any) => {
            const correlationId = req.correlationId;
            if (correlationId) {
              req.headers['x-correlation-id'] = correlationId;
            }
            done();
          },
          replyOptions: {
            onError: (reply: any, _err: any) => {
              reply.code(502).send({
                success: false,
                error: { code: 'SERVICE_UNAVAILABLE', message: `${name} service unavailable` },
              });
            },
          },
        } as any);
      },
      { prefix: config.path },
    );
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
