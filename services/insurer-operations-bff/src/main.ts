import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  const port = parseInt(process.env.PORT || '3040', 10);
  await app.listen(port);
  console.log(`Insurer Operations BFF listening on port ${port}`);
}
bootstrap();
