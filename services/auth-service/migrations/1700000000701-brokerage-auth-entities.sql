-- Migration: Brokerage auth-service entity changes
-- Adds new tables: mtls_certificates, org_rate_limits, broker_license_statuses
-- Modifies: sales_network_memberships, organization_relationships, access_audits, brand_configs

-- =============================================================
-- 1. New table: mtls_certificates
-- =============================================================
CREATE TABLE IF NOT EXISTS mtls_certificates (
    certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    tenant_id TEXT NOT NULL,
    common_name TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    pem_content TEXT NOT NULL,
    issuer TEXT,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtls_certs_org_id ON mtls_certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_mtls_certs_tenant_id ON mtls_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mtls_certs_status ON mtls_certificates(status);

-- =============================================================
-- 2. New table: org_rate_limits
-- =============================================================
CREATE TABLE IF NOT EXISTS org_rate_limits (
    rate_limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL,
    agreement_id UUID,
    requests_per_minute INTEGER NOT NULL DEFAULT 600,
    requests_per_hour INTEGER NOT NULL DEFAULT 10000,
    requests_per_day INTEGER NOT NULL DEFAULT 100000,
    burst_limit INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_rate_limits_org_id ON org_rate_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_rate_limits_tenant_id ON org_rate_limits(tenant_id);

-- =============================================================
-- 3. New table: broker_license_statuses
-- =============================================================
CREATE TABLE IF NOT EXISTS broker_license_statuses (
    license_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL,
    broker_central_code TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_type TEXT NOT NULL CHECK (license_type IN ('life', 'non_life', 'both')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired', 'pending')),
    expiry_date TIMESTAMPTZ,
    scope TEXT[] NOT NULL DEFAULT '{}',
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_verification_source TEXT NOT NULL DEFAULT 'manual',
    suspension_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_license_org_id ON broker_license_statuses(organization_id);
CREATE INDEX IF NOT EXISTS idx_broker_license_tenant_id ON broker_license_statuses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_broker_license_status ON broker_license_statuses(status);

-- =============================================================
-- 4. Modify: sales_network_memberships - add commission fields
-- =============================================================
ALTER TABLE sales_network_memberships
    ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS commission_split JSONB;

-- =============================================================
-- 5. Modify: organization_relationships - add distribution agreement fields
-- =============================================================
ALTER TABLE organization_relationships
    ADD COLUMN IF NOT EXISTS commission_rules JSONB,
    ADD COLUMN IF NOT EXISTS product_scope JSONB,
    ADD COLUMN IF NOT EXISTS field_acl JSONB;

-- =============================================================
-- 6. Modify: access_audits - add organization and agreement context
-- =============================================================
ALTER TABLE access_audits
    ADD COLUMN IF NOT EXISTS organization_id UUID,
    ADD COLUMN IF NOT EXISTS agreement_id UUID;

CREATE INDEX IF NOT EXISTS idx_access_audits_org_id ON access_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_audits_agreement_id ON access_audits(agreement_id);

-- =============================================================
-- 7. Modify: brand_configs - add default_language
-- =============================================================
ALTER TABLE brand_configs
    ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'fa';
