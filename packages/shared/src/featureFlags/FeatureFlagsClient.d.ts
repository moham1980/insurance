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
export declare class FeatureFlagsClient {
    private readonly config;
    private flagsCache;
    constructor(config: FeatureFlagsClientConfig);
    private fetchJson;
    listFeatureFlags(params?: {
        tenantId?: string;
        correlationId?: string;
    }): Promise<FeatureFlagRecord[]>;
    getFlag(name: string, params?: {
        tenantId?: string;
        correlationId?: string;
    }): Promise<FeatureFlagRecord | null>;
    getFlagsMapCached(params?: {
        tenantId?: string;
        correlationId?: string;
    }): Promise<Map<string, FeatureFlagRecord> | null>;
}
