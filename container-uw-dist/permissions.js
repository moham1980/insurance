"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionsForRoles = permissionsForRoles;
const ROLE_TO_PERMISSIONS = {
    insurer_admin: ['underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide'],
    head_office_ops: ['underwriting:create', 'underwriting:view', 'underwriting:list'],
    risk_manager: ['underwriting:create', 'underwriting:view', 'underwriting:list', 'underwriting:decide'],
    branch_manager: ['underwriting:view', 'underwriting:list'],
    auditor: ['underwriting:view', 'underwriting:list'],
};
function permissionsForRoles(roles) {
    const rs = Array.isArray(roles) ? roles : [];
    const out = new Set();
    for (const r of rs) {
        const perms = ROLE_TO_PERMISSIONS[r];
        if (!perms)
            continue;
        for (const p of perms)
            out.add(p);
    }
    return Array.from(out);
}
