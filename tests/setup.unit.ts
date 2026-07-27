import { DbHelper } from './helpers/db-helper';

beforeAll(async () => {
  console.log('Setting up Unit test environment...');
});

afterAll(async () => {
  console.log('Cleaning up Unit test environment...');
  await DbHelper.cleanupAll();
});
