module.exports = {
  displayName: 'integration',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  testTimeout: 30000,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'services/*/src/**/*.ts',
    '!services/*/src/**/*.d.ts',
    '!services/*/src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/integration',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
};
