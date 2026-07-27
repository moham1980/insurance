import { CanActivate, ExecutionContext, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyAdminService } from './policy-admin.service';
import { type PolicyEvaluationContext } from './abac.policy';

/**
 * ABAC Guard - Attribute-Based Access Control
 * Evaluates access based on user attributes, resource attributes, and context
 * Uses DB-backed policies with hardcoded fallback
 */
@Injectable()
export class AbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyAdminService: PolicyAdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user as any;

    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      });
    }

    // Build ABAC evaluation context
    const evalContext: PolicyEvaluationContext = {
      user: {
        userId: user.userId,
        roles: user.roles || [],
        orgUnitId: user.orgUnitId,
        department: user.department,
        positionTitle: user.positionTitle,
        nationalId: user.nationalId,
        attributes: user.attributes || {},
      },
      resource: {
        type: request.resourceType || 'unknown',
        id: request.resourceId,
        owner: request.resourceOwner,
        orgUnitId: request.resourceOrgUnitId,
        tenantId: request.tenantId,
        attributes: request.resourceAttributes || {},
      },
      action: request.action || 'read',
      context: {
        timestamp: new Date(),
        ipAddress: request.ip,
        userAgent: request.headers?.['user-agent'],
        location: request.location,
        attributes: {
          hour: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
        },
      },
    };

    // Evaluate policies from DB; fail-closed on policy store errors
    let result: { allowed: boolean; matchedPolicy?: { id?: string; name?: string } };
    try {
      result = await this.policyAdminService.evaluateWithDbPolicies(evalContext);
    } catch (error) {
      throw new ServiceUnavailableException({
        success: false,
        error: { code: 'POLICY_STORE_UNAVAILABLE', message: 'Access control policy store is unavailable' },
      });
    }

    if (!result.allowed) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied by ABAC policy',
          policyId: result.matchedPolicy?.id,
          policyName: result.matchedPolicy?.name,
        },
      });
    }

    return true;
  }
}
