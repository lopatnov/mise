import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    // Keep in sync with ../jest.config.ts — see the comment there on why these options
    // are required.
    '^.+\\.(t|j)s$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2023',
          parser: { syntax: 'typescript', decorators: true },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
  // All spec files share one live MongoDB instance and some mutate global state (e.g.
  // AdminSettings) — run them one at a time so cross-file ordering can't race.
  maxWorkers: 1,
};

export default config;
