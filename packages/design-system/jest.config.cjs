/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: { jsx: 'react-js' },
      },
    ],
  },
  moduleNameMapper: {
    '^@insurance/ui-utils$': '<rootDir>/../ui-utils/src/index.ts',
  },
};
