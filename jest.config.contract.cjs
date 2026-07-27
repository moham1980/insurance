module.exports = {
  displayName: 'contract',
  testMatch: ['<rootDir>/tests/contract/**/*.test.ts'],
  testTimeout: 15000,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'services/*/src/**/*.ts',
    '!services/*/src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/contract',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.contract.ts'],
};
