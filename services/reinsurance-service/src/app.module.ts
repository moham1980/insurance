import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { EcosystemJwtGuard } from './ecosystem-jwt.guard';
import { PermissionsGuard } from './permissions.guard';
import { ReinsuranceController } from './reinsurance.controller';
import { ReinsuranceService } from './reinsurance.service';
import { PolicyConsumer } from './policy.consumer';
import { ReTreaty } from './entities/ReTreaty';
import { ReCession } from './entities/ReCession';
import { ReStatement } from './entities/ReStatement';
import { ReReconciliation } from './entities/ReReconciliation';
import { ReClaimRecovery } from './entities/ReClaimRecovery';
import { ReTicket } from './entities/ReTicket';
import { ReTicketMessage } from './entities/ReTicketMessage';
import { ReTicketAttachment } from './entities/ReTicketAttachment';
import { HealthController } from './health.controller';

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
      entities: [
        ReTreaty,
        ReCession,
        ReStatement,
        ReReconciliation,
        ReClaimRecovery,
        ReTicket,
        ReTicketMessage,
        ReTicketAttachment,
        OutboxEvent,
        ConsumedEvent,
        DeadLetterEvent,
      ],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([
      ReTreaty,
      ReCession,
      ReStatement,
      ReReconciliation,
      ReClaimRecovery,
      ReTicket,
      ReTicketMessage,
      ReTicketAttachment,
      OutboxEvent,
      ConsumedEvent,
      DeadLetterEvent,
    ]),
  ],
  controllers: [ReinsuranceController, HealthController],
  providers: [TenantGuard, Reflector, EcosystemJwtGuard, ReinsuranceService, PolicyConsumer, PermissionsGuard],
})
export class AppModule {}
