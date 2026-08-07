const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5435,
  username: 'insurance',
  password: 'insurance123',
  database: 'insurance_platform',
  schema: 'sales_network',
});
ds.initialize().then(async () => {
  const r = await ds.query("SELECT table_name FROM information_schema.tables WHERE table_schema='sales_network' ORDER BY table_name");
  console.log(r.map(x => x.table_name).join(', '));
  await ds.destroy();
}).catch(e => console.log('ERR:', e.message));
