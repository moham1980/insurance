import { Injectable, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface TenantContext {
  tenantId?: string;
  organizationId?: string;
  userId?: string;
  roles?: string[];
  correlationId?: string;
}

export function getTenantContext(req: Request | any): TenantContext {
  return {
    tenantId: req?.user?.tenantId || req?.user?.tenant_id || req?.tenantId,
    organizationId: req?.user?.organizationId || req?.user?.organization_id || req?.organizationId,
    userId: req?.user?.userId || req?.user?.sub || req?.userId,
    roles: Array.isArray(req?.user?.roles) ? req.user.roles : [],
    correlationId: req?.correlationId,
  };
}

@Injectable()
export class TenantContextService {
  private readonly context = new Map<string, TenantContext>();

  set(correlationId: string, ctx: TenantContext): void {
    this.context.set(correlationId, ctx);
  }

  get(correlationId: string): TenantContext | undefined {
    return this.context.get(correlationId);
  }

  clear(correlationId: string): void {
    this.context.delete(correlationId);
  }
}

export function tenantContextFromExecutionContext(ctx: ExecutionContext): TenantContext {
  const req = ctx.switchToHttp().getRequest();
  return getTenantContext(req);
}
