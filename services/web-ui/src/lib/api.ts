'use client';

type ApiResult<T> =
  | { success: true; data: T; correlationId?: string; pagination?: any }
  | { success: false; error: { code: string; message: string }; correlationId?: string };

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function getAuthToken(): string | null {
  const token = getCookie('auth-token');
  if (typeof token === 'string' && token.length > 0) return token;
  return null;
}

export function hasAuthToken(): boolean {
  return getAuthToken() != null;
}

export type AuthUser = {
  userId: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
};

export function getAuthUser(): AuthUser | null {
  try {
    const raw = getCookie('auth-user');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    return obj as AuthUser;
  } catch {
    return null;
  }
}

export function getAuthActorId(): string | null {
  const u = getAuthUser();
  const id = (u as any)?.userId;
  if (typeof id === 'string' && id.length > 0) return id;
  const username = (u as any)?.username;
  if (typeof username === 'string' && username.length > 0) return username;
  return null;
}

export async function clearAuthState() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
}

export function getAiEnabledHeaderValue(): string {
  const raw = getCookie('x-ai-enabled');
  if (raw === 'true' || raw === 'false') return raw;
  return 'true';
}

export function getTenantIdHeaderValue(): string {
  // Try to get tenantId from JWT claims in auth-user cookie first
  try {
    const user = getAuthUser();
    if (user && (user as any).tenantId) return (user as any).tenantId;
  } catch {}
  // Fallback to x-tenant-id cookie
  const raw = getCookie('x-tenant-id');
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return 'default';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:18000';

  const headers = new Headers(init?.headers || {});
  headers.set('x-ai-enabled', getAiEnabledHeaderValue());
  headers.set('x-tenant-id', getTenantIdHeaderValue());

  const token = getAuthToken();
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const correlationId = res.headers.get('x-correlation-id') || res.headers.get('X-Correlation-Id') || undefined;

  if (res.status === 401) {
    clearAuthState();
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch {
      // ignore
    }
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' }, correlationId };
  }

  if (res.status === 403) {
    try {
      if (typeof window !== 'undefined') {
        window.location.href = '/forbidden';
      }
    } catch {
      // ignore
    }
    const json = (await res.json().catch(() => null)) as any;
    if (json && typeof json === 'object' && 'success' in json) {
      return { ...(json as ApiResult<T>), correlationId: (json as any)?.correlationId || correlationId };
    }
    return { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' }, correlationId };
  }

  const json = (await res.json().catch(() => null)) as any;
  if (json && typeof json === 'object' && 'success' in json) {
    return { ...(json as ApiResult<T>), correlationId: (json as any)?.correlationId || correlationId };
  }

  if (!res.ok) {
    return { success: false, error: { code: 'HTTP_ERROR', message: `HTTP ${res.status}` }, correlationId };
  }

  return { success: true, data: json as T, correlationId };
}
