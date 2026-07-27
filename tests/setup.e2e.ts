import { DbHelper } from './helpers/db-helper';

beforeAll(async () => {
  // Global setup before all E2E tests
  console.log('Setting up E2E test environment...');
});

afterAll(async () => {
  // Global cleanup after all E2E tests
  console.log('Cleaning up E2E test environment...');
  await DbHelper.cleanupAll();
});
