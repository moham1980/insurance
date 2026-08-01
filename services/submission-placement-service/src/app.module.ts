import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditRecord, AuditPersistenceService, IdempotencyRecord, OutboxEvent, TenantIsolationInterceptor } from '@insurance/shared';
import { AppDataSource } from './data-source';

import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { HealthController } from './health.controller';

import { Submission } from './entities/Submission';
import { CoverageRequest } from './entities/CoverageRequest';
import { DocumentRef } from './entities/DocumentRef';
import { QuoteRequest } from './entities/QuoteRequest';
import { QuoteResponse } from './entities/QuoteResponse';
import { QuoteError } from './entities/QuoteError';
import { Placement } from './entities/Placement';
import { Subjectivity } from './entities/Subjectivity';
import { QuoteDocument } from './entities/QuoteDocument';
import { ConnectorConfig } from './entities/ConnectorConfig';

import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { ConnectorConfigController } from './connector-config.controller';
import { ConnectorConfigService } from './connector-config.service';
import { CarrierConnectorRegistry } from './carrier-connectors/carrier-connector.registry';
import { CarrierConnectorFactory } from './carrier-connectors/carrier-connector.factory';
import { PartnerDiscoveryService } from './carrier-connectors/partner-discovery.service';

import { RfqController } from './rfq.controller';
import { RfqEngine } from './rfq/rfq-engine';
import { QuoteDispatcher } from './rfq/quote-dispatcher';
import { UnderwritingReferral } from './rfq/underwriting-referral';
import { AmlCheckService } from './rfq/aml-check.service';

import { ComparisonController } from './comparison.controller';
import { ComparisonEngine } from './comparison/comparison-engine';
import { RankingRule } from './comparison/ranking-rule';

import { PlacementController } from './placement.controller';
import { PlacementService } from './placement/placement.service';
import { PlacementOrchestrator } from './placement/placement-orchestrator';
import { SubjectivityFulfillmentService } from './subjectivities/subjectivity-fulfillment.service';
import { QuoteDocumentService } from './documents/quote-document.service';
import { ClientRegistry } from './clients/client.registry';
import { ProductServiceClient } from './clients/product-service.client';
import { PolicyServiceClient } from './clients/policy-service.client';
import { BillingServiceClient } from './clients/billing-service.client';
import { UnderwritingServiceClient } from './clients/underwriting-service.client';
import { FraudServiceClient } from './clients/fraud-service.client';
import { SalesNetworkServiceClient } from './clients/sales-network-service.client';
import { WorkflowEngineClient } from './clients/workflow-engine.client';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    } as any),
    TypeOrmModule.forFeature([
      Submission,
      CoverageRequest,
      DocumentRef,
      QuoteRequest,
      QuoteResponse,
      QuoteError,
      Placement,
      Subjectivity,
      QuoteDocument,
      ConnectorConfig,
      OutboxEvent,
      IdempotencyRecord,
      AuditRecord,
    ]),
  ],
  controllers: [
    HealthController,
    SubmissionController,
    ConnectorConfigController,
    RfqController,
    ComparisonController,
    PlacementController,
  ],
  providers: [
    Reflector,
    TenantGuard,
    AbacGuard,
    JwtAuthGuard,
    PermissionsGuard,
    AuditPersistenceService,
    { provide: APP_INTERCEPTOR, useClass: TenantIsolationInterceptor },
    SubmissionService,
    ConnectorConfigService,
    CarrierConnectorRegistry,
    CarrierConnectorFactory,
    PartnerDiscoveryService,
    RfqEngine,
    QuoteDispatcher,
    UnderwritingReferral,
    AmlCheckService,
    ComparisonEngine,
    RankingRule,
    PlacementService,
    PlacementOrchestrator,
    SubjectivityFulfillmentService,
    QuoteDocumentService,
    ClientRegistry,
    ProductServiceClient,
    PolicyServiceClient,
    BillingServiceClient,
    UnderwritingServiceClient,
    FraudServiceClient,
    SalesNetworkServiceClient,
    WorkflowEngineClient,
  ],
})
export class AppModule {}
