import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }));
  app.enableShutdownHooks();
  const port = parseInt(process.env.PARTNER_GATEWAY_PORT || '3010', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Partner Gateway listening on port ${port}`);
}

bootstrap();
