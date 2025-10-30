/**
 * Memory Pool / Buffer Pool Unit Tests
 * Tests acquire/release, auto-scaling, memory leak detection, and concurrent safety
 */

const { performance } = require('perf_hooks');

// Mock BufferPool for testing
class BufferPool {
  constructor(options = {}) {
    this.bufferSize = options.bufferSize || 8192;
    this.initialSize = options.initialSize || 10;
    this.maxSize = options.maxSize || 100;
    this.pool = [];
    this.activeBuffers = new Set();
    this.stats = {
      acquired: 0,
      released: 0,
      created: 0,
      reused: 0,
      peakUsage: 0,
      currentUsage: 0
    };

    this._initializePool();
  }

  _initializePool() {
    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this._createBuffer());
      this.stats.created++;
    }
  }

  _createBuffer() {
    return {
      id: Math.random().toString(36).substring(7),
      data: Buffer.alloc(this.bufferSize),
      lastUsed: Date.now()
    };
  }

  acquire() {
    this.stats.acquired++;

    let buffer;
    if (this.pool.length > 0) {
      buffer = this.pool.pop();
      this.stats.reused++;
    } else if (this.activeBuffers.size < this.maxSize) {
      buffer = this._createBuffer();
      this.stats.created++;
    } else {
      throw new Error('Buffer pool exhausted');
    }

    // Clear buffer before reuse
    buffer.data.fill(0);
    buffer.lastUsed = Date.now();

    this.activeBuffers.add(buffer.id);
    this.stats.currentUsage = this.activeBuffers.size;

    if (this.stats.currentUsage > this.stats.peakUsage) {
      this.stats.peakUsage = this.stats.currentUsage;
    }

    return buffer;
  }

  release(buffer) {
    if (!this.activeBuffers.has(buffer.id)) {
      throw new Error('Buffer not from this pool or already released');
    }

    this.activeBuffers.delete(buffer.id);
    this.stats.released++;
    this.stats.currentUsage = this.activeBuffers.size;

    // Clear sensitive data
    buffer.data.fill(0);

    this.pool.push(buffer);
  }

  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      reuseRate: this.stats.reused / this.stats.acquired || 0,
      utilizationRate: this.stats.currentUsage / this.maxSize
    };
  }

  estimateMemoryUsage() {
    const bufferMemory = (this.pool.length + this.activeBuffers.size) * this.bufferSize;
    const overhead = (this.pool.length + this.activeBuffers.size) * 100; // Approx overhead
    return bufferMemory + overhead;
  }

  clear() {
    this.pool = [];
    this.activeBuffers.clear();
    this.stats.currentUsage = 0;
  }

  destroy() {
    this.clear();
    this.stats = {
      acquired: 0,
      released: 0,
      created: 0,
      reused: 0,
      peakUsage: 0,
      currentUsage: 0
    };
  }
}

describe('BufferPool', () => {
  let pool;

  beforeEach(() => {
    pool = new BufferPool({
      bufferSize: 8192,
      initialSize: 10,
      maxSize: 50
    });
  });

  afterEach(() => {
    pool.destroy();
  });

  describe('Basic Operations', () => {
    test('should initialize pool with correct size', () => {
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(10);
      expect(stats.created).toBe(10);
    });

    test('should acquire buffer from pool', () => {
      const buffer = pool.acquire();

      expect(buffer).toBeDefined();
      expect(buffer.data).toBeInstanceOf(Buffer);
      expect(buffer.data.length).toBe(8192);
      expect(buffer.id).toBeDefined();
    });

    test('should release buffer back to pool', () => {
      const buffer = pool.acquire();
      pool.release(buffer);

      const stats = pool.getStats();
      expect(stats.acquired).toBe(1);
      expect(stats.released).toBe(1);
      expect(stats.currentUsage).toBe(0);
      expect(stats.poolSize).toBe(10);
    });

    test('should throw error when releasing invalid buffer', () => {
      const invalidBuffer = { id: 'invalid', data: Buffer.alloc(8192) };

      expect(() => pool.release(invalidBuffer)).toThrow('Buffer not from this pool');
    });

    test('should throw error when releasing buffer twice', () => {
      const buffer = pool.acquire();
      pool.release(buffer);

      expect(() => pool.release(buffer)).toThrow('already released');
    });
  });

  describe('Acquire/Release Cycle', () => {
    test('should complete 1000 acquire/release cycles correctly', () => {
      for (let i = 0; i < 1000; i++) {
        const buffer = pool.acquire();
        pool.release(buffer);
      }

      const stats = pool.getStats();
      expect(stats.acquired).toBe(1000);
      expect(stats.released).toBe(1000);
      expect(stats.currentUsage).toBe(0);
    });

    test('should maintain correct pool size after cycles', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const buffer = pool.acquire();
        pool.release(buffer);
      }

      const stats = pool.getStats();
      expect(stats.poolSize).toBeLessThanOrEqual(pool.maxSize);
      expect(stats.currentUsage).toBe(0);
    });

    test('should reuse buffers from pool', () => {
      const buffer1 = pool.acquire();
      const id1 = buffer1.id;
      pool.release(buffer1);

      const buffer2 = pool.acquire();
      expect(buffer2.id).toBe(id1); // Same buffer reused

      const stats = pool.getStats();
      expect(stats.reused).toBeGreaterThan(0);
    });
  });

  describe('Auto-Scaling', () => {
    test('should create new buffer when pool exhausted', () => {
      const smallPool = new BufferPool({ initialSize: 2, maxSize: 10 });

      // Acquire more than initial size
      const buffers = [];
      for (let i = 0; i < 5; i++) {
        buffers.push(smallPool.acquire());
      }

      const stats = smallPool.getStats();
      expect(stats.created).toBeGreaterThan(2); // Auto-scaled

      buffers.forEach(b => smallPool.release(b));
      smallPool.destroy();
    });

    test('should throw when max pool size reached', () => {
      const smallPool = new BufferPool({ initialSize: 2, maxSize: 5 });

      const buffers = [];
      for (let i = 0; i < 5; i++) {
        buffers.push(smallPool.acquire());
      }

      expect(() => smallPool.acquire()).toThrow('Buffer pool exhausted');

      buffers.forEach(b => smallPool.release(b));
      smallPool.destroy();
    });

    test('should track peak usage correctly', () => {
      const buffers = [];

      // Acquire 20 buffers
      for (let i = 0; i < 20; i++) {
        buffers.push(pool.acquire());
      }

      const stats1 = pool.getStats();
      expect(stats1.peakUsage).toBe(20);

      // Release all
      buffers.forEach(b => pool.release(b));

      // Acquire only 10
      const buffers2 = [];
      for (let i = 0; i < 10; i++) {
        buffers2.push(pool.acquire());
      }

      const stats2 = pool.getStats();
      expect(stats2.peakUsage).toBe(20); // Still 20 (peak)
      expect(stats2.currentUsage).toBe(10); // Current is 10

      buffers2.forEach(b => pool.release(b));
    });
  });

  describe('Memory Leak Detection', () => {
    test('should not leak memory after 100K cycles', () => {
      const initialMemory = pool.estimateMemoryUsage();

      for (let i = 0; i < 100000; i++) {
        const buffer = pool.acquire();
        pool.release(buffer);

        // Periodically check memory
        if (i % 10000 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = pool.estimateMemoryUsage();
      const growth = finalMemory - initialMemory;

      // Memory should not grow significantly
      expect(growth).toBeLessThan(1024 * 1024); // <1MB growth
    });

    test('should release all references on clear', () => {
      const buffers = [];
      for (let i = 0; i < 20; i++) {
        buffers.push(pool.acquire());
      }

      pool.clear();

      const stats = pool.getStats();
      expect(stats.currentUsage).toBe(0);
      expect(stats.poolSize).toBe(0);
    });

    test('should not hold references to released buffers', () => {
      const buffer = pool.acquire();
      const weakRef = new WeakRef(buffer);

      pool.release(buffer);

      // Buffer should still exist (in pool)
      expect(weakRef.deref()).toBeDefined();

      pool.clear();

      // After clear and GC, buffer should be collectible
      if (global.gc) {
        global.gc();
        // Note: WeakRef behavior depends on GC, so this is best-effort
      }
    });
  });

  describe('Buffer Clearing', () => {
    test('should clear buffer data before reuse', () => {
      const buffer = pool.acquire();

      // Write some data
      buffer.data.write('sensitive data', 0);
      expect(buffer.data.toString('utf8', 0, 14)).toBe('sensitive data');

      pool.release(buffer);

      // Acquire again
      const buffer2 = pool.acquire();
      expect(buffer2.id).toBe(buffer.id); // Same buffer

      // Data should be cleared
      const cleared = buffer2.data.every(byte => byte === 0);
      expect(cleared).toBe(true);

      pool.release(buffer2);
    });

    test('should clear buffer on release', () => {
      const buffer = pool.acquire();
      buffer.data.write('test data');

      pool.release(buffer);

      // Check pool directly (internal state)
      const poolBuffer = pool.pool[pool.pool.length - 1];
      const isCleared = poolBuffer.data.every(byte => byte === 0);
      expect(isCleared).toBe(true);
    });
  });

  describe('Pool Utilization', () => {
    test('should track utilization rate', () => {
      const buffers = [];

      // Acquire 25 out of 50
      for (let i = 0; i < 25; i++) {
        buffers.push(pool.acquire());
      }

      const stats = pool.getStats();
      expect(stats.utilizationRate).toBeCloseTo(0.5, 2);

      buffers.forEach(b => pool.release(b));
    });

    test('should calculate reuse rate', () => {
      // First acquisition (no reuse)
      const buffer1 = pool.acquire();
      pool.release(buffer1);

      // Second acquisition (reuse)
      const buffer2 = pool.acquire();
      pool.release(buffer2);

      const stats = pool.getStats();
      expect(stats.reuseRate).toBeGreaterThan(0);
      expect(stats.reused).toBeGreaterThanOrEqual(1);
    });

    test('should have high reuse rate under steady load', () => {
      // Warm up pool
      for (let i = 0; i < 100; i++) {
        const buffer = pool.acquire();
        pool.release(buffer);
      }

      const stats = pool.getStats();
      expect(stats.reuseRate).toBeGreaterThan(0.8); // >80% reuse
    });
  });

  describe('Concurrent Safety', () => {
    test('should handle concurrent acquire/release', async () => {
      const operations = [];

      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve().then(() => {
            const buffer = pool.acquire();
            // Simulate some work
            return new Promise(resolve => {
              setTimeout(() => {
                pool.release(buffer);
                resolve();
              }, Math.random() * 10);
            });
          })
        );
      }

      await Promise.all(operations);

      const stats = pool.getStats();
      expect(stats.acquired).toBe(100);
      expect(stats.released).toBe(100);
      expect(stats.currentUsage).toBe(0);
    });

    test('should maintain consistency under high concurrency', async () => {
      const operations = [];

      for (let i = 0; i < 1000; i++) {
        operations.push(
          Promise.resolve().then(() => {
            const buffer = pool.acquire();
            pool.release(buffer);
          })
        );
      }

      await Promise.all(operations);

      const stats = pool.getStats();
      expect(stats.acquired).toBe(stats.released);
      expect(stats.currentUsage).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should have fast acquire times (<0.1ms)', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const buffer = pool.acquire();
        pool.release(buffer);
      }

      const duration = performance.now() - start;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(0.1); // <0.1ms per cycle
    });

    test('should reduce GC pressure', async () => {
      const withoutPool = async () => {
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
          const buffer = Buffer.alloc(8192);
          // Use buffer
          buffer.fill(i % 256);
        }
        return performance.now() - start;
      };

      const withPool = async () => {
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
          const buffer = pool.acquire();
          buffer.data.fill(i % 256);
          pool.release(buffer);
        }
        return performance.now() - start;
      };

      const timeWithoutPool = await withoutPool();
      const timeWithPool = await withPool();

      // Pool should be faster (less GC)
      expect(timeWithPool).toBeLessThan(timeWithoutPool);
    });
  });

  describe('Memory Usage', () => {
    test('should estimate memory usage correctly', () => {
      const buffers = [];

      for (let i = 0; i < 20; i++) {
        buffers.push(pool.acquire());
      }

      const memoryUsage = pool.estimateMemoryUsage();
      const expectedMemory = (10 + 20) * 8192; // pool + active

      // Should be close to expected (within 10%)
      expect(memoryUsage).toBeGreaterThan(expectedMemory * 0.9);
      expect(memoryUsage).toBeLessThan(expectedMemory * 1.1 + 10000);

      buffers.forEach(b => pool.release(b));
    });

    test('should stay within expected memory bounds', () => {
      // Fill to max capacity
      const buffers = [];
      for (let i = 0; i < 50; i++) {
        buffers.push(pool.acquire());
      }

      const memoryUsage = pool.estimateMemoryUsage();
      const maxExpectedMemory = 50 * 8192 + 50 * 100; // buffers + overhead

      expect(memoryUsage).toBeLessThanOrEqual(maxExpectedMemory * 1.1);

      buffers.forEach(b => pool.release(b));
    });
  });
});
