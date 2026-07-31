import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantIsolationInterceptor, TracingInterceptor, AuditRecord, AuditPersistenceService } from '@insurance/shared';
import { Party } from './entities/Party';
import { PiiReference } from './entities/PiiReference';
import { KycReview } from './entities/KycReview';
import { DocumentTrustChainEntry } from './entities/DocumentTrustChainEntry';
import { IdentityProofingRecord } from './entities/IdentityProofingRecord';
import { ExternalVerificationRequestEntity } from './entities/ExternalVerificationRequestEntity';
import { KycExceptionEntity } from './entities/KycExceptionEntity';
import { ConsentRecord } from './entities/ConsentRecord';
import { PartyRoleAssignment } from './entities/PartyRoleAssignment';
import { GlobalSubject } from './entities/GlobalSubject';
import { IdentityIdentifier } from './entities/IdentityIdentifier';
import { IdentityLink } from './entities/IdentityLink';
import { BrokerLicense } from './entities/BrokerLicense';
import { FederationConsent } from './entities/FederationConsent';
import { TransactionAmlScreening } from './entities/TransactionAmlScreening';
import { OutboxEvent } from '@insurance/shared';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';
import { IdentityController } from './identity/identity.controller';
import { IdentityService } from './identity/identity.service';
import { BrokerLicenseController } from './broker-license/broker-license.controller';
import { BrokerLicenseService } from './broker-license/broker-license.service';
import { RegulatoryClient } from './broker-license/regulatory-client';
import { FederationConsentService } from './identity/federation-consent.service';
import { FederationConsentController } from './identity/federation-consent.controller';
import { GlobalSubjectFederationService } from './federation/global-subject-federation.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { HealthController } from './health.controller';
import { PiiMaskingInterceptor } from './pii-masking.interceptor';

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
      entities: [Party, PiiReference, KycReview, DocumentTrustChainEntry, IdentityProofingRecord, ExternalVerificationRequestEntity, KycExceptionEntity, ConsentRecord, PartyRoleAssignment, GlobalSubject, IdentityIdentifier, IdentityLink, BrokerLicense, FederationConsent, TransactionAmlScreening, OutboxEvent, AuditRecord],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Party, PiiReference, KycReview, DocumentTrustChainEntry, IdentityProofingRecord, ExternalVerificationRequestEntity, KycExceptionEntity, ConsentRecord, PartyRoleAssignment, GlobalSubject, IdentityIdentifier, IdentityLink, BrokerLicense, FederationConsent, TransactionAmlScreening, OutboxEvent, AuditRecord]),
  ],
  controllers: [PartyController, IdentityController, BrokerLicenseController, FederationConsentController, HealthController],
  providers: [
    AuditPersistenceService,
    PartyService,
    IdentityService,
    BrokerLicenseService,
    RegulatoryClient,
    FederationConsentService,
    GlobalSubjectFederationService,
    JwtAuthGuard,
    PermissionsGuard,
    AbacGuard,
    TenantGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PiiMaskingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantIsolationInterceptor,
    },
  ],
})
export class AppModule {}
