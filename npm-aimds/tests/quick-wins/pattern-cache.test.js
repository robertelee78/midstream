/**
 * Pattern Cache Unit Tests
 * Tests LRU eviction, TTL expiration, concurrent access, and memory bounds
 */

const { performance } = require('perf_hooks');

// Mock PatternCache implementation for testing
class PatternCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 10000;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  _hash(pattern) {
    // Simple hash for testing
    return JSON.stringify(pattern);
  }

  get(pattern) {
    const key = this._hash(pattern);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access order (LRU)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    this.stats.hits++;
    return entry.result;
  }

  set(pattern, result) {
    const key = this._hash(pattern);

    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size
    };
  }

  estimateMemoryUsage() {
    // Rough estimate: key + value + overhead
    let bytes = 0;
    for (const [key, value] of this.cache.entries()) {
      bytes += key.length * 2; // UTF-16 chars
      bytes += JSON.stringify(value).length * 2;
      bytes += 100; // Map entry overhead
    }
    return bytes;
  }
}

describe('PatternCache', () => {
  let cache;

  beforeEach(() => {
    cache = new PatternCache({ maxSize: 100, ttl: 1000 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve patterns', () => {
      const pattern = { type: 'sql-injection', severity: 'high' };
      const result = { detected: true, confidence: 0.95 };

      cache.set(pattern, result);
      const retrieved = cache.get(pattern);

      expect(retrieved).toEqual(result);
    });

    test('should return null for cache miss', () => {
      const pattern = { type: 'xss', severity: 'medium' };
      const result = cache.get(pattern);

      expect(result).toBeNull();
    });

    test('should track cache hits and misses', () => {
      const pattern = { type: 'sql-injection' };
      cache.set(pattern, { detected: true });

      cache.get(pattern); // hit
      cache.get({ type: 'xss' }); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entry when at capacity', () => {
      const smallCache = new PatternCache({ maxSize: 3 });

      // Fill cache
      smallCache.set({ id: 1 }, 'result1');
      smallCache.set({ id: 2 }, 'result2');
      smallCache.set({ id: 3 }, 'result3');

      // Access pattern 2 to make it recently used
      smallCache.get({ id: 2 });

      // Add new entry, should evict pattern 1 (LRU)
      smallCache.set({ id: 4 }, 'result4');

      expect(smallCache.get({ id: 1 })).toBeNull(); // evicted
      expect(smallCache.get({ id: 2 })).toBe('result2'); // preserved
      expect(smallCache.get({ id: 3 })).toBe('result3'); // preserved
      expect(smallCache.get({ id: 4 })).toBe('result4'); // new entry

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
    });

    test('should maintain correct access order after multiple operations', () => {
      const smallCache = new PatternCache({ maxSize: 3 });

      smallCache.set({ id: 1 }, 'result1');
      smallCache.set({ id: 2 }, 'result2');
      smallCache.set({ id: 3 }, 'result3');

      // Access in order: 1, 3, 2 (making 1 the LRU)
      smallCache.get({ id: 1 });
      smallCache.get({ id: 3 });
      smallCache.get({ id: 2 });

      // Add new entry, should evict 1
      smallCache.set({ id: 4 }, 'result4');

      expect(smallCache.get({ id: 1 })).toBeNull();
      expect(smallCache.getStats().size).toBe(3);
    });
  });

  describe('TTL Expiration', () => {
    test('should remove entries after TTL expires', async () => {
      const shortTtlCache = new PatternCache({ ttl: 100 }); // 100ms TTL
      const pattern = { type: 'sql-injection' };

      shortTtlCache.set(pattern, { detected: true });

      // Should be cached initially
      expect(shortTtlCache.get(pattern)).not.toBeNull();

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(shortTtlCache.get(pattern)).toBeNull();
    });

    test('should count expired entries as cache misses', async () => {
      const shortTtlCache = new PatternCache({ ttl: 50 });
      shortTtlCache.set({ id: 1 }, 'result');

      await new Promise(resolve => setTimeout(resolve, 100));

      shortTtlCache.get({ id: 1 });
      const stats = shortTtlCache.getStats();

      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });
  });

  describe('Cache Hit Rate', () => {
    test('should calculate hit rate correctly', () => {
      for (let i = 0; i < 10; i++) {
        cache.set({ id: i }, `result${i}`);
      }

      // Generate hits (7 hits, 3 misses)
      for (let i = 0; i < 7; i++) {
        cache.get({ id: i }); // hits
      }
      for (let i = 10; i < 13; i++) {
        cache.get({ id: i }); // misses
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.7, 2);
    });

    test('should achieve >50% hit rate with realistic workload', () => {
      // Simulate 80/20 rule: 80% of requests for 20% of patterns
      const hotPatterns = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      const coldPatterns = Array.from({ length: 80 }, (_, i) => ({ id: i + 20 }));

      // Warm up cache
      hotPatterns.forEach(p => cache.set(p, 'hot-result'));
      coldPatterns.forEach(p => cache.set(p, 'cold-result'));

      // Generate workload (80% hot, 20% cold)
      for (let i = 0; i < 1000; i++) {
        const pattern = Math.random() < 0.8
          ? hotPatterns[Math.floor(Math.random() * hotPatterns.length)]
          : coldPatterns[Math.floor(Math.random() * coldPatterns.length)];
        cache.get(pattern);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.5);
    });
  });

  describe('Hash Collision Handling', () => {
    test('should handle patterns with same hash correctly', () => {
      const pattern1 = { a: 1, b: 2 };
      const pattern2 = { b: 2, a: 1 }; // Different order, same content

      cache.set(pattern1, 'result1');
      cache.set(pattern2, 'result2');

      // Should overwrite since hash is the same
      expect(cache.get(pattern1)).toBe('result2');
      expect(cache.getStats().size).toBe(1);
    });
  });

  describe('Concurrent Access Safety', () => {
    test('should handle concurrent reads and writes', async () => {
      const operations = [];

      // Simulate concurrent operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve().then(() => {
            cache.set({ id: i % 10 }, `result${i}`);
            cache.get({ id: i % 10 });
          })
        );
      }

      await Promise.all(operations);

      // Cache should be in valid state
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(100);
      expect(stats.hits + stats.misses).toBeGreaterThan(0);
    });

    test('should maintain consistency under concurrent access', async () => {
      const pattern = { type: 'test' };
      const promises = [];

      // 50 concurrent writes
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => cache.set(pattern, i))
        );
      }

      await Promise.all(promises);

      // Should have a valid result (last write wins)
      const result = cache.get(pattern);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    test('should stay within memory bounds', () => {
      const pattern = { type: 'sql-injection', content: 'SELECT * FROM users' };

      // Fill cache to capacity
      for (let i = 0; i < 100; i++) {
        cache.set({ ...pattern, id: i }, { detected: true, confidence: 0.95 });
      }

      const memoryUsage = cache.estimateMemoryUsage();
      const maxExpectedMemory = 1024 * 1024; // 1MB

      expect(memoryUsage).toBeLessThan(maxExpectedMemory);
      expect(cache.getStats().size).toBe(100);
    });

    test('should not grow unbounded', () => {
      const initialMemory = cache.estimateMemoryUsage();

      // Try to add more than capacity
      for (let i = 0; i < 200; i++) {
        cache.set({ id: i }, `result${i}`);
      }

      const finalMemory = cache.estimateMemoryUsage();
      expect(cache.getStats().size).toBe(100); // capped at maxSize
      expect(cache.getStats().evictions).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should have fast lookup times (<1ms)', () => {
      // Warm up
      for (let i = 0; i < 100; i++) {
        cache.set({ id: i }, `result${i}`);
      }

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cache.get({ id: i % 100 });
      }
      const duration = performance.now() - start;

      const avgLookupTime = duration / 1000;
      expect(avgLookupTime).toBeLessThan(1); // <1ms per lookup
    });

    test('should have fast insertion times (<1ms)', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cache.set({ id: i }, `result${i}`);
      }
      const duration = performance.now() - start;

      const avgInsertTime = duration / 1000;
      expect(avgInsertTime).toBeLessThan(1); // <1ms per insert
    });
  });

  describe('Clear and Reset', () => {
    test('should clear all entries and stats', () => {
      for (let i = 0; i < 10; i++) {
        cache.set({ id: i }, `result${i}`);
        cache.get({ id: i });
      }

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });
});
