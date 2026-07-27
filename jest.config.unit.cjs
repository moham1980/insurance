module.exports = {
  displayName: 'unit',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  testTimeout: 10000,
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'services/*/src/**/*.ts',
    '!services/*/src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.unit.ts'],
};
