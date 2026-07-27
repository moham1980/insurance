import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { InstallmentPlan } from './entities/InstallmentPlan';
import { Installment } from './entities/Installment';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { HealthController } from './health.controller';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
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
      entities: [InstallmentPlan, Installment, OutboxEvent, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([InstallmentPlan, Installment, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [CollectionsController, HealthController],
  providers: [TenantGuard, AbacGuard, CollectionsService, JwtAuthGuard, PermissionsGuard, Reflector],
})
export class AppModule {}
