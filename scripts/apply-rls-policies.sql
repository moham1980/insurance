-- PostgreSQL Row-Level Security (RLS) policies for P0 tenant isolation
-- Run after P0 migrations have been applied.
-- IMPORTANT: These policies assume a `tenant_id` column exists on each table.
-- Tables without tenant_id are skipped with a warning.

-- Helper to set tenant context from application connection
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', p_tenant_id, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Generic tenant isolation policy expression
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_tenant', TRUE), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a dedicated migration role that can bypass RLS.
-- Application service accounts must NOT have BYPASSRLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'insurance_migration_role') THEN
    CREATE ROLE insurance_migration_role BYPASSRLS;
    RAISE NOTICE 'Created insurance_migration_role with BYPASSRLS for migrations only';
  END IF;
END $$;

-- Apply RLS to all tenant-scoped tables across P0 schemas
DO $$
DECLARE
  tbl TEXT;
  schema_name TEXT;
  schemas TEXT[] := ARRAY['auth', 'sales', 'party', 'policy'];
  tenant_scoped_tables TEXT[] := ARRAY[
    'organizations', 'organization_capabilities', 'organization_relationships',
    'sales_network_memberships', 'tenants', 'brand_configs',
    'parties', 'party_role_assignments', 'identity_links', 'broker_licenses', 'pii_references',
    'distribution_agreements', 'commission_tiers', 'referral_rules', 'clawback_rules', 'bonus_tiers', 'markup_rules',
    'policies', 'policy_changes', 'policy_inquiries', 'policy_renewals',
    'audit_records', 'transition_audits', 'idempotency_records'
  ];
  has_tenant_id BOOLEAN;
BEGIN
  FOREACH schema_name IN ARRAY schemas LOOP
    FOREACH tbl IN ARRAY tenant_scoped_tables LOOP
      -- Check if table exists in this schema
      IF NOT EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = schema_name AND tablename = tbl
      ) THEN
        CONTINUE;
      END IF;

      -- Check if tenant_id column exists on this table
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = schema_name
          AND table_name = tbl
          AND column_name = 'tenant_id'
      ) INTO has_tenant_id;

      IF NOT has_tenant_id THEN
        RAISE WARNING 'Table %.% has no tenant_id column, skipping RLS', schema_name, tbl;
        CONTINUE;
      END IF;

      -- Enable and force RLS (FORCE ensures even table owners are subject to RLS)
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', schema_name, tbl);
      EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', schema_name, tbl);

      -- Drop existing policy if any
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I.%I;', schema_name, tbl);

      -- Create tenant isolation policy
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I.%I USING (tenant_id::text = current_tenant_id());',
        schema_name, tbl
      );

      RAISE NOTICE 'RLS enabled on %.%', schema_name, tbl;
    END LOOP;
  END LOOP;
END $$;
