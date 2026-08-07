/**
 * Central gateway configuration and route registry.
 *
 * This file is the single source of truth for:
 * - service upstream targets
 * - public route allow-list (method + exact path)
 * - JWT verification policy
 * - required vs conditional routes
 */

import * as crypto from 'crypto';

export interface ServiceRoute {
  /** Gateway path prefix (e.g. /auth) */
  path: string;
  /** Upstream base URL env var name */
  envVar: string;
  /** Fallback default URL when env var is not set */
  defaultUrl: string;
  /** Whether the route is required to be configured at startup (P0) */
  required: boolean;
  /** Human readable service name */
  name: string;
}

export interface PublicRoute {
  /** HTTP method or 'ALL' for any method */
  method: string;
  /** Exact path prefix that is public (query strings are ignored) */
  path: string;
  /** Whether the route also allows anonymous tenant selection (safe for login/SSO) */
  allowsTenantSelection?: boolean;
}

export const JWT_ISSUER = process.env.IAM_ISSUER || process.env.JWT_ISSUER || 'http://localhost:18001';
export const JWT_AUDIENCE = process.env.JWT_AUDIENCES || process.env.JWT_AUDIENCE || 'insurance-platform';
export const JWKS_URI = process.env.JWKS_URI || `${JWT_ISSUER}/.well-known/jwks.json`;

/** Redis URL for distributed rate limiting and circuit breaker state. */
export const REDIS_URL = normalizeUrl(process.env.REDIS_URL);

/** Allowed JWT algorithms. RS256 for ecosystem federation, HS256 for local service tokens. */
export const ALLOWED_ALGORITHMS: string[] = ['RS256', 'HS256'];

/** Whether to require explicit tenant provisioning (disable 'default' fallback) in production. */
export const REQUIRE_EXPLICIT_TENANT = process.env.REQUIRE_EXPLICIT_TENANT === 'true';

/** CORS origins allow-list. Empty in production means reflect origin is disabled. */
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

export const ADMIN_PERMISSION = process.env.ADMIN_PERMISSION || 'gateway:admin';
export const ADMIN_ROLE = process.env.ADMIN_ROLE || 'platform_admin';

function route(path: string, envVar: string, defaultUrl: string, required: boolean, name: string): ServiceRoute {
  return { path, envVar, defaultUrl, required, name };
}

/** Canonical service route registry shared by proxy and deep health. */
export const SERVICE_ROUTES: ServiceRoute[] = [
  route('/auth', 'AUTH_SERVICE_URL', 'http://localhost:18001', true, 'auth-service'),
  route('/claims', 'CLAIMS_SERVICE_URL', 'http://localhost:18002', true, 'claims-service'),
  route('/rm', 'CLAIMS_READMODEL_URL', 'http://localhost:18012/rm', false, 'claims-readmodel-service'),
  route('/fraud', 'FRAUD_SERVICE_URL', 'http://localhost:18009', true, 'fraud-service'),
  route('/documents', 'DOCUMENT_SERVICE_URL', 'http://localhost:18008', true, 'document-service'),
  route('/copilot', 'COPILOT_SERVICE_URL', 'http://localhost:18030', false, 'copilot-service'),
  route('/orchestrations', 'ORCHESTRATOR_URL', 'http://localhost:18010', true, 'orchestrator-service'),
  route('/workflows', 'ORCHESTRATOR_URL', 'http://localhost:18010', true, 'orchestrator-service'),
  route('/work-items', 'ORCHESTRATOR_URL', 'http://localhost:18010', true, 'orchestrator-service'),
  route('/dlq', 'ORCHESTRATOR_URL', 'http://localhost:18010', true, 'orchestrator-service'),
  route('/reg', 'REGULATORY_GATEWAY_URL', 'http://localhost:18024', true, 'regulatory-gateway-service'),
  route('/flags', 'FEATURE_FLAGS_URL', 'http://localhost:18011', true, 'feature-flags-service'),
  route('/party', 'PARTY_KYC_URL', 'http://localhost:18006', true, 'party-kyc-service'),
  route('/complaints', 'COMPLAINTS_SERVICE_URL', 'http://localhost:18013', true, 'complaints-service'),
  route('/policies', 'POLICY_SERVICE_URL', 'http://localhost:18007', true, 'policy-service'),
  route('/payments', 'PAYMENTS_URL', 'http://localhost:18004', true, 'payments-service'),
  route('/collections', 'COLLECTIONS_URL', 'http://localhost:18025', false, 'collections-service'),
  route('/aml', 'AML_SERVICE_URL', 'http://localhost:18016', true, 'aml-service'),
  route('/re', 'REINSURANCE_SERVICE_URL', 'http://localhost:18017', true, 'reinsurance-service'),
  route('/product', 'PRODUCT_SERVICE_URL', 'http://localhost:18018', true, 'product-service'),
  route('/underwriting', 'UNDERWRITING_SERVICE_URL', 'http://localhost:18032', true, 'underwriting-service'),
  route('/reporting', 'REPORTING_URL', 'http://localhost:18014/reporting', false, 'reporting-service'),
  route('/monitoring', 'MONITORING_SERVICE_URL', 'http://localhost:18020', true, 'monitoring-service'),
  route('/document-ai', 'DOCUMENT_AI_URL', 'http://localhost:18021', false, 'document-ai-service'),
  route('/sales-network', 'SALES_NETWORK_URL', 'http://localhost:18022/sales-network', false, 'sales-network-service'),
  route('/notifications', 'NOTIFICATION_SERVICE_URL', 'http://localhost:18037', true, 'notification-service'),
  route('/customer-portal', 'CUSTOMER_PORTAL_URL', 'http://localhost:18027', true, 'customer-portal-service'),
  route('/agent-portal', 'AGENT_PORTAL_URL', 'http://localhost:18031', true, 'agent-portal-service'),
  route('/workflow', 'WORKFLOW_SERVICE_URL', 'http://localhost:18028', true, 'workflow-service'),
  route('/rule-engine', 'RULE_ENGINE_URL', 'http://localhost:18038', true, 'rule-engine-service'),
  route('/knowledge', 'KNOWLEDGE_SERVICE_URL', 'http://localhost:18033', true, 'knowledge-service'),
  route('/model-switchboard', 'MODEL_SWITCHBOARD_URL', 'http://localhost:18035', true, 'model-switchboard-service'),
  route('/billing', 'BILLING_SERVICE_URL', 'http://localhost:18039', true, 'billing-service'),
  route('/customer-360', 'CUSTOMER_360_URL', 'http://localhost:18026', false, 'customer-360-service'),
  route('/outbox', 'OUTBOX_RELAY_URL', 'http://localhost:18041', false, 'outbox-relay'),
  route('/ai-governance', 'AI_GOVERNANCE_URL', 'http://localhost:18036', false, 'ai-governance-service'),
  route('/broker-bff', 'BROKER_PORTAL_BFF_URL', 'http://localhost:3030', false, 'broker-portal-bff'),
  route('/channel-bff', 'CHANNEL_WORKSPACE_BFF_URL', 'http://localhost:3020', false, 'channel-workspace-bff'),
];

/** Public route allow-list using exact path matching. */
export const PUBLIC_ROUTES: PublicRoute[] = [
  { method: 'POST', path: '/auth/login', allowsTenantSelection: true },
  { method: 'POST', path: '/auth/refresh', allowsTenantSelection: true },
  { method: 'POST', path: '/auth/forgot-password', allowsTenantSelection: true },
  { method: 'POST', path: '/auth/register', allowsTenantSelection: true },
  { method: 'GET', path: '/auth/verify-email' },
  { method: 'GET', path: '/auth/reset-password' },
  { method: 'GET', path: '/auth/sso/:provider', allowsTenantSelection: true },
  { method: 'GET', path: '/auth/sso/:provider/callback', allowsTenantSelection: true },
  { method: 'POST', path: '/auth/federation/:provider/callback', allowsTenantSelection: true },
  { method: 'POST', path: '/auth/service-token' },
  { method: 'GET', path: '/auth/api/v1/brand/by-domain' },
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/gateway/health' },
  { method: 'GET', path: '/gateway/health/upstreams' },
  // NOTE: /gateway/health/deep removed from public routes — requires admin auth (AdminGuard)
];

/** Convert a public route path template to a regex for matching. */
function pathToRegex(path: string): RegExp {
  const escaped = path
    .replace(/\*/g, '.*')
    .replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${escaped}(?:/.*)?$`);
}

const PUBLIC_ROUTE_PATTERNS = PUBLIC_ROUTES.map((r) => ({
  ...r,
  regex: pathToRegex(r.path),
}));

/**
 * Check whether a request should be treated as public.
 *
 * Uses exact path matching (ignoring query string) and method.
 */
export function isPublicRoute(method: string, url: string): { public: boolean; allowsTenantSelection: boolean } {
  const path = url.split('?')[0];
  for (const route of PUBLIC_ROUTE_PATTERNS) {
    if (route.method !== 'ALL' && route.method.toUpperCase() !== method.toUpperCase()) continue;
    if (route.regex.test(path)) {
      return { public: true, allowsTenantSelection: !!route.allowsTenantSelection };
    }
  }
  return { public: false, allowsTenantSelection: false };
}

/** Parse a URL safely; returns undefined if invalid. */
export function normalizeUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** Resolve the effective upstream target for a route, preferring env var then default. */
export function resolveTarget(route: ServiceRoute): string | undefined {
  const fromEnv = normalizeUrl(process.env[route.envVar]);
  if (fromEnv) return fromEnv;
  if (route.required && route.defaultUrl) return route.defaultUrl;
  return normalizeUrl(route.defaultUrl);
}

/** Validate that all required routes have a configured upstream. */
export function validateRequiredRoutes(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const route of SERVICE_ROUTES) {
    if (route.required && !resolveTarget(route)) {
      missing.push(route.name);
    }
  }
  return { valid: missing.length === 0, missing };
}

/** Host / brand-key → tenant resolution for multi-brand white-label routing.
 *  Loads optional mapping from BRAND_HOST_TENANT_MAP env var (JSON object host → { tenantId, brandKey, domainAllowList }).
 */
export interface BrandTenant {
  tenantId: string;
  brandKey: string;
  displayNameFa?: string;
  displayNameEn?: string;
  primaryColor?: string;
  domainAllowList?: string[];
}

export function getBrandTenantMap(): Record<string, BrandTenant> {
  const raw = process.env.BRAND_HOST_TENANT_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function resolveTenantFromHost(host?: string): { tenant: BrandTenant; matchedHost: string } | undefined {
  if (!host) return undefined;
  const map = getBrandTenantMap();
  const normalized = host.split(':')[0].toLowerCase();
  const direct = map[normalized];
  if (direct) {
    const allowList = (direct.domainAllowList || [normalized]);
    if (!allowList.includes(normalized)) return undefined;
    return { tenant: direct, matchedHost: normalized };
  }
  for (const [key, value] of Object.entries(map)) {
    const allowList = (value.domainAllowList || [key]).map((d) => d.toLowerCase());
    if (allowList.includes(normalized)) {
      return { tenant: value, matchedHost: normalized };
    }
  }
  return undefined;
}

export function getGatewaySignatureSecret(): string {
  const secret = process.env.GATEWAY_SIGNATURE_SECRET;
  if (!secret) {
    throw new Error('GATEWAY_SIGNATURE_SECRET environment variable is required — refusing to start with insecure default');
  }
  return secret;
}

export function signInternalContext(payload: Record<string, string>): string {
  const secret = getGatewaySignatureSecret();
  const canonical = Object.keys(payload)
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('&');
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}
