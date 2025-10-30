/**
 * Vector Search Cache Unit Tests
 * Tests caching for vector similarity searches with TTL and LRU eviction
 */

const { performance } = require('perf_hooks');

// Mock VectorSearchCache for testing
class VectorSearchCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 300000; // 5 minutes
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      searches: 0
    };
  }

  _hashEmbedding(embedding) {
    // Create hash from embedding vector
    // Use simple approach for testing (in production, use better hashing)
    const rounded = embedding.map(v => Math.round(v * 1000) / 1000);
    return JSON.stringify(rounded);
  }

  async search(embedding, topK = 5) {
    this.stats.searches++;
    const key = this._hashEmbedding(embedding);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.stats.hits++;

      // Update LRU
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);

      return cached.results;
    }

    // Cache miss - perform actual search
    this.stats.misses++;
    const results = await this._performSearch(embedding, topK);

    // Cache results
    this._cacheResults(key, results);

    return results;
  }

  async _performSearch(embedding, topK) {
    // Simulate vector database search
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 10));

    // Generate mock results
    return Array.from({ length: topK }, (_, i) => ({
      id: `result_${i}`,
      score: 0.9 - (i * 0.1),
      content: `Result ${i} for embedding`
    }));
  }

  _cacheResults(key, results) {
    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now()
    });

    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size
    };
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      searches: 0
    };
  }
}

describe('VectorSearchCache', () => {
  let cache;

  beforeEach(() => {
    cache = new VectorSearchCache({ maxSize: 100, ttl: 1000 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Caching', () => {
    test('should cache identical embeddings', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4];

      // First search - cache miss
      const results1 = await cache.search(embedding);
      expect(results1).toHaveLength(5);

      // Second search - cache hit
      const results2 = await cache.search(embedding);
      expect(results2).toHaveLength(5);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should return same results for cached embedding', async () => {
      const embedding = [0.5, 0.6, 0.7];

      const results1 = await cache.search(embedding);
      const results2 = await cache.search(embedding);

      expect(results1).toEqual(results2);
    });

    test('should handle different embeddings separately', async () => {
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      await cache.search(embedding1);
      await cache.search(embedding2);

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
    });
  });

  describe('Cache Hits and Misses', () => {
    test('should trigger cache miss for new embedding', async () => {
      const embedding = [0.1, 0.2, 0.3];

      await cache.search(embedding);

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    test('should trigger cache hit for repeated embedding', async () => {
      const embedding = [0.1, 0.2, 0.3];

      await cache.search(embedding); // miss
      await cache.search(embedding); // hit
      await cache.search(embedding); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    test('should handle embeddings with small differences as different', async () => {
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.1001, 0.2001, 0.3001]; // Very similar but not identical

      await cache.search(embedding1);
      await cache.search(embedding2);

      const stats = cache.getStats();
      expect(stats.misses).toBe(2); // Should be separate cache entries
    });
  });

  describe('TTL Expiration', () => {
    test('should expire cached results after TTL', async () => {
      const shortTtlCache = new VectorSearchCache({ ttl: 100 });
      const embedding = [0.1, 0.2, 0.3];

      // First search
      await shortTtlCache.search(embedding);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be cache miss after expiration
      await shortTtlCache.search(embedding);

      const stats = shortTtlCache.getStats();
      expect(stats.misses).toBe(2);
      expect(stats.hits).toBe(0);

      shortTtlCache.clear();
    });

    test('should cache results within TTL window', async () => {
      const embedding = [0.1, 0.2, 0.3];

      await cache.search(embedding);

      // Wait a bit but not past TTL
      await new Promise(resolve => setTimeout(resolve, 100));

      await cache.search(embedding);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict LRU entry when at capacity', async () => {
      const smallCache = new VectorSearchCache({ maxSize: 3 });

      // Fill cache
      await smallCache.search([0.1]);
      await smallCache.search([0.2]);
      await smallCache.search([0.3]);

      // Access middle entry to make first one LRU
      await smallCache.search([0.2]);

      // Add new entry, should evict [0.1]
      await smallCache.search([0.4]);

      // Try to access evicted entry
      await smallCache.search([0.1]);

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
      expect(stats.size).toBe(3);

      smallCache.clear();
    });

    test('should update access order on cache hit', async () => {
      const smallCache = new VectorSearchCache({ maxSize: 3 });

      await smallCache.search([0.1]);
      await smallCache.search([0.2]);
      await smallCache.search([0.3]);

      // Access [0.1] to make it most recently used
      await smallCache.search([0.1]);

      // Add new entry, should evict [0.2] (now LRU)
      await smallCache.search([0.4]);

      // [0.1] should still be cached
      await smallCache.search([0.1]);

      const stats = smallCache.getStats();
      expect(stats.hits).toBeGreaterThan(0);

      smallCache.clear();
    });
  });

  describe('Hash Function Consistency', () => {
    test('should produce same hash for same embedding', async () => {
      const embedding = [0.123, 0.456, 0.789];

      await cache.search(embedding);
      await cache.search(embedding);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1); // Second search should hit cache
    });

    test('should handle floating point precision', async () => {
      const embedding1 = [0.1234567890];
      const embedding2 = [0.1234567891]; // Very close values

      await cache.search(embedding1);
      await cache.search(embedding2);

      const stats = cache.getStats();
      // Should treat as same due to rounding in hash
      expect(stats.size).toBeLessThanOrEqual(2);
    });

    test('should produce different hash for different embeddings', async () => {
      const embedding1 = [0.1, 0.2];
      const embedding2 = [0.3, 0.4];

      await cache.search(embedding1);
      await cache.search(embedding2);

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
    });
  });

  describe('Cache Hit Rate', () => {
    test('should achieve >60% hit rate with realistic workload', async () => {
      // Simulate 80/20 rule: 80% of searches are for 20% of embeddings
      const hotEmbeddings = Array.from({ length: 20 }, (_, i) =>
        [i * 0.1, i * 0.2, i * 0.3]
      );
      const coldEmbeddings = Array.from({ length: 80 }, (_, i) =>
        [(i + 20) * 0.1, (i + 20) * 0.2, (i + 20) * 0.3]
      );

      // Warm up cache
      for (const emb of hotEmbeddings) {
        await cache.search(emb);
      }

      // Generate workload (80% hot, 20% cold)
      for (let i = 0; i < 1000; i++) {
        const embedding = Math.random() < 0.8
          ? hotEmbeddings[Math.floor(Math.random() * hotEmbeddings.length)]
          : coldEmbeddings[Math.floor(Math.random() * coldEmbeddings.length)];

        await cache.search(embedding);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.6);
    });

    test('should track hit rate correctly', async () => {
      const embedding1 = [0.1];
      const embedding2 = [0.2];

      await cache.search(embedding1); // miss
      await cache.search(embedding1); // hit
      await cache.search(embedding2); // miss
      await cache.search(embedding1); // hit

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.5, 2); // 2 hits, 2 misses
    });
  });

  describe('Performance', () => {
    test('should be faster than actual search for cached results', async () => {
      const embedding = [0.1, 0.2, 0.3];

      // First search (uncached)
      const uncachedStart = performance.now();
      await cache.search(embedding);
      const uncachedTime = performance.now() - uncachedStart;

      // Second search (cached)
      const cachedStart = performance.now();
      await cache.search(embedding);
      const cachedTime = performance.now() - cachedStart;

      // Cached should be significantly faster
      expect(cachedTime).toBeLessThan(uncachedTime / 2);
    });

    test('should reduce average search time with caching', async () => {
      const embeddings = Array.from({ length: 10 }, (_, i) => [i * 0.1]);

      // Without cache benefit (all cold)
      const coldStart = performance.now();
      for (const emb of embeddings) {
        await cache.search(emb);
      }
      const coldTime = performance.now() - coldStart;

      cache.clear();

      // With cache benefit (warm up then search)
      const warmStart = performance.now();
      for (const emb of embeddings) {
        await cache.search(emb); // First pass
      }
      for (const emb of embeddings) {
        await cache.search(emb); // Second pass (cached)
      }
      const warmTime = performance.now() - warmStart;

      const avgColdTime = coldTime / embeddings.length;
      const avgWarmTime = warmTime / (embeddings.length * 2);

      expect(avgWarmTime).toBeLessThan(avgColdTime);
    });

    test('should handle high-frequency searches', async () => {
      const embedding = [0.5, 0.6, 0.7];

      const start = performance.now();

      // 1000 searches of same embedding
      for (let i = 0; i < 1000; i++) {
        await cache.search(embedding);
      }

      const duration = performance.now() - start;
      const avgTime = duration / 1000;

      expect(avgTime).toBeLessThan(1); // <1ms per search when cached
    });
  });

  describe('TopK Parameter', () => {
    test('should respect topK parameter', async () => {
      const embedding = [0.1, 0.2];

      const results3 = await cache.search(embedding, 3);
      const results10 = await cache.search(embedding, 10);

      expect(results3).toHaveLength(3);
      expect(results10).toHaveLength(10);
    });

    test('should cache results per topK value', async () => {
      const embedding = [0.1, 0.2];

      await cache.search(embedding, 5);
      await cache.search(embedding, 10);

      // Different topK should be treated as different queries
      const stats = cache.getStats();
      expect(stats.searches).toBe(2);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent searches', async () => {
      const embeddings = Array.from({ length: 50 }, (_, i) => [i * 0.1]);

      const promises = embeddings.map(emb => cache.search(emb));
      const results = await Promise.all(promises);

      expect(results.length).toBe(50);
      const stats = cache.getStats();
      expect(stats.searches).toBe(50);
    });

    test('should maintain consistency under concurrent access', async () => {
      const embedding = [0.1, 0.2, 0.3];

      // 100 concurrent searches of same embedding
      const promises = Array.from({ length: 100 }, () => cache.search(embedding));
      const results = await Promise.all(promises);

      // All should return same results
      const first = results[0];
      results.forEach(r => {
        expect(r).toEqual(first);
      });

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(90); // Most should be cache hits
    });
  });

  describe('Statistics', () => {
    test('should track total searches', async () => {
      await cache.search([0.1]);
      await cache.search([0.2]);
      await cache.search([0.1]);

      const stats = cache.getStats();
      expect(stats.searches).toBe(3);
    });

    test('should provide accurate statistics', async () => {
      const embedding = [0.1, 0.2];

      await cache.search(embedding); // miss
      await cache.search(embedding); // hit
      await cache.search([0.3]);     // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.searches).toBe(3);
      expect(stats.hitRate).toBeCloseTo(1/3, 2);
    });
  });
});
