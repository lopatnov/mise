import type { Config } from 'jest';
import { swcJestOptions } from './jest.swc-transform.mts';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest', swcJestOptions],
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};

export default config;
