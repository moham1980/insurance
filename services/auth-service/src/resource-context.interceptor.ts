import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RESOURCE_TYPE_KEY, RESOURCE_ACTION_KEY } from './resource.decorator';
import { User } from './entities/User';
import { OrganizationUnit } from './entities/OrganizationUnit';
import { AbacPolicy } from './entities/AbacPolicy';
import { Session } from './entities/Session';
import { FederatedIdentity } from './entities/FederatedIdentity';

@Injectable()
export class ResourceContextInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationUnit) private readonly orgUnitRepo: Repository<OrganizationUnit>,
    @InjectRepository(AbacPolicy) private readonly policyRepo: Repository<AbacPolicy>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(FederatedIdentity) private readonly federatedIdentityRepo: Repository<FederatedIdentity>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const resourceType = this.reflector.getAllAndOverride<string>(RESOURCE_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const explicitAction = this.reflector.getAllAndOverride<string>(RESOURCE_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (resourceType) {
      request.resourceType = resourceType;
      request.resourceId = this.extractResourceId(request, resourceType);
      request.action = explicitAction || this.mapHttpMethod(request.method);
      await this.enrichResourceAttributes(request, resourceType);
    }

    return next.handle();
  }

  private extractResourceId(request: any, resourceType: string): string | undefined {
    const params = request.params || {};
    if (resourceType === 'user') return params.userId || params.id;
    if (resourceType === 'orgUnit') return params.orgUnitId || params.id;
    if (resourceType === 'policy') return params.policyId || params.id;
    if (resourceType === 'session') return params.sessionId || params.id;
    if (resourceType === 'federatedIdentity') return params.identityId || params.id;
    return params[`${resourceType}Id`] || params.id;
  }

  private mapHttpMethod(method: string): string {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'read';
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'write';
      case 'DELETE':
        return 'delete';
      default:
        return 'read';
    }
  }

  private async enrichResourceAttributes(request: any, resourceType: string): Promise<void> {
    if (!request.resourceId) {
      if (!request.resourceTenantId) {
        request.resourceTenantId = request.headers?.['x-tenant-id'] || request.tenantId;
      }
      return;
    }

    if (resourceType === 'user') {
      const user = await this.userRepo.findOne({
        where: { userId: request.resourceId },
        select: ['userId', 'tenantId', 'orgUnitId'],
      });
      if (user) {
        request.resourceOwner = user.userId;
        request.resourceOrgUnitId = user.orgUnitId;
        request.resourceTenantId = user.tenantId;
      }
    } else if (resourceType === 'orgUnit') {
      const orgUnit = await this.orgUnitRepo.findOne({
        where: { orgUnitId: request.resourceId },
        select: ['orgUnitId', 'tenantId', 'parentOrgUnitId', 'type', 'isActive'],
      });
      if (orgUnit) {
        request.resourceOrgUnitId = orgUnit.orgUnitId;
        request.resourceTenantId = orgUnit.tenantId;
        request.resourceAttributes = {
          type: orgUnit.type,
          parentOrgUnitId: orgUnit.parentOrgUnitId,
          isActive: orgUnit.isActive,
        };
      }
    } else if (resourceType === 'policy') {
      const policy = await this.policyRepo.findOne({
        where: { id: request.resourceId },
        select: ['id', 'createdBy', 'enabled', 'status'],
      });
      if (policy) {
        request.resourceOwner = policy.createdBy ?? undefined;
        request.resourceAttributes = {
          enabled: policy.enabled,
          status: policy.status,
        };
      }
    } else if (resourceType === 'session') {
      const session = await this.sessionRepo.findOne({
        where: { id: request.resourceId },
        select: ['id', 'userId', 'tenantId', 'isRevoked', 'status'],
      });
      if (session) {
        request.resourceOwner = session.userId;
        request.resourceTenantId = session.tenantId;
        request.resourceAttributes = {
          isRevoked: session.isRevoked,
          status: session.status,
        };
      }
    } else if (resourceType === 'federatedIdentity') {
      const identity = await this.federatedIdentityRepo.findOne({
        where: { id: request.resourceId },
        select: ['id', 'userId', 'providerId', 'providerUserId'],
      });
      if (identity) {
        request.resourceOwner = identity.userId;
        request.resourceAttributes = {
          providerId: identity.providerId,
          providerUserId: identity.providerUserId,
        };
      }
    }

    if (!request.resourceTenantId) {
      request.resourceTenantId = request.headers?.['x-tenant-id'] || request.tenantId;
    }
  }
}
