import type { Options } from '@swc/core';

// Mirrors tsconfig.json so tests run the same emit as `nest build`: Nest's DI and
// class-validator read the `design:*` metadata that legacyDecorator/decoratorMetadata emit,
// and useDefineForClassFields has to stay off (swc defaults it on at this target, which
// would turn bare field declarations into own `undefined` properties).
// Shared by jest.config.ts and test/jest-e2e.ts so the two can't drift out of sync.
export const swcJestOptions: Options = {
  jsc: {
    target: 'es2023',
    parser: { syntax: 'typescript', decorators: true },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
      useDefineForClassFields: false,
    },
  },
};
