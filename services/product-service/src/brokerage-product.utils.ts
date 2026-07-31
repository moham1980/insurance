import { ForbiddenException } from '@nestjs/common';

export interface ActorContext {
  tenantId: string;
  organizationId?: string | null;
  capabilities?: string[];
  roles?: string[];
  userId?: string | null;
}

export function requireContext(ctx: ActorContext): { tenantId: string; orgId: string } {
  const tenantId = (ctx.tenantId || '').trim();
  const orgId = (ctx.organizationId || '').trim();
  if (!tenantId) throw new ForbiddenException({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } });
  if (!orgId) throw new ForbiddenException({ success: false, error: { code: 'ORGANIZATION_REQUIRED', message: 'Organization context is required' } });
  return { tenantId, orgId };
}

export function hasCapability(ctx: ActorContext, ...caps: string[]): boolean {
  const capabilities = Array.isArray(ctx.capabilities) ? ctx.capabilities : [];
  const roles = Array.isArray(ctx.roles) ? ctx.roles : [];
  return caps.some((c) => capabilities.includes(c)) || roles.includes('insurer_admin') || roles.includes('system_admin');
}

export function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function moneyFromBody(v: any): { amountMinor: string; currency: string } | null {
  if (!v || typeof v !== 'object') return null;
  const amountMinor = String(v.amountMinor ?? v.amount ?? '');
  const currency = String(v.currency || 'IRR');
  if (!amountMinor) return null;
  return { amountMinor, currency };
}

export function moneyFields(v: any): { amountMinor: string | null; currency: string | null } {
  const m = moneyFromBody(v);
  return { amountMinor: m?.amountMinor ?? null, currency: m?.currency ?? 'IRR' };
}

export function normalizePaging(limit: any, offset: any): { limit: number; offset: number } {
  const lim = Math.min(Math.max(parseInt(String(limit ?? 50), 10) || 50, 1), 200);
  const off = Math.max(parseInt(String(offset ?? 0), 10) || 0, 0);
  return { limit: lim, offset: off };
}
