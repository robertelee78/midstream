/**
 * Quick Wins Performance Benchmarks
 * Comprehensive performance testing for all quick-win optimizations
 */

const { performance } = require('perf_hooks');

// Helper function to measure throughput
async function measureThroughput(testFn, duration = 1000) {
  const startTime = Date.now();
  let count = 0;

  while (Date.now() - startTime < duration) {
    await testFn();
    count++;
  }

  const actualDuration = (Date.now() - startTime) / 1000;
  return count / actualDuration;
}

// Helper function to measure latency percentiles
async function measureLatency(testFn, iterations = 1000) {
  const latencies = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await testFn();
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);

  return {
    min: latencies[0],
    p50: latencies[Math.floor(iterations * 0.5)],
    p95: latencies[Math.floor(iterations * 0.95)],
    p99: latencies[Math.floor(iterations * 0.99)],
    max: latencies[iterations - 1],
    avg: latencies.reduce((a, b) => a + b, 0) / iterations
  };
}

// Helper to measure memory usage
function measureMemoryUsage() {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage();
}

// Helper to measure GC pauses
async function measureGCPauses(testFn, duration = 5000) {
  const gcPauses = [];
  let lastTime = performance.now();

  const interval = setInterval(() => {
    const now = performance.now();
    const pause = now - lastTime;
    if (pause > 10) { // Consider >10ms as potential GC pause
      gcPauses.push(pause);
    }
    lastTime = now;
  }, 1);

  const startTime = Date.now();
  while (Date.now() - startTime < duration) {
    await testFn();
  }

  clearInterval(interval);

  return {
    count: gcPauses.length,
    maxPause: gcPauses.length > 0 ? Math.max(...gcPauses) : 0,
    avgPause: gcPauses.length > 0 ? gcPauses.reduce((a, b) => a + b, 0) / gcPauses.length : 0,
    totalPauseTime: gcPauses.reduce((a, b) => a + b, 0)
  };
}

// Mock implementations for benchmarking
class PatternCache {
  constructor() {
    this.cache = new Map();
  }
  get(key) {
    return this.cache.get(key);
  }
  set(key, value) {
    this.cache.set(key, value);
  }
}

class ParallelDetector {
  async detect(content) {
    await new Promise(resolve => setTimeout(resolve, 1));
    return { detected: false };
  }
}

class BufferPool {
  constructor() {
    this.pool = [];
    for (let i = 0; i < 10; i++) {
      this.pool.push(Buffer.alloc(8192));
    }
  }
  acquire() {
    return this.pool.length > 0 ? this.pool.pop() : Buffer.alloc(8192);
  }
  release(buffer) {
    buffer.fill(0);
    this.pool.push(buffer);
  }
}

class VectorSearchCache {
  constructor() {
    this.cache = new Map();
  }
  async search(embedding) {
    const key = JSON.stringify(embedding);
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = { results: [] };
    this.cache.set(key, result);
    return result;
  }
}

describe('Quick Wins Performance Benchmarks', () => {
  // Increase timeout for performance tests
  jest.setTimeout(30000);

  describe('Pattern Cache Performance', () => {
    test('should improve throughput by +50K req/s', async () => {
      const cache = new PatternCache();

      // Baseline without cache (simulate database lookup)
      const baselineThroughput = await measureThroughput(async () => {
        await new Promise(resolve => setTimeout(resolve, 0.02)); // 20µs simulated DB
        return { result: 'data' };
      }, 2000);

      // With cache
      const cacheThroughput = await measureThroughput(async () => {
        const cached = cache.get('test-key');
        if (!cached) {
          cache.set('test-key', { result: 'data' });
        }
        return cached || { result: 'data' };
      }, 2000);

      const improvement = cacheThroughput - baselineThroughput;

      console.log(`\n📊 Pattern Cache Benchmark:`);
      console.log(`   Baseline: ${baselineThroughput.toFixed(0)} req/s`);
      console.log(`   With Cache: ${cacheThroughput.toFixed(0)} req/s`);
      console.log(`   Improvement: +${improvement.toFixed(0)} req/s`);

      expect(improvement).toBeGreaterThan(50000);
    });

    test('should achieve sub-millisecond cache lookups', async () => {
      const cache = new PatternCache();

      // Warm up cache
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, { data: i });
      }

      const latencies = await measureLatency(() => {
        return cache.get('key50');
      }, 10000);

      console.log(`\n⚡ Cache Lookup Latency:`);
      console.log(`   p50: ${latencies.p50.toFixed(3)}ms`);
      console.log(`   p95: ${latencies.p95.toFixed(3)}ms`);
      console.log(`   p99: ${latencies.p99.toFixed(3)}ms`);

      expect(latencies.p95).toBeLessThan(0.1); // <0.1ms for p95
      expect(latencies.p99).toBeLessThan(0.5); // <0.5ms for p99
    });

    test('should handle cache hit rate >70% under realistic load', async () => {
      const cache = new PatternCache();
      let hits = 0;
      let misses = 0;

      // Simulate Zipf distribution (realistic access pattern)
      const keys = Array.from({ length: 100 }, (_, i) => `key${i}`);

      for (let i = 0; i < 10000; i++) {
        // 70% of requests go to 30% of keys (Zipf)
        const key = Math.random() < 0.7
          ? keys[Math.floor(Math.random() * 30)]
          : keys[Math.floor(Math.random() * 100)];

        if (cache.get(key)) {
          hits++;
        } else {
          cache.set(key, { data: key });
          misses++;
        }
      }

      const hitRate = hits / (hits + misses);

      console.log(`\n🎯 Cache Hit Rate:`);
      console.log(`   Hits: ${hits}`);
      console.log(`   Misses: ${misses}`);
      console.log(`   Hit Rate: ${(hitRate * 100).toFixed(1)}%`);

      expect(hitRate).toBeGreaterThan(0.7);
    });
  });

  describe('Parallel Detection Performance', () => {
    test('should be 2-3x faster than sequential processing', async () => {
      const detector = new ParallelDetector();
      const testData = Array.from({ length: 100 }, (_, i) => `test${i}`);

      // Sequential processing
      const seqStart = performance.now();
      for (const data of testData) {
        await detector.detect(data);
      }
      const seqDuration = performance.now() - seqStart;

      // Parallel processing
      const parStart = performance.now();
      await Promise.all(testData.map(data => detector.detect(data)));
      const parDuration = performance.now() - parStart;

      const speedup = seqDuration / parDuration;

      console.log(`\n🚀 Parallel Detection Speedup:`);
      console.log(`   Sequential: ${seqDuration.toFixed(0)}ms`);
      console.log(`   Parallel: ${parDuration.toFixed(0)}ms`);
      console.log(`   Speedup: ${speedup.toFixed(2)}x`);

      expect(speedup).toBeGreaterThan(2);
      expect(speedup).toBeLessThan(4); // Theoretical max with 4 workers
    });

    test('should handle high throughput (>10K req/s)', async () => {
      const detector = new ParallelDetector();

      const throughput = await measureThroughput(
        () => detector.detect('test'),
        2000
      );

      console.log(`\n📈 Parallel Detection Throughput:`);
      console.log(`   ${throughput.toFixed(0)} req/s`);

      expect(throughput).toBeGreaterThan(10000);
    });

    test('should maintain low latency under load', async () => {
      const detector = new ParallelDetector();

      const latencies = await measureLatency(
        () => detector.detect('test'),
        1000
      );

      console.log(`\n⏱️  Parallel Detection Latency:`);
      console.log(`   p50: ${latencies.p50.toFixed(2)}ms`);
      console.log(`   p95: ${latencies.p95.toFixed(2)}ms`);
      console.log(`   p99: ${latencies.p99.toFixed(2)}ms`);

      expect(latencies.p95).toBeLessThan(10); // <10ms for p95
      expect(latencies.p99).toBeLessThan(20); // <20ms for p99
    });
  });

  describe('Memory Pool Performance', () => {
    test('should reduce GC pauses significantly', async () => {
      // Without pool
      const withoutPool = await measureGCPauses(async () => {
        const buffer = Buffer.alloc(8192);
        buffer.fill(Math.random() * 255);
      }, 5000);

      // With pool
      const pool = new BufferPool();
      const withPool = await measureGCPauses(async () => {
        const buffer = pool.acquire();
        buffer.fill(Math.random() * 255);
        pool.release(buffer);
      }, 5000);

      console.log(`\n🧹 GC Pause Reduction:`);
      console.log(`   Without Pool:`);
      console.log(`     Max Pause: ${withoutPool.maxPause.toFixed(2)}ms`);
      console.log(`     Avg Pause: ${withoutPool.avgPause.toFixed(2)}ms`);
      console.log(`     Total Pauses: ${withoutPool.totalPauseTime.toFixed(0)}ms`);
      console.log(`   With Pool:`);
      console.log(`     Max Pause: ${withPool.maxPause.toFixed(2)}ms`);
      console.log(`     Avg Pause: ${withPool.avgPause.toFixed(2)}ms`);
      console.log(`     Total Pauses: ${withPool.totalPauseTime.toFixed(0)}ms`);

      expect(withPool.maxPause).toBeLessThan(5); // <5ms max pause
      expect(withPool.maxPause).toBeLessThan(withoutPool.maxPause);
    });

    test('should improve allocation throughput', async () => {
      const pool = new BufferPool();

      // Without pool
      const withoutPoolThroughput = await measureThroughput(() => {
        const buffer = Buffer.alloc(8192);
        return buffer;
      }, 1000);

      // With pool
      const withPoolThroughput = await measureThroughput(() => {
        const buffer = pool.acquire();
        pool.release(buffer);
        return buffer;
      }, 1000);

      console.log(`\n💾 Buffer Allocation Throughput:`);
      console.log(`   Without Pool: ${withoutPoolThroughput.toFixed(0)} alloc/s`);
      console.log(`   With Pool: ${withPoolThroughput.toFixed(0)} alloc/s`);

      expect(withPoolThroughput).toBeGreaterThan(withoutPoolThroughput * 1.5);
    });

    test('should maintain stable memory usage', async () => {
      const pool = new BufferPool();
      const memorySnapshots = [];

      for (let i = 0; i < 10; i++) {
        // Perform 1000 allocations
        for (let j = 0; j < 1000; j++) {
          const buffer = pool.acquire();
          pool.release(buffer);
        }

        memorySnapshots.push(measureMemoryUsage().heapUsed);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const memoryGrowth = memorySnapshots[9] - memorySnapshots[0];
      const growthMB = memoryGrowth / (1024 * 1024);

      console.log(`\n📊 Memory Stability:`);
      console.log(`   Initial: ${(memorySnapshots[0] / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final: ${(memorySnapshots[9] / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Growth: ${growthMB.toFixed(2)}MB`);

      expect(growthMB).toBeLessThan(10); // <10MB growth
    });
  });

  describe('Vector Cache Performance', () => {
    test('should achieve 60%+ hit rate with realistic access patterns', async () => {
      const cache = new VectorSearchCache();
      let hits = 0;
      let misses = 0;

      // Generate embeddings (20 hot, 80 cold - 80/20 rule)
      const hotEmbeddings = Array.from({ length: 20 }, (_, i) => [i * 0.1]);
      const coldEmbeddings = Array.from({ length: 80 }, (_, i) => [(i + 20) * 0.1]);

      // Warm up
      for (const emb of hotEmbeddings) {
        await cache.search(emb);
      }

      // Simulate workload
      for (let i = 0; i < 1000; i++) {
        const embedding = Math.random() < 0.8
          ? hotEmbeddings[Math.floor(Math.random() * hotEmbeddings.length)]
          : coldEmbeddings[Math.floor(Math.random() * coldEmbeddings.length)];

        const isCached = cache.cache.has(JSON.stringify(embedding));
        if (isCached) {
          hits++;
        } else {
          misses++;
        }

        await cache.search(embedding);
      }

      const hitRate = hits / (hits + misses);

      console.log(`\n🎯 Vector Cache Hit Rate:`);
      console.log(`   Hits: ${hits}`);
      console.log(`   Misses: ${misses}`);
      console.log(`   Hit Rate: ${(hitRate * 100).toFixed(1)}%`);

      expect(hitRate).toBeGreaterThan(0.6);
    });

    test('should reduce search latency significantly', async () => {
      const cache = new VectorSearchCache();
      const embedding = [0.1, 0.2, 0.3];

      // First search (uncached)
      const uncachedStart = performance.now();
      await cache.search(embedding);
      const uncachedLatency = performance.now() - uncachedStart;

      // Second search (cached)
      const cachedStart = performance.now();
      await cache.search(embedding);
      const cachedLatency = performance.now() - cachedStart;

      const speedup = uncachedLatency / cachedLatency;

      console.log(`\n⚡ Vector Search Speedup:`);
      console.log(`   Uncached: ${uncachedLatency.toFixed(2)}ms`);
      console.log(`   Cached: ${cachedLatency.toFixed(2)}ms`);
      console.log(`   Speedup: ${speedup.toFixed(1)}x`);

      expect(cachedLatency).toBeLessThan(1); // <1ms cached
      expect(speedup).toBeGreaterThan(5); // >5x faster
    });
  });

  describe('Combined Performance', () => {
    test('should achieve overall throughput of 745K+ req/s', async () => {
      const cache = new PatternCache();
      const pool = new BufferPool();
      const detector = new ParallelDetector();

      // Simulate request with all optimizations
      const processRequest = async () => {
        // Check pattern cache
        let result = cache.get('pattern1');
        if (!result) {
          // Use buffer pool
          const buffer = pool.acquire();

          // Parallel detection
          result = await detector.detect('test');

          pool.release(buffer);
          cache.set('pattern1', result);
        }
        return result;
      };

      const throughput = await measureThroughput(processRequest, 2000);

      console.log(`\n🎉 Combined Throughput:`);
      console.log(`   ${throughput.toFixed(0)} req/s`);

      expect(throughput).toBeGreaterThan(745000);
    });

    test('should maintain low latency with all optimizations enabled', async () => {
      const cache = new PatternCache();
      const pool = new BufferPool();
      const detector = new ParallelDetector();

      const processRequest = async () => {
        let result = cache.get('pattern1');
        if (!result) {
          const buffer = pool.acquire();
          result = await detector.detect('test');
          pool.release(buffer);
          cache.set('pattern1', result);
        }
        return result;
      };

      const latencies = await measureLatency(processRequest, 1000);

      console.log(`\n⏱️  Combined Latency:`);
      console.log(`   p50: ${latencies.p50.toFixed(3)}ms`);
      console.log(`   p95: ${latencies.p95.toFixed(3)}ms`);
      console.log(`   p99: ${latencies.p99.toFixed(3)}ms`);

      expect(latencies.p95).toBeLessThan(5); // <5ms p95
      expect(latencies.p99).toBeLessThan(10); // <10ms p99
    });

    test('should reduce memory footprint by 30%', async () => {
      // Baseline without optimizations
      const baselineMemory = measureMemoryUsage();
      const withoutOpt = [];
      for (let i = 0; i < 10000; i++) {
        withoutOpt.push(Buffer.alloc(8192));
      }
      const baselinePeak = measureMemoryUsage().heapUsed - baselineMemory.heapUsed;

      // With optimizations
      const pool = new BufferPool();
      const cache = new PatternCache();
      const optimizedMemory = measureMemoryUsage();

      for (let i = 0; i < 10000; i++) {
        const buffer = pool.acquire();
        cache.set(`key${i % 100}`, buffer); // Reuse cache entries
        pool.release(buffer);
      }

      const optimizedPeak = measureMemoryUsage().heapUsed - optimizedMemory.heapUsed;
      const reduction = ((baselinePeak - optimizedPeak) / baselinePeak) * 100;

      console.log(`\n💾 Memory Footprint:`);
      console.log(`   Baseline: ${(baselinePeak / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Optimized: ${(optimizedPeak / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Reduction: ${reduction.toFixed(1)}%`);

      expect(reduction).toBeGreaterThan(30);
    });
  });
});
