import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createServiceClient } from '../helpers/api-client';
import { JwtFactory } from '../helpers/jwt-factory';
import { DbHelper } from '../helpers/db-helper';

describe('Integration: Auth Service', () => {
  const serviceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:18001';
  const tenantId = 'test-tenant';
  const adminToken = JwtFactory.createAdminToken(tenantId);
  const apiClient = createServiceClient(serviceUrl, adminToken);
  const unauthClient = createServiceClient(serviceUrl);

  let testUserId: string;

  beforeAll(async () => {
    await DbHelper.executeQuery('auth', 'DELETE FROM user_roles');
    await DbHelper.executeQuery('auth', 'DELETE FROM users');
  });

  afterAll(async () => {
    await DbHelper.cleanupAll();
  });

  test('Register user', async () => {
    const response = await unauthClient.post('/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('userId');
    expect(response.data.username).toBe('testuser');
    testUserId = response.data.userId;
  });

  test('Login user', async () => {
    const response = await unauthClient.post('/login', {
      username: 'testuser',
      password: 'SecurePass123!',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveProperty('token');
    expect(response.data).toHaveProperty('user');
  });

  test('Get current user (me)', async () => {
    const loginResponse = await unauthClient.post('/login', {
      username: 'testuser',
      password: 'SecurePass123!',
    });
    const token = loginResponse.data.token;

    const meClient = createServiceClient(serviceUrl, token);
    const meResponse = await meClient.get('/me');

    expect(meResponse.success).toBe(true);
    expect(meResponse.data.username).toBe('testuser');
  });

  test('List users (admin)', async () => {
    const response = await apiClient.get('/users', {
      params: { limit: 10, offset: 0 },
    });

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.pagination).toBeDefined();
  });

  test('Role catalog', async () => {
    const response = await apiClient.get('/roles/catalog');

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('Set user roles', async () => {
    const response = await apiClient.put(`/users/${testUserId}/roles`, {
      roles: ['underwriter'],
    });

    expect(response.success).toBe(true);
    expect(response.data.userId).toBe(testUserId);
    expect(response.data.roles).toContain('underwriter');
  });

  test('T-INT-AUTH-01: Register → login → valid JWT', async () => {
    const registerResponse = await unauthClient.post('/register', {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'SecurePass456!',
      firstName: 'Test',
      lastName: 'User2',
    });
    expect(registerResponse.success).toBe(true);

    const loginResponse = await unauthClient.post('/login', {
      username: 'testuser2',
      password: 'SecurePass456!',
    });
    expect(loginResponse.success).toBe(true);
    expect(loginResponse.data.token).toBeDefined();
  });

  test('T-INT-AUTH-02: Invalid JWT → 401', async () => {
    const invalidTokenClient = createServiceClient(serviceUrl, 'invalid-token');

    try {
      await invalidTokenClient.get('/me');
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }
  });

  test('T-INT-AUTH-03: Role assignment → verified in token', async () => {
    await apiClient.put(`/users/${testUserId}/roles`, {
      roles: ['underwriter', 'claims_handler'],
    });

    const loginResponse = await unauthClient.post('/login', {
      username: 'testuser',
      password: 'SecurePass123!',
    });

    expect(loginResponse.success).toBe(true);
    expect(loginResponse.data.token).toBeDefined();
    expect(loginResponse.data.user.roles).toContain('underwriter');
  });

  test('T-INT-AUTH-04: Duplicate username → error', async () => {
    const response = await unauthClient.post('/register', {
      username: 'testuser',
      email: 'duplicate@example.com',
      password: 'SecurePass789!',
      firstName: 'Dup',
      lastName: 'User',
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('DUPLICATE_USER');
  });

  test('T-INT-AUTH-05: Missing required fields → error', async () => {
    const response = await unauthClient.post('/register', {
      username: 'user-incomplete',
      password: 'SecurePass123!',
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('VALIDATION_ERROR');
  });

  test('T-INT-AUTH-06: Invalid credentials → error', async () => {
    const response = await unauthClient.post('/login', {
      username: 'testuser',
      password: 'WrongPassword!',
    });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('INVALID_CREDENTIALS');
  });
});
