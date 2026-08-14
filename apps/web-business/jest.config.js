/**
 * Jest — web-business (GOURSI-043a).
 * ts-jest avec un tsconfig dédié (module commonjs pour la compilation des tests,
 * voir tsconfig.test.json) ; l'alias @/* pointe vers la racine de l'app.
 */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/tests/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['lib/**/*.ts'],
  coverageDirectory: 'coverage',
};
