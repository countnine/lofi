/* eslint-disable */
// ts-jest transpiles per-file to CommonJS for jest. The project tsconfig targets
// `module: ESNext` (for webpack) and omits esModuleInterop, so override both here
// for the test build only — esModuleInterop is required for the default imports of
// CJS modules (crypto, http, electron-store) in src/main/auth.ts.
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    // electron / electron-store are unavailable outside an Electron runtime.
    // Map them to lightweight stand-ins so modules that import them load.
    '^electron-store$': '<rootDir>/test/__mocks__/electron-store.ts',
    '^electron$': '<rootDir>/test/__mocks__/electron.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          // The project tsconfig whitelists `types`, which excludes jest's globals
          // (describe/it/expect). Add it for the test build.
          types: ['node', 'lodash', 'electron', 'jest'],
          // The reducers import only types from heavy modules; let tsc elide them.
          noUnusedLocals: false,
        },
      },
    ],
  },
};
