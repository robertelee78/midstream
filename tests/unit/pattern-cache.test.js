/**
 * Pattern Cache Unit Tests
 *
 * Comprehensive test suite for AI Defence 2.0 Pattern Cache
 * Tests LRU eviction, TTL expiration, hit/miss tracking, and memory usage
 */

const { PatternCache } = require('../../npm-aimds/src/proxy/pattern-cache');

describe('PatternCache', () => {
  describe('Constructor', () => {
    test('should create cache with default values', () => {
      const cache = new PatternCache();
      const stats = cache.stats();

      expect(stats.maxSize).toBe(10000);
      expect(stats.ttlMs).toBe(3600000);
      expect(stats.size).toBe(0);
    });

    test('should create cache with custom values', () => {
      const cache = new PatternCache(5000, 1800000);
      const stats = cache.stats();

      expect(stats.maxSize).toBe(5000);
      expect(stats.ttlMs).toBe(1800000);
    });
  });

  describe('Basic Operations', () => {
    let cache;

    beforeEach(() => {
      cache = new PatternCache(100, 60000); // Small cache for testing
    });

    test('should hash text consistently', () => {
      const text = 'test input';
      const hash1 = cache.hash(text);
      const hash2 = cache.hash(text);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    test('should store and retrieve values', () => {
      const text = 'malicious prompt injection';
      const result = {
        threats: [{ type: 'injection', severity: 'high' }],
        shouldBlock: true
      };

      cache.set(text, result);
      const retrieved = cache.get(text);

      expect(retrieved).toBeTruthy();
      expect(retrieved.threats).toEqual(result.threats);
      expect(retrieved.shouldBlock).toBe(true);
      expect(retrieved.fromCache).toBe(true);
    });

    test('should return null for non-existent entries', () => {
      const result = cache.get('non-existent text');
      expect(result).toBeNull();
    });

    test('should update hit/miss counters', () => {
      cache.set('test', { value: 1 });

      cache.get('test'); // Hit
      cache.get('test'); // Hit
      cache.get('missing'); // Miss
      cache.get('missing'); // Miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe('50.00%');
    });

    test('should check existence without affecting hit count', () => {
      cache.set('test', { value: 1 });

      expect(cache.has('test')).toBe(true);
      expect(cache.has('missing')).toBe(false);

      const stats = cache.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    test('should delete entries', () => {
      cache.set('test', { value: 1 });
      expect(cache.has('test')).toBe(true);

      cache.delete('test');
      expect(cache.has('test')).toBe(false);
    });

    test('should clear all entries', () => {
      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });
      cache.set('test3', { value: 3 });

      expect(cache.stats().size).toBe(3);

      cache.clear();

      expect(cache.stats().size).toBe(0);
      expect(cache.stats().hits).toBe(0);
      expect(cache.stats().misses).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict oldest entry when at capacity', () => {
      const cache = new PatternCache(3, 60000); // Max 3 entries

      cache.set('entry1', { value: 1 });
      cache.set('entry2', { value: 2 });
      cache.set('entry3', { value: 3 });

      expect(cache.stats().size).toBe(3);
      expect(cache.has('entry1')).toBe(true);

      // Adding 4th entry should evict entry1
      cache.set('entry4', { value: 4 });

      expect(cache.stats().size).toBe(3);
      expect(cache.has('entry1')).toBe(false);
      expect(cache.has('entry4')).toBe(true);
      expect(cache.stats().evictions).toBe(1);
    });

    test('should update LRU order on access', () => {
      const cache = new PatternCache(3, 60000);

      cache.set('entry1', { value: 1 });
      cache.set('entry2', { value: 2 });
      cache.set('entry3', { value: 3 });

      // Access entry1 to make it most recently used
      cache.get('entry1');

      // Add entry4, should evict entry2 (least recently used)
      cache.set('entry4', { value: 4 });

      expect(cache.has('entry1')).toBe(true); // Still exists (recently accessed)
      expect(cache.has('entry2')).toBe(false); // Evicted
      expect(cache.has('entry3')).toBe(true);
      expect(cache.has('entry4')).toBe(true);
    });

    test('should track eviction count', () => {
      const cache = new PatternCache(2, 60000);

      cache.set('entry1', { value: 1 });
      cache.set('entry2', { value: 2 });
      cache.set('entry3', { value: 3 }); // Evicts entry1
      cache.set('entry4', { value: 4 }); // Evicts entry2

      expect(cache.stats().evictions).toBe(2);
    });
  });

  describe('TTL Expiration', () => {
    test('should expire entries after TTL', async () => {
      const cache = new PatternCache(100, 100); // 100ms TTL

      cache.set('test', { value: 1 });
      expect(cache.has('test')).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cache.has('test')).toBe(false);
    });

    test('should return null for expired entries on get', async () => {
      const cache = new PatternCache(100, 100);

      cache.set('test', { value: 1 });
      expect(cache.get('test')).toBeTruthy();

      await new Promise(resolve => setTimeout(resolve, 150));

      const result = cache.get('test');
      expect(result).toBeNull();
    });

    test('should track expirations', async () => {
      const cache = new PatternCache(100, 100);

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });

      await new Promise(resolve => setTimeout(resolve, 150));

      cache.get('test1'); // Should trigger expiration
      cache.get('test2'); // Should trigger expiration

      const stats = cache.stats();
      expect(stats.expirations).toBe(2);
      expect(stats.misses).toBe(2);
    });

    test('should prune expired entries manually', async () => {
      const cache = new PatternCache(100, 100);

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });
      cache.set('test3', { value: 3 });

      await new Promise(resolve => setTimeout(resolve, 150));

      const pruned = cache.prune();

      expect(pruned).toBe(3);
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate hit rate correctly', () => {
      const cache = new PatternCache();

      cache.set('test', { value: 1 });

      for (let i = 0; i < 7; i++) cache.get('test'); // 7 hits
      for (let i = 0; i < 3; i++) cache.get('missing'); // 3 misses

      const stats = cache.stats();
      expect(stats.hits).toBe(7);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe('70.00%'); // 7/10 = 70%
    });

    test('should track memory usage', () => {
      const cache = new PatternCache();

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });
      cache.set('test3', { value: 3 });

      const stats = cache.stats();
      // Memory usage is estimated, should be present
      expect(stats.memoryUsageMB).toBeDefined();
      expect(stats.memoryUsageBytes).toBeGreaterThan(0);
      expect(parseFloat(stats.memoryUsageMB)).toBeGreaterThanOrEqual(0);
    });

    test('should provide fill rate', () => {
      const cache = new PatternCache(10, 60000);

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });
      cache.set('test3', { value: 3 });
      cache.set('test4', { value: 4 });
      cache.set('test5', { value: 5 });

      const stats = cache.stats();
      expect(stats.fillRate).toBe('50.00%'); // 5/10 = 50%
    });

    test('should provide performance report', () => {
      const cache = new PatternCache();
      cache.set('test', { value: 1 });
      cache.get('test');

      const report = cache.getPerformanceReport();

      expect(report).toHaveProperty('cacheEfficiency');
      expect(report).toHaveProperty('entryMetrics');
      expect(report).toHaveProperty('recommendations');
      expect(report.cacheEfficiency.hitRate).toBeGreaterThan(0);
    });

    test('should generate recommendations', () => {
      const cache = new PatternCache(10, 60000);

      // Create high hit rate scenario
      cache.set('test', { value: 1 });
      for (let i = 0; i < 10; i++) cache.get('test'); // 10 hits
      cache.get('missing'); // 1 miss

      const report = cache.getPerformanceReport();
      const recommendations = report.recommendations;

      expect(recommendations).toContain('Excellent hit rate (≥70%). Cache is performing optimally.');
    });
  });

  describe('Memory Management', () => {
    test('should stay within memory limit for 10K entries', () => {
      const cache = new PatternCache(10000, 3600000);

      // Fill cache with 10K entries
      for (let i = 0; i < 10000; i++) {
        cache.set(`test-${i}`, {
          threats: [{ type: 'test', severity: 'low' }],
          shouldBlock: false
        });
      }

      const stats = cache.stats();
      const memoryMB = parseFloat(stats.memoryUsageMB);

      expect(stats.size).toBe(10000);
      expect(memoryMB).toBeLessThan(100); // Must be under 100MB
    });

    test('should estimate average entry size', () => {
      const cache = new PatternCache();

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });

      const stats = cache.stats();
      expect(parseInt(stats.avgEntrySize)).toBeGreaterThan(0);
    });
  });

  describe('Advanced Features', () => {
    test('should warm up cache with patterns', () => {
      const cache = new PatternCache();

      const patterns = [
        { text: 'pattern1', result: { value: 1 } },
        { text: 'pattern2', result: { value: 2 } },
        { text: 'pattern3', result: { value: 3 } }
      ];

      cache.warmUp(patterns);

      expect(cache.stats().size).toBe(3);
      expect(cache.has('pattern1')).toBe(true);
      expect(cache.has('pattern2')).toBe(true);
      expect(cache.has('pattern3')).toBe(true);
    });

    test('should export cache state', () => {
      const cache = new PatternCache(100, 60000);

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });

      const exported = cache.export();

      expect(exported).toHaveProperty('config');
      expect(exported).toHaveProperty('stats');
      expect(exported).toHaveProperty('entries');
      expect(exported.config.maxSize).toBe(100);
      expect(exported.entries).toHaveLength(2);
    });

    test('should import cache state', () => {
      const cache1 = new PatternCache(100, 60000);
      cache1.set('test1', { value: 1 });
      cache1.set('test2', { value: 2 });

      const exported = cache1.export();

      const cache2 = new PatternCache();
      cache2.import(exported);

      expect(cache2.stats().size).toBe(2);
      expect(cache2.has('test1')).toBe(true);
      expect(cache2.has('test2')).toBe(true);
    });

    test('should not import expired entries', async () => {
      const cache1 = new PatternCache(100, 100); // 100ms TTL
      cache1.set('test', { value: 1 });

      await new Promise(resolve => setTimeout(resolve, 150));

      const exported = cache1.export();

      const cache2 = new PatternCache();
      cache2.import(exported);

      expect(cache2.stats().size).toBe(0);
    });

    test('should include cache age in results', () => {
      const cache = new PatternCache();
      cache.set('test', { value: 1 });

      const result = cache.get('test');

      expect(result).toHaveProperty('cachedAt');
      expect(result).toHaveProperty('cacheAge');
      expect(result.fromCache).toBe(true);
      expect(result.cacheAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty cache stats', () => {
      const cache = new PatternCache();
      const stats = cache.stats();

      expect(stats.hitRate).toBe('0.00%');
      expect(stats.size).toBe(0);
    });

    test('should handle large text inputs', () => {
      const cache = new PatternCache();
      const largeText = 'a'.repeat(10000);

      cache.set(largeText, { value: 1 });
      const result = cache.get(largeText);

      expect(result).toBeTruthy();
      expect(result.value).toBe(1);
    });

    test('should handle special characters in text', () => {
      const cache = new PatternCache();
      const specialText = '特殊字符 🚀 emoji \n\r\t unicode';

      cache.set(specialText, { value: 1 });
      const result = cache.get(specialText);

      expect(result).toBeTruthy();
    });

    test('should handle cache at exactly max size', () => {
      const cache = new PatternCache(2, 60000);

      cache.set('test1', { value: 1 });
      cache.set('test2', { value: 2 });

      expect(cache.stats().size).toBe(2);
      expect(cache.stats().evictions).toBe(0);

      cache.set('test3', { value: 3 });

      expect(cache.stats().size).toBe(2);
      expect(cache.stats().evictions).toBe(1);
    });
  });

  describe('Integration with Detection Engine', () => {
    test('should cache detection results', () => {
      const cache = new PatternCache();

      const detectionResult = {
        threats: [
          { type: 'injection', severity: 'high', confidence: 0.9 }
        ],
        severity: 'high',
        shouldBlock: true,
        detectionTime: 5.23,
        detectionMethod: 'vector_search'
      };

      cache.set('malicious input', detectionResult);
      const cached = cache.get('malicious input');

      expect(cached.threats).toHaveLength(1);
      expect(cached.shouldBlock).toBe(true);
      expect(cached.fromCache).toBe(true);
    });

    test('should improve throughput with cache hits', () => {
      const cache = new PatternCache();
      const input = 'test pattern';
      const result = { value: 1, detectionTime: 10 };

      // First request (cache miss)
      cache.set(input, result);
      const miss = cache.get('other input');
      expect(miss).toBeNull();

      // Subsequent requests (cache hits)
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.get(input);
      }
      const duration = Date.now() - start;

      const stats = cache.stats();
      expect(stats.hits).toBe(1000);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});
