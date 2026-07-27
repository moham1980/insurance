import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Claim } from './entities/Claim';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { PiiMaskingMiddleware } from './pii-masking.middleware';
import { HealthController } from './health.controller';
import { ClaimsEventsConsumer } from './claims-events.consumer';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'postgres',
      schema: process.env.DB_SCHEMA || 'claims',
      entities: [Claim, OutboxEvent, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Claim, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [ClaimsController, HealthController],
  providers: [ClaimsService, ClaimsEventsConsumer, JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard],
  exports: [ClaimsService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PiiMaskingMiddleware).forRoutes('*');
  }
}
