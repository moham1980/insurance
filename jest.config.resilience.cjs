module.exports = {
  displayName: 'resilience',
  testMatch: ['<rootDir>/tests/resilience/**/*.test.ts'],
  testTimeout: 30000,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'services/*/src/**/*.ts',
    '!services/*/src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/resilience',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.resilience.ts'],
};
