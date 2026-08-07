const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5435, user: 'insurance', password: 'insurance123', database: 'insurance_platform' });
c.connect().then(async () => {
  // Delete the migration record so it re-runs
  await c.query("DELETE FROM sales_network.migrations WHERE name = 'CreateSharedTables1700000000700'");
  console.log('Deleted migration record');
  
  // Check if tables exist in sales_network
  const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='sales_network' AND table_name IN ('outbox_events','consumed_events','dead_letter_queue','audit_records')");
  console.log('Existing in sales_network:', r.rows.map(x => x.table_name).join(', ') || 'NONE');
  
  await c.end();
}).catch(e => console.log('ERR:', e.stack));
