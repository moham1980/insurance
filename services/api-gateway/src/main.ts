import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import type { FastifyInstance } from 'fastify';
import http from 'node:http';
import https from 'node:https';
import Redis from 'ioredis';
import { createLogger } from '@insurance/shared';
import {
  CORS_ORIGINS,
  getGatewaySignatureSecret,
  isPublicRoute,
  normalizeUrl,
  REDIS_URL,
  REQUIRE_EXPLICIT_TENANT,
  resolveTarget,
  resolveTenantFromHost,
  SERVICE_ROUTES,
  signInternalContext,
  validateRequiredRoutes,
} from './gateway.config';
import { jwtVerifier, VerifiedToken } from './jwt-verifier';
import { GatewayUser } from './admin.guard';

const logger = createLogger({
  serviceName: 'api-gateway',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
]);

function redactHeaders(headers: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(headers || {})) {
    result[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return result;
}

let redisClient: Redis | undefined;

function getRedisClient(): Redis | undefined {
  if (redisClient) return redisClient;
  if (!REDIS_URL) return undefined;
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      commandTimeout: 3000,
      connectTimeout: 10000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisClient.on('error', (err) => {
      logger.error('Redis connection error', err);
    });
    return redisClient;
  } catch (e: any) {
    logger.error('Failed to create Redis client', e instanceof Error ? e : new Error(String(e)));
    return undefined;
  }
}

delete (process.env as any).http_proxy;
delete (process.env as any).HTTP_PROXY;
delete (process.env as any).https_proxy;
delete (process.env as any).HTTPS_PROXY;
delete (process.env as any).all_proxy;
delete (process.env as any).ALL_PROXY;

process.env.NO_PROXY = 'localhost,127.0.0.1';
process.env.no_proxy = 'localhost,127.0.0.1';

/** HTTP status codes that should count as circuit breaker failures. */
const CIRCUIT_BREAKER_FAILURE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** HTTP status codes that are not failures (client errors). */
const CIRCUIT_BREAKER_NON_FAILURE_STATUS_CODES = new Set([400, 401, 403, 404, 405, 409, 422]);

// Circuit Breaker Implementation with optional Redis-backed distributed state.
interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  halfOpenSuccessCount: number;
  lastFailureTime: number | null;
}

class CircuitBreaker {
  private readonly serviceName: string;
  private readonly redisKey: string;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly successThreshold: number;

  constructor(serviceName: string, failureThreshold = 5, recoveryTimeout = 60000, successThreshold = 2) {
    this.serviceName = serviceName;
    this.redisKey = `gw:cb:${serviceName}`;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.successThreshold = successThreshold;
  }

  async execute<T>(fn: () => Promise<T>, isFailure?: (result: T) => boolean): Promise<T> {
    const redis = getRedisClient();
    let state = await this.loadState(redis);

    if (state.state === 'OPEN') {
      if (this.shouldAttemptReset(state)) {
        state = { ...state, state: 'HALF_OPEN', halfOpenSuccessCount: 0 };
        await this.persistState(state, redis);
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (isFailure && isFailure(result)) {
        state = await this.onFailure(state, redis);
        throw new Error('Upstream returned failure status');
      }
      state = await this.onSuccess(state, redis);
      return result;
    } catch (error) {
      state = await this.onFailure(state, redis);
      throw error;
    }
  }

  private shouldAttemptReset(state: CircuitBreakerState): boolean {
    if (!state.lastFailureTime) return false;
    return Date.now() - state.lastFailureTime > this.recoveryTimeout;
  }

  private async onSuccess(state: CircuitBreakerState, redis: Redis | undefined): Promise<CircuitBreakerState> {
    let next: CircuitBreakerState;
    if (state.state === 'HALF_OPEN') {
      const successes = state.halfOpenSuccessCount + 1;
      if (successes >= this.successThreshold) {
        next = { state: 'CLOSED', failureCount: 0, halfOpenSuccessCount: 0, lastFailureTime: null };
      } else {
        next = { ...state, halfOpenSuccessCount: successes };
      }
    } else {
      next = { ...state, failureCount: 0, lastFailureTime: null };
    }
    await this.persistState(next, redis);
    return next;
  }

  private async onFailure(state: CircuitBreakerState, redis: Redis | undefined): Promise<CircuitBreakerState> {
    const now = Date.now();
    const failureCount = state.failureCount + 1;
    let nextState: CircuitBreakerState['state'] = state.state;
    if (failureCount >= this.failureThreshold) {
      nextState = 'OPEN';
    }
    const next: CircuitBreakerState = { ...state, state: nextState, failureCount, halfOpenSuccessCount: 0, lastFailureTime: now };
    await this.persistState(next, redis);
    return next;
  }

  private async loadState(redis: Redis | undefined): Promise<CircuitBreakerState> {
    if (!redis) return this.initialState();
    try {
      const h = await redis.hgetall(this.redisKey);
      if (!h || Object.keys(h).length === 0) return this.initialState();
      return {
        state: (h.state as CircuitBreakerState['state']) || 'CLOSED',
        failureCount: parseInt(h.failures || '0', 10),
        halfOpenSuccessCount: parseInt(h.successes || '0', 10),
        lastFailureTime: h.lastFailure ? parseInt(h.lastFailure, 10) : null,
      };
    } catch (e: any) {
      logger.warn('Circuit breaker Redis load failed; using in-memory state', { service: this.serviceName, error: e?.message });
      return this.initialState();
    }
  }

  private async persistState(state: CircuitBreakerState, redis: Redis | undefined): Promise<void> {
    if (!redis) return;
    try {
      await redis
        .pipeline()
        .hmset(this.redisKey, {
          state: state.state,
          failures: state.failureCount,
          successes: state.halfOpenSuccessCount,
          lastFailure: state.lastFailureTime?.toString() || '0',
        })
        .pexpire(this.redisKey, Math.max(this.recoveryTimeout * 2, 60000))
        .exec();
    } catch (e: any) {
      logger.warn('Circuit breaker Redis persist failed', { service: this.serviceName, error: e?.message });
    }
  }

  private initialState(): CircuitBreakerState {
    return { state: 'CLOSED', failureCount: 0, halfOpenSuccessCount: 0, lastFailureTime: null };
  }

  async getState(): Promise<string> {
    const state = await this.loadState(getRedisClient());
    return state.state;
  }

  async getFailureCount(): Promise<number> {
    const state = await this.loadState(getRedisClient());
    return state.failureCount;
  }

  async reset(): Promise<void> {
    await this.persistState(this.initialState(), getRedisClient());
  }
}

// Circuit Breaker instances per service
const circuitBreakers = new Map<string, CircuitBreaker>();

// Expose circuit breakers globally for health controller
(global as any).circuitBreakers = circuitBreakers;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback store per identity and endpoint.
const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(identity: string, endpoint: string): string {
  return `${identity}:${endpoint}`;
}

function cleanupExpiredRateLimitEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

function checkRateLimitMemory(identity: string, endpoint: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
  const key = getRateLimitKey(identity, endpoint);
  const now = Date.now();
  cleanupExpiredRateLimitEntries(now);
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
}

async function checkRateLimitRedis(
  redis: Redis,
  identity: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetTime: number } | undefined> {
  const safeEndpoint = endpoint.replace(/:/g, '|').slice(0, 128);
  const key = `gw:rl:${identity}:${safeEndpoint}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  const member = `${now}:${Math.random().toString(36).slice(2, 11)}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zcard(key);
    const results = await pipeline.exec();
    if (!results) return undefined;

    const [, count] = results[0];
    if (typeof count !== 'number') return undefined;

    if (count >= maxRequests) {
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length >= 2 ? parseInt(oldest[1], 10) + windowMs : now + windowMs;
      return { allowed: false, remaining: 0, resetTime };
    }

    const pipeline2 = redis.pipeline();
    pipeline2.zadd(key, now, member);
    pipeline2.pexpire(key, windowMs);
    await pipeline2.exec();

    return { allowed: true, remaining: Math.max(0, maxRequests - count - 1), resetTime: now + windowMs };
  } catch (e: any) {
    logger.warn('Redis rate limit command failed; falling back to memory', { error: e?.message || String(e) });
    return undefined;
  }
}

async function checkRateLimit(
  identity: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const redis = getRedisClient();
  if (redis) {
    const redisResult = await checkRateLimitRedis(redis, identity, endpoint, maxRequests, windowMs);
    if (redisResult) return redisResult;
  }
  return checkRateLimitMemory(identity, endpoint, maxRequests, windowMs);
}

function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(
      serviceName,
      new CircuitBreaker(
        serviceName,
        parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
        parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '60000', 10),
        parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2', 10)
      )
    );
  }
  return circuitBreakers.get(serviceName)!;
}

function isCircuitBreakerFailureStatus(status: number): boolean {
  if (CIRCUIT_BREAKER_FAILURE_STATUS_CODES.has(status)) return true;
  if (CIRCUIT_BREAKER_NON_FAILURE_STATUS_CODES.has(status)) return false;
  // Treat other 5xx as failures
  return status >= 500;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestNoProxy(params: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string | Uint8Array;
  timeoutMs?: number;
}): Promise<{ status: number; headers: Record<string, string | string[]>; body: Uint8Array }> {
  const u = new URL(params.url);
  const serviceName = u.host;
  const circuitBreaker = getCircuitBreaker(serviceName);

  return await circuitBreaker.execute(
    async () => {
      const upstreamTimeoutMs = params.timeoutMs ?? parseInt(process.env.UPSTREAM_TIMEOUT_MS || '30000', 10);
      const maxRetries = params.method === 'GET' || params.method === 'HEAD' ? parseInt(process.env.GET_RETRY_COUNT || '1', 10) : 0;
      const retryDelayMs = parseInt(process.env.RETRY_DELAY_MS || '500', 10);
      const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(params.method) || params.headers['x-idempotency-key'];
      const retries = isIdempotent ? maxRetries : 0;

      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await sleep(retryDelayMs * attempt);

        try {
          const result = await singleRequestNoProxy(u, params.method, params.headers, params.body, upstreamTimeoutMs);
          if (isCircuitBreakerFailureStatus(result.status)) {
            lastError = new Error(`Upstream returned failure status ${result.status}`);
            continue;
          }
          return result;
        } catch (err: any) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (!isIdempotent) break;
        }
      }

      throw lastError ?? new Error('Upstream request failed');
    },
    (result) => {
      const r = result as { status: number };
      return isCircuitBreakerFailureStatus(r.status);
    }
  );
}

function singleRequestNoProxy(
  u: URL,
  method: string,
  headers: Record<string, string>,
  body: string | Uint8Array | undefined,
  upstreamTimeoutMs: number
): Promise<{ status: number; headers: Record<string, string | string[]>; body: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
        timeout: upstreamTimeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          const outHeaders: Record<string, string | string[]> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            const lk = k.toLowerCase();
            if (Array.isArray(v)) {
              // Set-Cookie headers must remain separate; all others are joined.
              outHeaders[k] = lk === 'set-cookie' ? v : v.join(',');
            } else if (typeof v === 'string') {
              outHeaders[k] = v;
            }
          }
          resolve({
            status: res.statusCode || 502,
            headers: outHeaders,
            body: new Uint8Array(Buffer.concat(chunks)),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Upstream timeout after ${upstreamTimeoutMs}ms`));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

async function bootstrap() {
  const bodyLimit = parseInt(process.env.BODY_LIMIT_BYTES || '10485760', 10); // 10MB default
  const adapter = new FastifyAdapter({ bodyLimit } as any);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);
  const fastify: FastifyInstance = app.getHttpAdapter().getInstance();

  // Parse binary and multipart bodies as raw buffers for transparent proxying.
  (fastify as any).addContentTypeParser('multipart/form-data', { parseAs: 'buffer' }, (_req: any, body: any, done: any) => done(null, body));
  (fastify as any).addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_req: any, body: any, done: any) => done(null, body));

  const getHeader = (headers: Record<string, any>, key: string): string | undefined => {
    if (!headers) return undefined;
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lowerKey && typeof v === 'string') return v;
    }
    return undefined;
  };

  const corsPlugin = (await import('@fastify/cors')).default;
  const helmet = (await import('@fastify/helmet')).default;

  // Body size limit is configured on the Fastify adapter above.

  await fastify.register(helmet);
  await fastify.register(corsPlugin, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (CORS_ORIGINS.length === 0) {
        // In development with no explicit allow-list, allow any origin but do not send credentials.
        return cb(null, process.env.NODE_ENV === 'production' ? false : true);
      }
      if (CORS_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type', 'x-tenant-id', 'x-correlation-id', 'x-ai-enabled', 'traceparent', 'x-idempotency-key'],
  });

  fastify.addHook('onRequest', async (req: any, reply: any) => {
    const contentLength = parseInt(getHeader(req.headers, 'content-length') || '0', 10);
    if (contentLength > bodyLimit) {
      reply.code(413).send({
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds size limit' },
      });
      return;
    }
  });

  fastify.addHook('onRequest', async (req: any, reply: any) => {
    const method = req.method as string;
    const url = req.url as string;
    const pathOnly = url.split('?')[0];

    const correlationId =
      getHeader(req.headers, 'x-correlation-id') || `gw-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    req.correlationId = correlationId;
    reply.header('X-Correlation-Id', correlationId);

    const publicRoute = isPublicRoute(method, url);

    const aiEnabledHeader = getHeader(req.headers, 'x-ai-enabled');
    if (typeof aiEnabledHeader === 'string') {
      req.aiEnabled = aiEnabledHeader;
    }

    const traceparent = getHeader(req.headers, 'traceparent');
    if (typeof traceparent === 'string' && traceparent.length > 0) {
      req.traceparent = traceparent;
    }

    const inboundTenantId = getHeader(req.headers, 'x-tenant-id');
    let tenantId: string | undefined;
    const brandResolution = resolveTenantFromHost(req.headers?.host);
    let brandTenant = brandResolution?.tenant;

    // P0-5: reject requests to unknown host unless public route explicitly allows it.
    const host = req.headers?.host;
    if (host && !brandResolution && !publicRoute.public) {
      reply.code(403).send({
        success: false,
        error: { code: 'UNKNOWN_HOST', message: 'Tenant cannot be resolved for this Host' },
      });
      return;
    }

    // Verify JWT first; the tenant must come from the verified token, not the client header.
    const authHeader = getHeader(req.headers, 'authorization');
    let verifiedUser: VerifiedToken | undefined;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await jwtVerifier.verify(token);
      if ('error' in result) {
        reply.code(result.error.code === 'GATEWAY_MISCONFIGURED' ? 500 : 401).send({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      verifiedUser = result.verified;

      // JWT tenant is authoritative. Inbound header is only a hint for public tenant-selection routes.
      const tokenTenantId = verifiedUser.tenantId;
      if (tokenTenantId) {
        if (inboundTenantId && inboundTenantId !== tokenTenantId && !publicRoute.allowsTenantSelection) {
          reply.code(403).send({
            success: false,
            error: {
              code: 'TENANT_MISMATCH',
              message: 'Request tenant does not match authenticated identity tenant',
            },
          });
          return;
        }
        tenantId = tokenTenantId;
      } else if (!publicRoute.allowsTenantSelection && REQUIRE_EXPLICIT_TENANT) {
        reply.code(403).send({
          success: false,
          error: { code: 'TENANT_MISSING_FROM_TOKEN', message: 'Authenticated identity has no tenant' },
        });
        return;
      }

      req.userId = verifiedUser.userId;
      req.user = verifiedUser as GatewayUser;
    } else if (!publicRoute.public) {
      reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // For public or anonymous requests, derive tenant from the header, brand host, or default.
    if (!tenantId) {
      if (publicRoute.allowsTenantSelection) {
        tenantId = inboundTenantId || brandTenant?.tenantId;
      }
      if (!tenantId && brandTenant?.tenantId) {
        tenantId = brandTenant.tenantId;
      }
      if (!tenantId && !REQUIRE_EXPLICIT_TENANT) {
        tenantId = process.env.DEFAULT_TENANT_ID;
      }
      if (!tenantId && !publicRoute.public) {
        reply.code(403).send({
          success: false,
          error: { code: 'TENANT_MISSING_FROM_TOKEN', message: 'Authenticated identity has no tenant' },
        });
        return;
      }
      if (!tenantId) {
        tenantId = 'default';
      }
    }

    if (brandTenant) {
      req.brandKey = brandTenant.brandKey;
      reply.header('X-Brand-Key', brandTenant.brandKey);
    }

    req.tenantId = tenantId;
    reply.header('X-Tenant-Id', tenantId);

    // P0-5: sign internal tenant context so downstream services can trust it.
    const tenantContextPayload: Record<string, string> = {
      tenantId,
      brandKey: brandTenant?.brandKey || '',
      host: host || '',
    };
    const tenantContextSignature = signInternalContext(tenantContextPayload);
    req.tenantContextSignature = tenantContextSignature;
    reply.header('X-Tenant-Context-Signature', tenantContextSignature);

    // Derive identity for rate limiting. Use verified user/tenant/IP, not spoofable header alone.
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const rateLimitIdentity = req.userId ? `${tenantId}:${req.userId}` : `${tenantId}:${clientIp}`;
    const endpoint = pathOnly;
    const maxRequestsPerTenant = parseInt(process.env.RATE_LIMIT_MAX_PER_TENANT || '100', 10);
    const windowMsPerTenant = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);

    const rateLimitResult = await checkRateLimit(rateLimitIdentity, endpoint, maxRequestsPerTenant, windowMsPerTenant);
    reply.header('X-RateLimit-Limit', maxRequestsPerTenant);
    reply.header('X-RateLimit-Remaining', rateLimitResult.remaining);
    reply.header('X-RateLimit-Reset', rateLimitResult.resetTime);

    if (!rateLimitResult.allowed) {
      reply.code(429).send({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded for this tenant and endpoint' },
      });
      return;
    }

    if (req.userId) reply.header('X-User-Id', String(req.userId));
    if (typeof req.aiEnabled === 'string' && req.aiEnabled.length > 0) reply.header('X-AI-Enabled', req.aiEnabled);
  });

  interface UpstreamHealth {
    lastCheck: number;
    isHealthy: boolean;
    failureCount: number;
    lastFailure: number | null;
    checked: boolean;
  }

  const upstreamHealth: Record<string, UpstreamHealth> = {};
  const HEALTH_CHECK_INTERVAL_MS = parseInt(process.env.UPSTREAM_HEALTH_CHECK_INTERVAL_MS || '30000', 10);
  const HEALTH_CHECK_FAILURE_THRESHOLD = parseInt(process.env.UPSTREAM_HEALTH_CHECK_FAILURE_THRESHOLD || '3', 10);
  const HEALTH_CHECK_RECOVERY_MS = parseInt(process.env.UPSTREAM_HEALTH_CHECK_RECOVERY_MS || '60000', 10);

  const checkUpstreamHealth = async (name: string, target: string): Promise<boolean> => {
    const health = upstreamHealth[name] ?? { lastCheck: 0, isHealthy: false, failureCount: 0, lastFailure: null, checked: false };
    try {
      const r = await requestNoProxy({
        url: `${target}/health`,
        method: 'GET',
        headers: { accept: 'application/json' },
        timeoutMs: 5000,
      });
      const healthy = r.status >= 200 && r.status < 300;
      const now = Date.now();
      if (healthy) {
        upstreamHealth[name] = { lastCheck: now, isHealthy: true, failureCount: 0, lastFailure: health.lastFailure, checked: true };
      } else {
        const failureCount = health.failureCount + 1;
        const wasHealthy = !!health.isHealthy;
        upstreamHealth[name] = { lastCheck: now, isHealthy: wasHealthy && failureCount < HEALTH_CHECK_FAILURE_THRESHOLD, failureCount, lastFailure: now, checked: true };
      }
      return upstreamHealth[name].isHealthy;
    } catch (e: any) {
      const now = Date.now();
      const failureCount = health.failureCount + 1;
      const wasHealthy = !!health.isHealthy;
      upstreamHealth[name] = { lastCheck: now, isHealthy: wasHealthy && failureCount < HEALTH_CHECK_FAILURE_THRESHOLD, failureCount, lastFailure: now, checked: true };
      return upstreamHealth[name].isHealthy;
    }
  };

  const isUpstreamHealthy = (name: string): boolean => {
    const health = upstreamHealth[name];
    if (!health || !health.checked) return false; // Not checked yet, do not assume healthy
    if (health.isHealthy) return true;
    if (health.lastFailure && Date.now() - health.lastFailure > HEALTH_CHECK_RECOVERY_MS) {
      return true;
    }
    return false;
  };

  const assertValidUrl = (name: string, v: string): void => {
    try {
      // eslint-disable-next-line no-new
      new URL(v);
    } catch {
      throw new Error(`[gateway] invalid upstream URL for ${name}: ${v}`);
    }
  };

  const services: Record<string, { target: string; path: string }> = {};
  for (const route of SERVICE_ROUTES) {
    const target = resolveTarget(route);
    if (target) {
      services[route.name] = { target, path: route.path };
    }
  }

  // Validate required routes are configured.
  const routeValidation = validateRequiredRoutes();
  if (!routeValidation.valid) {
    logger.error('Required upstream routes are missing', undefined, { missing: routeValidation.missing });
    if (process.env.GATEWAY_STRICT_STARTUP === 'true') {
      throw new Error(`Missing required upstream routes: ${routeValidation.missing.join(', ')}`);
    }
  }

  // Probes for optional routes and startup diagnostics
  for (const [name, config] of Object.entries(services)) {
    const target = normalizeUrl(config.target);
    if (!target) continue;
    assertValidUrl(name, target);
  }

  // Initial flags probe (best effort)
  if (services['feature-flags-service']) {
    try {
      const r = await requestNoProxy({
        url: `${services['feature-flags-service'].target}/health`,
        method: 'GET',
        headers: { accept: 'application/json' },
        timeoutMs: 5000,
      });
      logger.info('flags health probe', { status: r.status });
      if (r.status < 200 || r.status >= 300) {
        logger.warn('flags health probe non-OK', { body: '[REDACTED]' });
      }
    } catch (e: any) {
      logger.error('flags health probe failed', e instanceof Error ? e : new Error(String(e)));
    }
  }

  const governanceHeaders = new Set([
    'x-correlation-id',
    'x-tenant-id',
    'x-user-id',
    'x-ai-enabled',
    'traceparent',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'forwarded',
    'host',
    'connection',
    'proxy-authorization',
    'proxy-authenticate',
    'keep-alive',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
    'via',
  ]);

  for (const [name, config] of Object.entries(services)) {
    const prefix = config.path;

    const handler = async (req: any, reply: any) => {
      let upstreamUrl = '';
      let headers: Record<string, string> = {};
      try {
        // Check upstream health before proxying
        if (!isUpstreamHealthy(name)) {
          reply.status(503);
          return {
            success: false,
            error: { code: 'SERVICE_UNAVAILABLE', message: `Service ${name} is temporarily unavailable. Please try again later.` },
          };
        }

        const url = req.url as string;
        const upstreamPath = url.startsWith(prefix) ? url.substring(prefix.length) || '/' : url;
        upstreamUrl = `${config.target}${upstreamPath}`;

        // Build canonical headers: lower-case keys, remove hop-by-hop and governance headers, then add canonical values.
        headers = {};
        for (const [k, v] of Object.entries(req.headers || {})) {
          const lk = k.toLowerCase();
          if (governanceHeaders.has(lk)) continue;
          if (typeof v === 'string') headers[lk] = v;
        }

        if (req.correlationId) headers['x-correlation-id'] = String(req.correlationId);
        if (req.tenantId) headers['x-tenant-id'] = String(req.tenantId);
        if (req.tenantContextSignature) headers['x-tenant-context-signature'] = String(req.tenantContextSignature);
        if (typeof req.aiEnabled === 'string' && req.aiEnabled.length > 0) headers['x-ai-enabled'] = req.aiEnabled;
        if (req.userId) headers['x-user-id'] = String(req.userId);
        if (typeof req.traceparent === 'string' && req.traceparent.length > 0) headers['traceparent'] = req.traceparent;

        // Preserve original Authorization so downstream can independently verify the token.
        const authHeader = getHeader(req.headers, 'authorization');
        if (authHeader && !headers['authorization']) headers['authorization'] = authHeader;

        let body: any = undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const raw = req.body;
          if (raw !== undefined && raw !== null) {
            if (typeof raw === 'string' || raw instanceof Uint8Array) {
              body = raw;
            } else {
              body = JSON.stringify(raw);
              if (!headers['content-type']) headers['content-type'] = 'application/json';
            }
          }
        }

        const upstream = await requestNoProxy({
          url: upstreamUrl,
          method: req.method,
          headers,
          body,
          timeoutMs: parseInt(process.env[`${name.toUpperCase().replace(/-/g, '_')}_TIMEOUT_MS`] || process.env.UPSTREAM_TIMEOUT_MS || '30000', 10),
        });

        reply.code(upstream.status);
        for (const [key, value] of Object.entries(upstream.headers)) {
          const lk = key.toLowerCase();
          if (lk === 'transfer-encoding') continue;
          if (governanceHeaders.has(lk) && lk !== 'content-type') continue;
          if (Array.isArray(value)) {
            if (lk === 'set-cookie') {
              // Preserve multiple Set-Cookie headers for auth/SSO flows.
              reply.header(key, value);
            } else {
              reply.header(key, value.join(', '));
            }
          } else {
            reply.header(key, value);
          }
        }

        const rawContentType = upstream.headers['content-type'];
        const contentType = (Array.isArray(rawContentType) ? rawContentType[0] : rawContentType || '').toLowerCase();
        if (contentType.includes('application/json')) {
          try {
            const json = JSON.parse(Buffer.from(upstream.body).toString('utf8'));
            reply.send(json);
          } catch (parseErr: any) {
            logger.warn('upstream returned invalid JSON', { service: name, url: upstreamUrl, error: parseErr?.message });
            reply.code(502).send({
              success: false,
              error: { code: 'INVALID_UPSTREAM_RESPONSE', message: 'Upstream returned malformed JSON' },
            });
          }
          return;
        }

        reply.send(Buffer.from(upstream.body));
      } catch (e: any) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('upstream fetch failed', err, { service: name, url: upstreamUrl, headers: redactHeaders(headers) });
        reply.code(503).send({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: `${name} service unavailable` },
        });
      }
    };

    fastify.all(`${prefix}`, handler);
    fastify.all(`${prefix}/*`, handler);
  }

  // Periodic upstream health checks with overlap protection
  let healthCheckRunning = false;
  const runHealthChecks = async () => {
    if (healthCheckRunning) {
      logger.warn('upstream health check cycle skipped due to overlap');
      return;
    }
    healthCheckRunning = true;
    try {
      for (const [name, config] of Object.entries(services)) {
        const target = normalizeUrl(config.target);
        if (!target) continue;
        try {
          await checkUpstreamHealth(name, target);
        } catch (e: any) {
          logger.error('health check cycle error', e instanceof Error ? e : new Error(String(e)), { service: name });
        }
      }
    } finally {
      healthCheckRunning = false;
    }
  };

  await runHealthChecks();
  setInterval(runHealthChecks, HEALTH_CHECK_INTERVAL_MS);

  // Gateway health endpoint that includes upstream status
  fastify.get('/gateway/health/upstreams', async (_req: any, reply: any) => {
    const upstreams: Record<string, { healthy: boolean; lastCheck: string | null; failureCount: number; lastFailure: string | null }> = {};
    for (const [name, health] of Object.entries(upstreamHealth)) {
      upstreams[name] = {
        healthy: health.isHealthy,
        lastCheck: health.lastCheck ? new Date(health.lastCheck).toISOString() : null,
        failureCount: health.failureCount,
        lastFailure: health.lastFailure ? new Date(health.lastFailure).toISOString() : null,
      };
    }
    reply.send({ success: true, data: { upstreams, timestamp: new Date().toISOString() } });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen({ port, host: '0.0.0.0' });
}

bootstrap();
