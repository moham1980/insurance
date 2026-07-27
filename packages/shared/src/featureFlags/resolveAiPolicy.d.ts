export type AiPolicyDecision = {
    enabled: boolean;
    source: 'user_override' | 'tenant_policy' | 'default';
};
export type ResolveAiPolicyParams = {
    tenantFlag?: boolean | null;
    userOverride?: boolean | null;
    defaultEnabled?: boolean;
};
export declare function resolveAiPolicy(params: ResolveAiPolicyParams): AiPolicyDecision;
