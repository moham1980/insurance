import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  function buildContext(user: any, tenantIdHeader?: string): ExecutionContext {
    const headers: Record<string, string> = {};
    if (tenantIdHeader) headers['x-tenant-id'] = tenantIdHeader;
    const request = { user, headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows request when tenantId matches user tenantId and header', () => {
    const ctx = buildContext({ userId: 'u1', tenantId: 'tenant-a' }, 'tenant-a');
    const req = ctx.switchToHttp().getRequest();
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.tenantId).toBe('tenant-a');
  });

  it('allows request when tenantId is present and no header', () => {
    const ctx = buildContext({ userId: 'u1', tenantId: 'tenant-b' });
    const req = ctx.switchToHttp().getRequest();
    expect(guard.canActivate(ctx)).toBe(true);
    expect(req.tenantId).toBe('tenant-b');
  });

  it('throws ForbiddenException when user has no tenantId', () => {
    const ctx = buildContext({ userId: 'u1' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when header tenantId mismatches', () => {
    const ctx = buildContext({ userId: 'u1', tenantId: 'tenant-a' }, 'tenant-b');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows public endpoints with no user', () => {
    const ctx = buildContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
