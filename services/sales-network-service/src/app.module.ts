import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConsumedEvent, DeadLetterEvent, TenantIsolationInterceptor, TracingInterceptor, AuditRecord, AuditPersistenceService } from '@insurance/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';
import { SalesNetworkController } from './sales-network.controller';
import { SalesNetworkService } from './sales-network.service';
import { DistributionAgreementController } from './distribution-agreement/distribution-agreement.controller';
import { DistributionAgreementService } from './distribution-agreement/distribution-agreement.service';
import { AuthServiceClient } from './distribution-agreement/auth-service.client';
import { SalesPartner } from './entities/SalesPartner';
import { CommissionContract } from './entities/CommissionContract';
import { CommissionLedgerEntry } from './entities/CommissionLedgerEntry';
import { SalesKpiDaily } from './entities/SalesKpiDaily';
import { SalesPolicyAttribution } from './entities/SalesPolicyAttribution';
import { DistributionAgreement } from './entities/DistributionAgreement';
import { CommissionTier } from './entities/CommissionTier';
import { ReferralRule } from './entities/ReferralRule';
import { ClawbackRule } from './entities/ClawbackRule';
import { BonusTier } from './entities/BonusTier';
import { MarkupRule } from './entities/MarkupRule';
import { BindingAuthorityProfile } from './entities/BindingAuthorityProfile';
import { AgreementApproval } from './entities/AgreementApproval';
import { Lead } from './entities/Lead';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'sales',
      entities: [SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, DistributionAgreement, CommissionTier, ReferralRule, ClawbackRule, BonusTier, MarkupRule, BindingAuthorityProfile, AgreementApproval, Lead, ConsumedEvent, DeadLetterEvent, OutboxEvent, AuditRecord],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, DistributionAgreement, CommissionTier, ReferralRule, ClawbackRule, BonusTier, MarkupRule, BindingAuthorityProfile, AgreementApproval, Lead, ConsumedEvent, DeadLetterEvent, OutboxEvent, AuditRecord]),
  ],
  controllers: [HealthController, SalesNetworkController, DistributionAgreementController],
  providers: [TenantGuard, AbacGuard, AuditPersistenceService, SalesNetworkService, DistributionAgreementService, AuthServiceClient, JwtAuthGuard, PermissionsGuard, Reflector, {
    provide: APP_INTERCEPTOR,
    useClass: TracingInterceptor,
  }, {
    provide: APP_INTERCEPTOR,
    useClass: TenantIsolationInterceptor,
  }],
})
export class AppModule {}
