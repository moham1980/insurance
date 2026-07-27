const service = process.argv[2];
const { AppDataSource } = require(`./services/${service}/dist/data-source.js`);
AppDataSource.initialize()
  .then(() => AppDataSource.runMigrations({ transaction: 'all' }))
  .then(() => AppDataSource.destroy())
  .then(() => { console.log('OK'); process.exit(0); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
