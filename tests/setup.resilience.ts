import { DbHelper } from './helpers/db-helper';

beforeAll(async () => {
  console.log('Setting up Resilience test environment...');
});

afterAll(async () => {
  console.log('Cleaning up Resilience test environment...');
  await DbHelper.cleanupAll();
});
