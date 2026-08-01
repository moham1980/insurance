import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = parseInt(process.env.PORT || '3030', 10);
  await app.listen(port);
  console.log(`Broker Portal BFF listening on port ${port}`);
}
bootstrap();
