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
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OrgUnitsController } from './org-units.controller';
import { OrgUnitsService } from './org-units.service';
import { IamController } from './iam.controller';
import { AccessAuditService } from './access-audit.service';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { FederationController, EcosystemCallbackController } from './federation.controller';
import { FederationService } from './federation.service';
import { HealthController } from './health.controller';
import { SessionService } from './session.service';
import { PolicyAdminService } from './policy-admin.service';
import { PolicyAdminController } from './policy-admin.controller';
import { StateStoreService } from './state-store.service';
import { ResourceContextInterceptor } from './resource-context.interceptor';

import { OutboxEvent } from '@insurance/shared';
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
      entities: [User, OrganizationUnit, AccessAudit, Session, AbacPolicy, FederatedIdentity, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([User, OrganizationUnit, AccessAudit, Session, AbacPolicy, FederatedIdentity, OutboxEvent]),
  ],
  controllers: [AuthController, OrgUnitsController, IamController, SsoController, FederationController, EcosystemCallbackController, HealthController, PolicyAdminController],
  providers: [
    AuthService, OrgUnitsService, AccessAuditService, RolesGuard, PermissionsGuard, AbacGuard,
    SsoService, FederationService, SessionService, PolicyAdminService, StateStoreService,
    { provide: APP_INTERCEPTOR, useClass: ResourceContextInterceptor },
  ],
  exports: [AccessAuditService, AbacGuard, SsoService, FederationService, SessionService, PolicyAdminService, StateStoreService],
})
export class AppModule {}
