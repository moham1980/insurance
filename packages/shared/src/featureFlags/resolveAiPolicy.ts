export type AiPolicyDecision = {
  enabled: boolean;
  source: 'user_override' | 'tenant_policy' | 'default';
};

export type ResolveAiPolicyParams = {
  tenantFlag?: boolean | null;
  userOverride?: boolean | null;
  defaultEnabled?: boolean;
};

export function resolveAiPolicy(params: ResolveAiPolicyParams): AiPolicyDecision {
  const def = params.defaultEnabled ?? true;

  if (typeof params.userOverride === 'boolean') {
    return { enabled: params.userOverride, source: 'user_override' };
  }

  if (typeof params.tenantFlag === 'boolean') {
    return { enabled: params.tenantFlag, source: 'tenant_policy' };
  }

  return { enabled: def, source: 'default' };
}
