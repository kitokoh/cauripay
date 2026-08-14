/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  transformIgnorePatterns: ['node_modules/(?!(@goursi|nanoid)/)'],
  moduleNameMapper: {
    '^@goursi/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
  },
  testEnvironment: 'node',
};
