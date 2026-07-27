// @ts-nocheck
import { describe, it, expect, beforeEach } from 'bun:test';
import jwt from 'jsonwebtoken';
import { JwtAuthGuard } from '../src/jwt-auth.guard';

function createContext(request: any) {
  return {
    getClass: () => ({}),
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('JwtAuthGuard', () => {
  const secret = 'test-secret-32-characters-long!!!!';

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    process.env.IAM_ISSUER = 'http://localhost:8080';
    process.env.JWT_AUDIENCES = 'insurance-platform';
    process.env.JWKS_URI = 'http://localhost:8080/.well-known/jwks.json';
  });

  it('rejects requests without an authorization header', async () => {
    const guard = new JwtAuthGuard();
    const request = { headers: {} };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(/authorization token required/i);
  });

  it('rejects non-Bearer authorization headers', async () => {
    const guard = new JwtAuthGuard();
    const request = { headers: { authorization: 'Basic abc' } };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(/authorization token required/i);
  });

  it('validates a local HS256 token and normalizes tenantId/userId fields', async () => {
    const guard = new JwtAuthGuard();
    const token = jwt.sign(
      {
        sub: 'u1',
        tenant_id: 't1',
        scope: 'payments:prepare payments:view',
        roles: ['finance_ops'],
      },
      secret,
      { algorithm: 'HS256', issuer: 'http://localhost:8080', audience: 'insurance-platform' }
    );

    const request = { headers: { authorization: `Bearer ${token}` }, user: undefined } as any;
    const activated = await guard.canActivate(createContext(request));
    expect(activated).toBe(true);
    expect(request.user.tenantId).toBe('t1');
    expect(request.user.userId).toBe('u1');
    expect(request.user.permissions).toContain('payments:prepare');
    expect(request.user.roles).toContain('finance_ops');
  });

  it('rejects an invalid HS256 token', async () => {
    const guard = new JwtAuthGuard();
    const request = { headers: { authorization: 'Bearer invalid-token' } };
    await expect(guard.canActivate(createContext(request))).rejects.toThrow(/invalid or expired token/i);
  });
});
