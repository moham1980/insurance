export function resolveAiPolicy(params) {
    const def = params.defaultEnabled ?? true;
    if (typeof params.userOverride === 'boolean') {
        return { enabled: params.userOverride, source: 'user_override' };
    }
    if (typeof params.tenantFlag === 'boolean') {
        return { enabled: params.tenantFlag, source: 'tenant_policy' };
    }
    return { enabled: def, source: 'default' };
}
//# sourceMappingURL=resolveAiPolicy.js.map