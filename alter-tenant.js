const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5435,
    user: 'insurance',
    password: 'insurance123',
    database: 'insurance_platform',
  });
  await client.connect();
  await client.query('SET search_path TO policy, public;');
  const sql = `
    DROP INDEX IF EXISTS uq_policies_tenant_policy_number;
    DROP INDEX IF EXISTS uq_policies_tenant_unique_code;
    DROP INDEX IF EXISTS idx_policies_tenant_id;
    DROP INDEX IF EXISTS idx_policy_changes_tenant_id;
    DROP INDEX IF EXISTS idx_policy_inquiries_tenant_id;
    DROP INDEX IF EXISTS idx_policy_renewals_tenant_id;
    ALTER TABLE policies ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
    ALTER TABLE policy_changes ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
    ALTER TABLE policy_inquiries ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
    ALTER TABLE policy_renewals ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
    CREATE UNIQUE INDEX uq_policies_tenant_policy_number ON policies(tenant_id, policy_number);
    CREATE UNIQUE INDEX uq_policies_tenant_unique_code ON policies(tenant_id, unique_code) WHERE unique_code IS NOT NULL;
    CREATE INDEX idx_policies_tenant_id ON policies(tenant_id);
    CREATE INDEX idx_policy_changes_tenant_id ON policy_changes(tenant_id, created_at);
    CREATE INDEX idx_policy_inquiries_tenant_id ON policy_inquiries(tenant_id, created_at);
    CREATE INDEX idx_policy_renewals_tenant_id ON policy_renewals(tenant_id, created_at);
  `;
  await client.query(sql);
  console.log('tenant_id columns converted to text');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
