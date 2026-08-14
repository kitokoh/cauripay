/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@cauripay/payment-rail-contracts$': '<rootDir>/../../../packages/payment-rail-contracts/src/index.ts',
    '^@cauripay/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
    '^@cauripay/validation-rules$': '<rootDir>/../../../packages/validation-rules/src/index.ts',
  },
};
