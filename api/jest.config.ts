import type { Config } from 'jest';
import { swcJestOptions } from './jest.swc-transform.mts';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest', swcJestOptions],
  },
  // NestJS 12 ships ESM-only; Jest's CommonJS runtime can't load it, so swc transpiles it like uuid.
  transformIgnorePatterns: ['/node_modules/(?!(uuid|@nestjs)/)'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};

export default config;
