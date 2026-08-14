/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@cauripay/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
    '^@cauripay/validation-rules$': '<rootDir>/../../../packages/validation-rules/src/index.ts',
  },
};
