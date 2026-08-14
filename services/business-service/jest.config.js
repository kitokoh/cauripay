/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@goursi/payment-rail-contracts$': '<rootDir>/../../../packages/payment-rail-contracts/src/index.ts',
    '^@goursi/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
    '^@goursi/validation-rules$': '<rootDir>/../../../packages/validation-rules/src/index.ts',
  },
};
