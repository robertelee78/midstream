/**
 * Jest Test Setup
 * Global configuration and mocks for AIMDS test suite
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.AGENTDB_PATH = ':memory:';
process.env.AIMDS_PORT = '9999';

// Global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate mock request ID
  generateRequestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Generate mock embedding
  generateEmbedding: (dim: number = 384): number[] => {
    return Array.from({ length: dim }, () => Math.random());
  },

  // Performance timing
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }
};

// Mock console methods in tests (except errors)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in tests:', reason);
});

declare global {
  var testUtils: {
    waitFor: (ms: number) => Promise<void>;
    generateRequestId: () => string;
    generateEmbedding: (dim?: number) => number[];
    measurePerformance: <T>(fn: () => Promise<T>) => Promise<{ result: T; duration: number }>;
  };
}

export {};
