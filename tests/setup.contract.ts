import { DbHelper } from './helpers/db-helper';

beforeAll(async () => {
  console.log('Setting up Contract test environment...');
});

afterAll(async () => {
  console.log('Cleaning up Contract test environment...');
  await DbHelper.cleanupAll();
});
