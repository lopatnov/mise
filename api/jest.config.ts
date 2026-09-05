import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // Mirrors tsconfig.json so tests run the same emit as `nest build`: Nest's DI and
    // class-validator read the `design:*` metadata that legacyDecorator/decoratorMetadata emit,
    // and useDefineForClassFields has to stay off (swc defaults it on at this target, which
    // would turn bare field declarations into own `undefined` properties).
    // Keep in sync with test/jest-e2e.ts.
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
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};

export default config;
