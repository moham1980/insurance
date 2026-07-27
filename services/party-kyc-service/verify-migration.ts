import pg from 'pg';
import fs from 'fs';

async function main() {
  const client = new pg.Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5435'),
    user: process.env.DB_USERNAME || 'insurance',
    password: process.env.DB_PASSWORD || 'insurance123',
    database: process.env.DB_DATABASE || 'insurance_platform',
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const m = await client.query("SELECT name, timestamp FROM migrations WHERE name = 'CompletePartyKycSchema1700000000303'");
    const p = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='parties' AND column_name='tenant_id'");
    const k = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='kyc_reviews' AND column_name='tenant_id'");
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='consent_records' ORDER BY ordinal_position");

    const result = {
      migrations: m.rows,
      partiesHasTenant: p.rowCount > 0,
      kycReviewsHasTenant: k.rowCount > 0,
      consentRecordColumns: r.rows.map((x: any) => x.column_name),
    };

    fs.writeFileSync('d:/CascadeProjects/old/insurance/services/party-kyc-service/migration-verify.json', JSON.stringify(result, null, 2));
    console.log('Verification complete. See migration-verify.json');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
