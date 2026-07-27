export class FeatureFlagsClient {
    config;
    flagsCache = null;
    constructor(config) {
        this.config = {
            timeoutMs: 1500,
            cacheTtlMs: 5000,
            ...config,
        };
    }
    async fetchJson(path, headers) {
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
            const json = (await res.json().catch(() => null));
            if (!res.ok) {
                throw new Error(`FeatureFlagsClient HTTP ${res.status}`);
            }
            if (!json || typeof json !== 'object' || json.success !== true) {
                throw new Error('FeatureFlagsClient invalid response');
            }
            return json.data;
        }
        finally {
            clearTimeout(id);
        }
    }
    async listFeatureFlags(params) {
        const headers = {};
        if (params?.tenantId)
            headers['x-tenant-id'] = params.tenantId;
        if (params?.correlationId)
            headers['x-correlation-id'] = params.correlationId;
        return await this.fetchJson('/feature-flags', headers);
    }
    async getFlag(name, params) {
        const cached = await this.getFlagsMapCached(params);
        if (cached)
            return cached.get(name) || null;
        const headers = {};
        if (params?.tenantId)
            headers['x-tenant-id'] = params.tenantId;
        if (params?.correlationId)
            headers['x-correlation-id'] = params.correlationId;
        try {
            const res = await fetch(`${this.config.baseUrl}/feature-flags/${encodeURIComponent(name)}`, {
                method: 'GET',
                headers: { accept: 'application/json', ...headers },
            });
            const json = (await res.json().catch(() => null));
            if (res.status === 404)
                return null;
            if (!res.ok)
                throw new Error(`FeatureFlagsClient HTTP ${res.status}`);
            if (!json || typeof json !== 'object' || json.success !== true)
                return null;
            return json.data;
        }
        catch {
            return null;
        }
    }
    async getFlagsMapCached(params) {
        const now = Date.now();
        if (this.flagsCache && this.flagsCache.expiresAt > now) {
            return this.flagsCache.value;
        }
        try {
            const list = await this.listFeatureFlags(params);
            const map = new Map();
            for (const f of list)
                map.set(f.name, f);
            this.flagsCache = { value: map, expiresAt: now + this.config.cacheTtlMs };
            return map;
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=FeatureFlagsClient.js.map