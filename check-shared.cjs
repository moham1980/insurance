const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5435, user: 'insurance', password: 'insurance123', database: 'insurance_platform' });
c.connect().then(async () => {
  const r = await c.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('outbox_events','consumed_events','dead_letter_queue','audit_records') ORDER BY table_schema, table_name");
  console.log('Shared tables:', r.rows.map(x => `${x.table_schema}.${x.table_name}`).join('\n') || 'NONE FOUND');
  await c.end();
}).catch(e => console.log('ERR:', e.stack));
