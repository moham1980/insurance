export type FeatureFlagRecord = {
  name: string;
  isEnabled: boolean;
  description?: string | null;
  rolloutPercentage?: number;
  targetAudience?: any;
  updatedAt?: string;
};

export type FeatureFlagsClientConfig = {
  baseUrl: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
};

type CacheEntry<T> = { value: T; expiresAt: number };

export class FeatureFlagsClient {
  private readonly config: Required<Pick<FeatureFlagsClientConfig, 'timeoutMs' | 'cacheTtlMs'>> & FeatureFlagsClientConfig;
  private flagsCache: CacheEntry<Map<string, FeatureFlagRecord>> | null = null;

  constructor(config: FeatureFlagsClientConfig) {
    this.config = {
      timeoutMs: 1500,
      cacheTtlMs: 5000,
      ...config,
    };
  }

  private async fetchJson<T>(path: string, headers?: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...(headers || {}),
        },
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(`FeatureFlagsClient HTTP ${res.status}`);
      }
      if (!json || typeof json !== 'object' || json.success !== true) {
        throw new Error('FeatureFlagsClient invalid response');
      }
      return json.data as T;
    } finally {
      clearTimeout(id);
    }
  }

  async listFeatureFlags(params?: { tenantId?: string; correlationId?: string }): Promise<FeatureFlagRecord[]> {
    const headers: Record<string, string> = {};
    if (params?.tenantId) headers['x-tenant-id'] = params.tenantId;
    if (params?.correlationId) headers['x-correlation-id'] = params.correlationId;
    return await this.fetchJson<FeatureFlagRecord[]>('/feature-flags', headers);
  }

  async getFlag(name: string, params?: { tenantId?: string; correlationId?: string }): Promise<FeatureFlagRecord | null> {
    const cached = await this.getFlagsMapCached(params);
    if (cached) return cached.get(name) || null;

    const headers: Record<string, string> = {};
    if (params?.tenantId) headers['x-tenant-id'] = params.tenantId;
    if (params?.correlationId) headers['x-correlation-id'] = params.correlationId;

    try {
      const res = await fetch(`${this.config.baseUrl}/feature-flags/${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: { accept: 'application/json', ...headers },
      });
      const json = (await res.json().catch(() => null)) as any;
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`FeatureFlagsClient HTTP ${res.status}`);
      if (!json || typeof json !== 'object' || json.success !== true) return null;
      return json.data as FeatureFlagRecord;
    } catch {
      return null;
    }
  }

  async getFlagsMapCached(params?: { tenantId?: string; correlationId?: string }): Promise<Map<string, FeatureFlagRecord> | null> {
    const now = Date.now();
    if (this.flagsCache && this.flagsCache.expiresAt > now) {
      return this.flagsCache.value;
    }

    try {
      const list = await this.listFeatureFlags(params);
      const map = new Map<string, FeatureFlagRecord>();
      for (const f of list) map.set(f.name, f);
      this.flagsCache = { value: map, expiresAt: now + this.config.cacheTtlMs };
      return map;
    } catch {
      return null;
    }
  }
}
