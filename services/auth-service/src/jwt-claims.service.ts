import { Injectable } from '@nestjs/common';

export interface JwtClaims {
  sub: string;
  tenantId?: string;
  organizationId?: string;
  capabilities?: string[];
  roles?: string[];
  permissions?: string[];
  scope?: string;
}

export interface ResolvedClaims {
  userId: string;
  tenantId?: string;
  organizationId?: string;
  capabilities: string[];
  roles: string[];
  permissions: string[];
  agreementId?: string;
  fieldAcl?: {
    visibleFields?: string[];
    editableFields?: string[];
    hiddenFields?: string[];
  };
}

@Injectable()
export class JwtClaimsService {
  resolve(payload: any): ResolvedClaims {
    const userId = payload?.sub || payload?.userId || payload?.subject;
    const tenantId = payload?.tenantId || payload?.tid;
    const organizationId = payload?.organizationId || payload?.oid || payload?.orgId;
    const capabilities = Array.isArray(payload?.capabilities) ? payload.capabilities : [];
    const roles = Array.isArray(payload?.roles) ? payload.roles : [];
    const permissions = Array.isArray(payload?.permissions) ? payload.permissions : [];
    if (payload?.scope && typeof payload.scope === 'string') {
      const scopeParts = payload.scope.split(' ').filter((s: string) => s.length > 0);
      // Add OAuth scope as capability tokens for ABAC
      for (const part of scopeParts) {
        if (!capabilities.includes(part)) capabilities.push(part);
      }
    }
    return {
      userId,
      tenantId,
      organizationId,
      capabilities,
      roles,
      permissions,
      agreementId: payload?.agreementId,
      fieldAcl: payload?.fieldAcl,
    };
  }
}
