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
  await client.query('SET search_path TO payments, public;');
  await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB;');
  console.log('payments.metadata column added');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
