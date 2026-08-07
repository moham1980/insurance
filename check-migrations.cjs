const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5435, user: 'insurance', password: 'insurance123', database: 'insurance_platform' });
c.connect().then(async () => {
  const r = await c.query('SELECT * FROM sales_network.migrations ORDER BY timestamp');
  console.log('Migrations:', r.rows.map(x => x.name).join('\n'));
  await c.end();
}).catch(e => console.log('ERR:', e.stack));
