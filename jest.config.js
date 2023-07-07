/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  // preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.m?[tj]s?$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: ["/node_modules/.pnpm/(chalk*)/"],
  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    '^@/(.*)$': "<rootDir>/src/$1",
    '^(\\.{1,2}/.*)\\.(m)?js$': '$1',
  },
  testMatch: ['**/*.test.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.mts',
    '!src/main.ts',
    '!src/repl.ts',
    '!src/utils.ts',
    '!src/env.ts',
    '!src/types/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.d.mts',
  ],
  restoreMocks: true
};
