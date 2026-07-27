import { DbHelper } from './helpers/db-helper';

beforeAll(async () => {
  // Global setup before all integration tests
  console.log('Setting up Integration test environment...');
});

afterAll(async () => {
  // Global cleanup after all integration tests
  console.log('Cleaning up Integration test environment...');
  await DbHelper.cleanupAll();
});
