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
  await client.query('CREATE SCHEMA IF NOT EXISTS regulatory;');
  await client.query(`
    CREATE TABLE IF NOT EXISTS regulatory.sanhab_events (
      sanhab_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'sanhab',
      correlation_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      headers JSONB,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_sanhab_events_event_type_received_at ON regulatory.sanhab_events(event_type, received_at);');
  console.log('regulatory.sanhab_events table created');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
