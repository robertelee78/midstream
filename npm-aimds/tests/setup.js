/**
 * Jest Test Setup
 * Runs before each test file
 */

// Enable garbage collection for memory tests
if (global.gc) {
  console.log('✅ GC enabled for memory leak tests');
} else {
  console.warn('⚠️  GC not available. Run with --expose-gc for memory tests');
}

// Set up custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveLatencyBelow(received, threshold) {
    const pass = received < threshold;
    if (pass) {
      return {
        message: () => `expected latency ${received}ms not to be below ${threshold}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected latency ${received}ms to be below ${threshold}ms`,
        pass: false,
      };
    }
  },

  toHaveThroughputAbove(received, threshold) {
    const pass = received > threshold;
    if (pass) {
      return {
        message: () => `expected throughput ${received} req/s not to be above ${threshold} req/s`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected throughput ${received} req/s to be above ${threshold} req/s`,
        pass: false,
      };
    }
  },
});

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

global.testConsole = {
  log: originalConsoleLog,
  warn: originalConsoleWarn,
  error: originalConsoleError,
};

// Suppress logs during tests unless verbose
if (!process.env.VERBOSE_TESTS) {
  console.log = jest.fn();
  console.warn = jest.fn();
}

// Always show errors
console.error = originalConsoleError;

// Set up test utilities
global.testUtils = {
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  measurePerformance: async (fn, iterations = 100) => {
    const { performance } = require('perf_hooks');
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      times.push(performance.now() - start);
    }

    times.sort((a, b) => a - b);

    return {
      min: times[0],
      max: times[times.length - 1],
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: times[Math.floor(iterations * 0.5)],
      p95: times[Math.floor(iterations * 0.95)],
      p99: times[Math.floor(iterations * 0.99)],
    };
  },

  generateTestData: (size, pattern = 'normal') => {
    return Array.from({ length: size }, (_, i) => {
      switch (pattern) {
        case 'sql-injection':
          return `SELECT * FROM users WHERE id = ${i} OR 1=1`;
        case 'xss':
          return `<script>alert(${i})</script>`;
        case 'mixed':
          return i % 3 === 0 ? `malicious ${i}` : `normal ${i}`;
        default:
          return `test data ${i}`;
      }
    });
  },

  createMockCache: () => {
    const cache = new Map();
    return {
      get: (key) => cache.get(key),
      set: (key, value) => cache.set(key, value),
      clear: () => cache.clear(),
      size: () => cache.size,
    };
  },
};

// Set up performance monitoring
global.performanceMonitor = {
  marks: new Map(),

  mark: (name) => {
    const { performance } = require('perf_hooks');
    global.performanceMonitor.marks.set(name, performance.now());
  },

  measure: (name, startMark) => {
    const { performance } = require('perf_hooks');
    const start = global.performanceMonitor.marks.get(startMark);
    if (!start) {
      throw new Error(`Start mark '${startMark}' not found`);
    }
    return performance.now() - start;
  },

  clear: () => {
    global.performanceMonitor.marks.clear();
  },
};

// Clean up after each test
afterEach(() => {
  global.performanceMonitor.clear();

  // Force GC if available
  if (global.gc) {
    global.gc();
  }
});

console.log('🧪 Test environment initialized');
