// @ts-nocheck
import { TenantGuard } from '../src/tenant.guard';

function createContext(request: any) {
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('should set req.tenantId from the authenticated user and allow the request', () => {
    const request = {
      headers: {},
      user: { sub: 'u1', tenantId: 't1' },
    } as any;
    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.tenantId).toBe('t1');
  });

  it('should reject a regular user without a tenantId even when a tenant header is provided', () => {
    const request = {
      headers: { 'x-tenant-id': 't2' },
      user: { sub: 'u1' },
    } as any;
    expect(() => guard.canActivate(createContext(request))).toThrow(/tenant identifier required/i);
  });

  it('should reject when user tenantId and header tenantId mismatch', () => {
    const request = {
      headers: { 'x-tenant-id': 't3' },
      user: { sub: 'u1', tenantId: 't1' },
    } as any;
    expect(() => guard.canActivate(createContext(request))).toThrow(/mismatch/i);
  });

  it('should allow unauthenticated requests so AuthGuard can handle authentication', () => {
    const request = { headers: {}, user: null } as any;
    expect(guard.canActivate(createContext(request))).toBe(true);
  });

  it('should reject when no tenantId and user is not a system user', () => {
    const request = { headers: {}, user: { sub: 'u1' } } as any;
    expect(() => guard.canActivate(createContext(request))).toThrow(/tenant identifier required/i);
  });

  it('should allow system user without tenantId', () => {
    const request = { headers: {}, user: { sub: 'system', roles: ['system'] } } as any;
    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request.tenantId).toBeUndefined();
  });
});
