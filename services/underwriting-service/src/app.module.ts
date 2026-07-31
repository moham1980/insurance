import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcosystemJwtGuard } from './ecosystem-jwt.guard';
import { PermissionsGuard } from './permissions.guard';
import { UnderwritingController } from './underwriting.controller';
import { HealthController } from './health.controller';
import { UnderwritingService } from './underwriting.service';
import { UnderwritingRequest } from './entities/UnderwritingRequest';
import { UnderwritingAppetite } from './entities/UnderwritingAppetite';
import { TenantGuard } from './tenant.guard';
import { AbacGuard } from './abac.guard';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { PiiRedactionInterceptor } from './pii-redaction.interceptor';
import { RiskScoringService } from './risk-scoring/risk-scoring.service';
import { OutboxEvent } from '@insurance/shared';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [UnderwritingRequest, UnderwritingAppetite, OutboxEvent],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([UnderwritingRequest, UnderwritingAppetite, OutboxEvent]),
  ],
  controllers: [UnderwritingController, HealthController],
  providers: [
    TenantGuard,
    UnderwritingService,
    EcosystemJwtGuard,
    PermissionsGuard,
    AbacGuard,
    Reflector,
    IdempotencyService,
    RiskScoringService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PiiRedactionInterceptor,
    },
  ],
})
export class AppModule {}
