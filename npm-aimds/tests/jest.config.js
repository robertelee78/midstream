/**
 * Jest Configuration for AIMDS npm package
 * Target: >98% code coverage
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/../../AIMDS/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        target: 'ES2020',
        module: 'commonjs'
      }
    }]
  },
  collectCoverageFrom: [
    '../../AIMDS/src/**/*.{ts,tsx}',
    '!../../AIMDS/src/**/*.d.ts',
    '!../../AIMDS/src/**/*.test.{ts,tsx}',
    '!../../AIMDS/src/**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../AIMDS/src/$1',
    '^@tests/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  bail: false,
  maxWorkers: '50%',
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/target/'],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/target/']
};
