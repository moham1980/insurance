const { DataSource } = require('typeorm');
const { OutboxEvent, ConsumedEvent } = require('@insurance/shared');

console.log('Testing database connection...');

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'postgres',
  entities: [OutboxEvent, ConsumedEvent],
  synchronize: false,
});

dataSource.initialize()
  .then(() => {
    console.log('Database connected successfully!');
    return dataSource.destroy();
  })
  .then(() => {
    console.log('Database connection closed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });
