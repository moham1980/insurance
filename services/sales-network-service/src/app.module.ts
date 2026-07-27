import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';
import { SalesNetworkController } from './sales-network.controller';
import { SalesNetworkService } from './sales-network.service';
import { SalesPartner } from './entities/SalesPartner';
import { CommissionContract } from './entities/CommissionContract';
import { CommissionLedgerEntry } from './entities/CommissionLedgerEntry';
import { SalesKpiDaily } from './entities/SalesKpiDaily';
import { SalesPolicyAttribution } from './entities/SalesPolicyAttribution';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
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
      schema: process.env.DB_SCHEMA || 'sales',
      entities: [SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, ConsumedEvent, DeadLetterEvent, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, ConsumedEvent, DeadLetterEvent, OutboxEvent]),
  ],
  controllers: [HealthController, SalesNetworkController],
  providers: [TenantGuard, AbacGuard, SalesNetworkService, JwtAuthGuard, PermissionsGuard, Reflector],
})
export class AppModule {}
