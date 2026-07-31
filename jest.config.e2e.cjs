module.exports = {
  displayName: 'e2e',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.ts', '<rootDir>/tests/e2e/**/*.spec.ts'],
  testTimeout: 60000,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'services/*/src/**/*.ts',
    '!services/*/src/**/*.d.ts',
    '!services/*/src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/e2e',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.e2e.ts'],
};
