import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Build allowed CORS origins from env.
 * Reads CORS_ORIGINS (comma-separated) or INSURER_OPERATIONS_URL.
 * In production, falls back to localhost only if no env is set.
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS || process.env.INSURER_OPERATIONS_URL;
  if (envOrigins) {
    return envOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  }
  // Default: only localhost in production, broader in development
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    return ['http://localhost:3040', 'https://localhost:3040'];
  }
  return ['http://localhost:3040', 'http://localhost:3000', 'http://localhost:5173'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });
  const port = parseInt(process.env.PORT || '3040', 10);
  await app.listen(port);
  console.log(`Insurer Operations BFF listening on port ${port} (CORS origins: ${allowedOrigins.join(', ')})`);
}
bootstrap();
