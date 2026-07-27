import { ExecutionContext } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow request when no user is present', () => {
    const context = createMockExecutionContext({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow request when user has tenantId and no header', () => {
    const context = createMockExecutionContext({ user: { tenantId: 'tenant-a' } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow request when header matches JWT tenantId', () => {
    const context = createMockExecutionContext({
      user: { tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-a' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny request when header mismatches JWT tenantId', () => {
    const context = createMockExecutionContext({
      user: { tenantId: 'tenant-a' },
      headers: { 'x-tenant-id': 'tenant-b' },
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should set req.tenantId from JWT', () => {
    const req = { user: { tenantId: 'tenant-a' } };
    const context = createMockExecutionContext({ req });
    guard.canActivate(context);
    expect((req as any).tenantId).toBe('tenant-a');
  });
});

function createMockExecutionContext(input: { user?: any; headers?: any; req?: any }): ExecutionContext {
  const request = input.req || {
    user: input.user,
    headers: input.headers || {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
