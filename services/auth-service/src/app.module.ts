import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { User } from './entities/User';
import { OrganizationUnit } from './entities/OrganizationUnit';
import { AccessAudit } from './entities/AccessAudit';
import { Session } from './entities/Session';
import { AbacPolicy } from './entities/AbacPolicy';
import { FederatedIdentity } from './entities/FederatedIdentity';
import { Organization } from './entities/Organization';
import { OrganizationCapability } from './entities/OrganizationCapability';
import { OrganizationRelationship } from './entities/OrganizationRelationship';
import { SalesNetworkMembership } from './entities/SalesNetworkMembership';
import { Tenant } from './entities/Tenant';
import { BrandConfig } from './entities/BrandConfig';
import { ChannelWorkspace } from './entities/ChannelWorkspace';
import { WorkspaceMembership } from './entities/WorkspaceMembership';
import { MtlsCertificate } from './entities/MtlsCertificate';
import { OrgRateLimit } from './entities/OrgRateLimit';
import { BrokerLicenseStatus } from './entities/BrokerLicenseStatus';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OrgUnitsController } from './org-units.controller';
import { OrgUnitsService } from './org-units.service';
import { IamController } from './iam.controller';
import { AccessAuditService } from './access-audit.service';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { JwtClaimsService } from './jwt-claims.service';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { FederationController, EcosystemCallbackController } from './federation.controller';
import { FederationService } from './federation.service';
import { TokenExchangeService } from './token-exchange/token-exchange.service';
import { FederationTokenGuard } from './token-exchange/federation-token.guard';
import { HealthController } from './health.controller';
import { SessionService } from './session.service';
import { PolicyAdminService } from './policy-admin.service';
import { PolicyAdminController } from './policy-admin.controller';
import { StateStoreService } from './state-store.service';
import { ResourceContextInterceptor } from './resource-context.interceptor';
import { TenantOrganizationController } from './tenant-organization/tenant-organization.controller';
import { TenantOrganizationService } from './tenant-organization/tenant-organization.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { BrandConfigController } from './brand-config.controller';
import { BrandConfigService } from './brand-config.service';
import { PublicBrandController } from './public-brand.controller';
import { RegulatoryWebhookController } from './regulatory-webhook.controller';
import { RegulatoryIntegrationService } from './regulatory-integration.service';
import { RateLimitConfigService } from './rate-limit-config.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';

import { OutboxEvent, AuditRecord, AuditPersistenceService, TenantIsolationInterceptor, TracingInterceptor } from '@insurance/shared';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [User, OrganizationUnit, AccessAudit, Session, AbacPolicy, FederatedIdentity, OutboxEvent, Organization, OrganizationCapability, OrganizationRelationship, SalesNetworkMembership, Tenant, BrandConfig, AuditRecord, ChannelWorkspace, WorkspaceMembership, MtlsCertificate, OrgRateLimit, BrokerLicenseStatus],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([User, OrganizationUnit, AccessAudit, Session, AbacPolicy, FederatedIdentity, OutboxEvent, Organization, OrganizationCapability, OrganizationRelationship, SalesNetworkMembership, Tenant, BrandConfig, AuditRecord, ChannelWorkspace, WorkspaceMembership, MtlsCertificate, OrgRateLimit, BrokerLicenseStatus]),
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController, OrgUnitsController, IamController, SsoController, FederationController, EcosystemCallbackController, HealthController, PolicyAdminController, TenantOrganizationController, WorkspaceController, BrandConfigController, PublicBrandController, RegulatoryWebhookController],
  providers: [
    AuthService, OrgUnitsService, AccessAuditService, RolesGuard, PermissionsGuard, AbacGuard, JwtClaimsService,
    SsoService, FederationService, TokenExchangeService, FederationTokenGuard, SessionService, PolicyAdminService, StateStoreService, TenantOrganizationService,
    AuditPersistenceService, WorkspaceService, BrandConfigService,
    RegulatoryIntegrationService, RateLimitConfigService,
    { provide: APP_INTERCEPTOR, useClass: ResourceContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TracingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantIsolationInterceptor },
  ],
  exports: [AccessAuditService, AbacGuard, SsoService, FederationService, TokenExchangeService, FederationTokenGuard, SessionService, PolicyAdminService, StateStoreService, TenantOrganizationService, JwtClaimsService],
})
export class AppModule {}
