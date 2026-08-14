/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testRegex: '.*\\.test\\.ts$',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // ts-jest compile en CJS pour Node ; le tsconfig de l'app (bundler/esnext) ne convient pas à Jest.
          module: 'commonjs',
          moduleResolution: 'node',
          jsx: 'preserve',
          noEmit: false,
          incremental: false,
          declaration: false,
        },
      },
    ],
  },
  // openid-client est mocké dans les tests ; jose est bundlé par ts-jest si besoin.
  transformIgnorePatterns: ['node_modules/(?!(jose|openid-client)/)'],
  collectCoverageFrom: ['lib/**/*.ts', 'middleware.ts'],
  coverageDirectory: 'coverage',
};
