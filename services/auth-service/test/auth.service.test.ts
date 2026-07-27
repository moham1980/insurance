import './setup';
import { describe, it, expect, beforeEach } from 'bun:test';
import { AuthService } from '../src/auth.service';
import { User } from '../src/entities/User';
import { FederatedIdentity } from '../src/entities/FederatedIdentity';
import { OutboxEvent } from '@insurance/shared';
import type { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function createMockRepository<T>(items: T[] = []): Partial<Repository<T>> {
  return {
    create: (entityLike: any) => ({ ...entityLike } as T),
    save: async (entity: any) => {
      items.push(entity);
      return entity;
    },
    findOne: async (options: any) => {
      const where = options?.where || {};
      return (items as any[]).find((item) => {
        for (const key of Object.keys(where)) {
          const value = where[key];
          if (Array.isArray(value)) {
            if (!value.some((v: any) => item[key] === v)) return false;
          } else {
            if (item[key] !== value) return false;
          }
        }
        return true;
      }) as T | null || null;
    },
  };
}

function createMockSessionService() {
  return {
    createSession: async (_ctx: any, _token: string) => ({ refreshToken: 'refresh-token-stub' }),
  };
}

describe('AuthService', () => {
  let authService: AuthService;
  let users: User[] = [];
  let identities: FederatedIdentity[] = [];
  let outbox: OutboxEvent[] = [];

  beforeEach(() => {
    users = [];
    identities = [];
    outbox = [];
    authService = new AuthService(
      createMockRepository(users) as Repository<User>,
      createMockRepository(identities) as Repository<FederatedIdentity>,
      createMockRepository(outbox) as Repository<OutboxEvent>,
      createMockSessionService() as any,
    );
  });

  it('register defaults roles to [user] and sets privileged fields to null', async () => {
    const result = await authService.register({
      email: 'alice@example.com',
      username: 'alice',
      password: 'StrongPass1',
      firstName: 'Alice',
      lastName: 'Example',
    });

    expect(result.user.roles).toEqual(['user']);
    expect(result.user.orgUnitId).toBeNull();
    expect(result.user.positionTitle).toBeNull();
    expect(result.user.nationalId).toBeNull();
    expect(result.user.tenantId).toBe(process.env.DEFAULT_TENANT_ID);
    expect(outbox.length).toBe(1);
    expect(outbox[0].eventType).toBe('user.registered');
  });

  it('register rejects a weak password', async () => {
    await expect(
      authService.register({
        email: 'bob@example.com',
        username: 'bob',
        password: 'short',
        firstName: 'Bob',
        lastName: 'Example',
      }),
    ).rejects.toThrow(/at least 8 characters/);
  });

  it('register rejects a password missing complexity rules', async () => {
    await expect(
      authService.register({
        email: 'carol@example.com',
        username: 'carol',
        password: 'lowercase1',
        firstName: 'Carol',
        lastName: 'Example',
      }),
    ).rejects.toThrow(/uppercase/);
  });

  it('login issues token containing tenantId', async () => {
    const password = 'StrongPass1';
    const user = await authService.register({
      email: 'dave@example.com',
      username: 'dave',
      password,
      firstName: 'Dave',
      lastName: 'Example',
    });

    const result = await authService.login({ username: 'dave', password });

    expect(result.token).toBeTruthy();
    expect(result.user.userId).toBe(user.user.userId);

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.tenantId).toBe(process.env.DEFAULT_TENANT_ID);
    expect(decoded.username).toBe('dave');
  });

  it('login rejects invalid password', async () => {
    await authService.register({
      email: 'eve@example.com',
      username: 'eve',
      password: 'StrongPass1',
      firstName: 'Eve',
      lastName: 'Example',
    });

    await expect(authService.login({ username: 'eve', password: 'WrongPass1' })).rejects.toThrow(/Invalid/);
  });

  it('issueServiceToken enforces allow-list and tenant in payload', async () => {
    process.env.SERVICE_TOKEN_ALLOWED_SERVICES = 'workflow-engine,claims-service';
    process.env.SERVICE_TOKEN_ALLOWED_PERMISSIONS = 'claims:read,claims:write';

    const result = authService.issueServiceToken({
      serviceId: 'workflow-engine',
      permissions: ['claims:read', 'claims:write'],
      tenantId: process.env.DEFAULT_TENANT_ID,
    });

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.tokenType).toBe('service');
    expect(decoded.serviceId).toBe('workflow-engine');
    expect(decoded.permissions).toEqual(['claims:read', 'claims:write']);
    expect(decoded.tenantId).toBe(process.env.DEFAULT_TENANT_ID);
    expect(decoded.jti).toBeTruthy();
  });

  it('issueServiceToken rejects a service outside allow-list', () => {
    process.env.SERVICE_TOKEN_ALLOWED_SERVICES = 'workflow-engine';
    process.env.SERVICE_TOKEN_ALLOWED_PERMISSIONS = 'claims:read';

    expect(() =>
      authService.issueServiceToken({ serviceId: 'unknown-service', permissions: ['claims:read'] }),
    ).toThrow(/allow-list/);
  });

  it('setUserRoles enforces tenant mismatch and SoD violations', async () => {
    const { user } = await authService.register({
      email: 'frank@example.com',
      username: 'frank',
      password: 'StrongPass1',
      firstName: 'Frank',
      lastName: 'Example',
    });

    try {
      await authService.setUserRoles({ userId: user.userId, roles: ['insurer_admin', 'branch_staff'], actorTenantId: 'other-tenant' });
      throw new Error('expected tenant mismatch');
    } catch (err: any) {
      expect(err.code).toBe('TENANT_MISMATCH');
    }

    await expect(
      authService.setUserRoles({ userId: user.userId, roles: ['insurer_admin', 'underwriter', 'claims_handler'], actorTenantId: user.tenantId }),
    ).rejects.toThrow(/SoD violation/);

    const updated = await authService.setUserRoles({ userId: user.userId, roles: ['underwriter'], actorTenantId: user.tenantId });
    expect(updated!.roles).toEqual(['underwriter']);
  });

  it('assignOrgUnit rejects cross-tenant', async () => {
    const { user } = await authService.register({
      email: 'grace@example.com',
      username: 'grace',
      password: 'StrongPass1',
      firstName: 'Grace',
      lastName: 'Example',
    });

    try {
      await authService.assignOrgUnit({ userId: user.userId, orgUnitId: 'ou-1', actorTenantId: 'other-tenant' });
      throw new Error('expected tenant mismatch');
    } catch (err: any) {
      expect(err.code).toBe('TENANT_MISMATCH');
    }

    const updated = await authService.assignOrgUnit({ userId: user.userId, orgUnitId: 'ou-1', actorTenantId: user.tenantId! });
    expect(updated!.orgUnitId).toBe('ou-1');
  });

  it('federateLogin creates identity link and issues token', async () => {
    const result = await authService.federateLogin({
      providerId: 'iam-ecosystem',
      providerUserId: 'ext-123',
      email: 'hank@example.com',
      name: 'Hank',
    });

    expect(result.user.roles).toEqual(['user']);
    expect(result.user.globalUserId).toBe('ext-123');
    expect(identities.length).toBe(1);
    expect(identities[0].providerUserId).toBe('ext-123');

    const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
    expect(decoded.username).toBe(result.user.username);
    expect(decoded.tenantId).toBe(process.env.DEFAULT_TENANT_ID);
  });
});
