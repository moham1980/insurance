import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('customer-portal');
  app.enableCors({ origin: true, credentials: true });
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`Customer Portal BFF listening on port ${port}`);
}
bootstrap();
