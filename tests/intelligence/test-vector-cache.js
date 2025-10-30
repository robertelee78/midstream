/**
 * Comprehensive test suite for VectorSearchCache
 *
 * Tests:
 * - Cache hit/miss tracking
 * - TTL expiration
 * - LRU eviction
 * - Memory usage
 * - Performance benchmarks
 */

const { VectorSearchCache, VectorCacheManager } = require('../../npm-aimds/src/intelligence/vector-cache');
const assert = require('assert');

// Helper: Generate random embedding
function generateEmbedding(dim = 128) {
  const embedding = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    embedding[i] = Math.random();
  }
  return embedding;
}

// Helper: Mock vector store
class MockVectorStore {
  constructor() {
    this.searchCount = 0;
  }

  async _searchSimilarUncached(embedding, k, threshold) {
    this.searchCount++;
    // Simulate search results
    return [
      { id: 1, score: 0.95, metadata: { type: 'test' } },
      { id: 2, score: 0.88, metadata: { type: 'test' } }
    ];
  }
}

// Test 1: Basic cache hit/miss
async function testCacheHitMiss() {
  console.log('\n=== Test 1: Cache Hit/Miss ===');

  const cache = new VectorSearchCache({ maxSize: 10, ttl: 60000 });
  const store = new MockVectorStore();
  const embedding = generateEmbedding();

  // First call - cache miss
  const results1 = await cache.cachedSearch(store, embedding, 5, 0.8);
  assert.strictEqual(store.searchCount, 1, 'Should perform actual search on miss');
  assert.strictEqual(cache.stats().misses, 1, 'Should track cache miss');

  // Second call - cache hit
  const results2 = await cache.cachedSearch(store, embedding, 5, 0.8);
  assert.strictEqual(store.searchCount, 1, 'Should NOT perform search on hit');
  assert.strictEqual(cache.stats().hits, 1, 'Should track cache hit');

  // Verify results are identical
  assert.deepStrictEqual(results1, results2, 'Cached results should match');

  // Verify hit rate
  const stats = cache.stats();
  assert.strictEqual(stats.hitRate, 0.5, 'Hit rate should be 50%');

  console.log('✓ Cache hit/miss tracking works correctly');
  console.log(`  Stats: ${JSON.stringify(stats, null, 2)}`);
}

// Test 2: TTL expiration
async function testTTLExpiration() {
  console.log('\n=== Test 2: TTL Expiration ===');

  const cache = new VectorSearchCache({ maxSize: 10, ttl: 100 }); // 100ms TTL
  const store = new MockVectorStore();
  const embedding = generateEmbedding();

  // Store in cache
  await cache.cachedSearch(store, embedding, 5, 0.8);
  assert.strictEqual(cache.stats().misses, 1, 'Initial miss');

  // Immediate retrieval - should hit
  await cache.cachedSearch(store, embedding, 5, 0.8);
  assert.strictEqual(cache.stats().hits, 1, 'Should hit before expiration');

  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 150));

  // After expiration - should miss
  await cache.cachedSearch(store, embedding, 5, 0.8);
  assert.strictEqual(cache.stats().misses, 2, 'Should miss after expiration');
  assert.strictEqual(store.searchCount, 2, 'Should perform search after expiration');

  console.log('✓ TTL expiration works correctly');
}

// Test 3: LRU eviction
async function testLRUEviction() {
  console.log('\n=== Test 3: LRU Eviction ===');

  const cache = new VectorSearchCache({ maxSize: 3, ttl: 60000 });
  const store = new MockVectorStore();

  // Fill cache to capacity
  const emb1 = generateEmbedding();
  const emb2 = generateEmbedding();
  const emb3 = generateEmbedding();

  await cache.cachedSearch(store, emb1, 5, 0.8);
  await cache.cachedSearch(store, emb2, 5, 0.8);
  await cache.cachedSearch(store, emb3, 5, 0.8);

  assert.strictEqual(cache.stats().size, 3, 'Cache should be at capacity');
  assert.strictEqual(cache.stats().evictions, 0, 'No evictions yet');

  // Add one more - should evict oldest (emb1)
  const emb4 = generateEmbedding();
  await cache.cachedSearch(store, emb4, 5, 0.8);

  assert.strictEqual(cache.stats().size, 3, 'Cache should still be at capacity');
  assert.strictEqual(cache.stats().evictions, 1, 'Should have 1 eviction');

  // Verify emb1 was evicted (cache miss)
  store.searchCount = 0; // Reset counter
  await cache.cachedSearch(store, emb1, 5, 0.8);
  assert.strictEqual(store.searchCount, 1, 'Evicted entry should miss');

  // Now cache contains: emb2, emb3, emb4 (oldest to newest)
  // Note: emb1 search above added it back, evicting emb2
  // So cache now has: emb3, emb4, emb1

  // Verify current cache state after re-adding emb1
  assert.strictEqual(cache.stats().size, 3, 'Cache should be at capacity after re-add');
  assert.strictEqual(cache.stats().evictions, 2, 'Should have 2 evictions total');

  // Test that emb3, emb4, emb1 are cached
  store.searchCount = 0;
  await cache.cachedSearch(store, emb3, 5, 0.8);
  await cache.cachedSearch(store, emb4, 5, 0.8);
  await cache.cachedSearch(store, emb1, 5, 0.8);
  assert.strictEqual(store.searchCount, 0, 'Currently cached entries should hit');

  // emb2 should be evicted now
  store.searchCount = 0;
  await cache.cachedSearch(store, emb2, 5, 0.8);
  assert.strictEqual(store.searchCount, 1, 'Evicted emb2 should miss');

  console.log('✓ LRU eviction works correctly');
}

// Test 4: Memory usage estimation
function testMemoryUsage() {
  console.log('\n=== Test 4: Memory Usage ===');

  const cache = new VectorSearchCache({ maxSize: 5000 });

  // Empty cache
  assert.strictEqual(cache.estimateMemoryUsage(), 0, 'Empty cache should use 0 bytes');

  // Add entries
  for (let i = 0; i < 100; i++) {
    const emb = generateEmbedding();
    cache.set(emb, 5, 0.8, [{ id: i, score: 0.9 }]);
  }

  const memoryUsage = cache.estimateMemoryUsage();
  assert.strictEqual(memoryUsage, 100 * 1024, 'Should estimate 100KB for 100 entries');
  assert(memoryUsage < 200 * 1024, 'Memory usage should be reasonable');

  console.log('✓ Memory usage estimation works correctly');
  console.log(`  100 entries: ${(memoryUsage / 1024).toFixed(2)} KB`);
}

// Test 5: Pattern invalidation
function testPatternInvalidation() {
  console.log('\n=== Test 5: Pattern Invalidation ===');

  const cache = new VectorSearchCache({ maxSize: 100 });

  // Add entries with different patterns
  const emb1 = generateEmbedding();
  const emb2 = generateEmbedding();
  const emb3 = generateEmbedding();

  cache.set(emb1, 5, 0.8, []);
  cache.set(emb2, 10, 0.9, []);
  cache.set(emb3, 5, 0.8, []);

  assert.strictEqual(cache.stats().size, 3, 'Should have 3 entries');

  // Invalidate entries with k=5
  const key1 = cache.getKey(emb1, 5, 0.8);
  const invalidated = cache.invalidateByPattern('-5-');

  assert.strictEqual(invalidated, 2, 'Should invalidate 2 entries');
  assert.strictEqual(cache.stats().size, 1, 'Should have 1 entry remaining');

  console.log('✓ Pattern invalidation works correctly');
}

// Test 6: Clear expired entries
async function testClearExpired() {
  console.log('\n=== Test 6: Clear Expired ===');

  const cache = new VectorSearchCache({ maxSize: 100, ttl: 100 }); // 100ms TTL

  // Add entries
  const emb1 = generateEmbedding();
  const emb2 = generateEmbedding();
  cache.set(emb1, 5, 0.8, []);
  cache.set(emb2, 5, 0.8, []);

  assert.strictEqual(cache.stats().size, 2, 'Should have 2 entries');

  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 150));

  // Clear expired
  const cleared = cache.clearExpired();
  assert.strictEqual(cleared, 2, 'Should clear 2 expired entries');
  assert.strictEqual(cache.stats().size, 0, 'Cache should be empty');

  console.log('✓ Clear expired works correctly');
}

// Test 7: Cache manager
async function testCacheManager() {
  console.log('\n=== Test 7: Cache Manager ===');

  const cache = new VectorSearchCache({ maxSize: 100, ttl: 100 });
  const manager = new VectorCacheManager(cache, 50); // 50ms cleanup interval

  // Add entries
  cache.set(generateEmbedding(), 5, 0.8, []);
  cache.set(generateEmbedding(), 5, 0.8, []);

  // Start manager
  manager.start();
  assert(manager.status().isRunning, 'Manager should be running');

  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 200));

  // Entries should be cleared
  assert.strictEqual(cache.stats().size, 0, 'Expired entries should be cleared');

  // Stop manager
  manager.stop();
  assert(!manager.status().isRunning, 'Manager should be stopped');

  console.log('✓ Cache manager works correctly');
}

// Test 8: Performance benchmark
async function testPerformance() {
  console.log('\n=== Test 8: Performance Benchmark ===');

  const cache = new VectorSearchCache({ maxSize: 5000 });
  const store = new MockVectorStore();

  const iterations = 10000;
  const embeddings = Array.from({ length: 100 }, () => generateEmbedding());

  // Warm up cache
  for (let i = 0; i < 100; i++) {
    await cache.cachedSearch(store, embeddings[i], 5, 0.8);
  }

  // Benchmark
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const emb = embeddings[i % 100]; // Reuse embeddings for cache hits
    await cache.cachedSearch(store, emb, 5, 0.8);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const requestsPerSecond = (iterations / duration) * 1000;

  const stats = cache.stats();

  console.log('✓ Performance benchmark completed');
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Throughput: ${requestsPerSecond.toFixed(0)} req/s`);
  console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  console.log(`  Cache size: ${stats.size} entries`);

  // Verify performance targets
  assert(requestsPerSecond > 50000, `Throughput should exceed 50K req/s (got ${requestsPerSecond.toFixed(0)})`);
  assert(stats.hitRate > 0.6, `Hit rate should exceed 60% (got ${(stats.hitRate * 100).toFixed(1)}%)`);
}

// Test 9: Efficiency metrics
function testEfficiencyMetrics() {
  console.log('\n=== Test 9: Efficiency Metrics ===');

  const cache = new VectorSearchCache({ maxSize: 10 });

  // Add entries
  for (let i = 0; i < 5; i++) {
    cache.set(generateEmbedding(), 5, 0.8, []);
  }

  // Simulate hits
  cache.hits = 50;
  cache.misses = 10;

  const efficiency = cache.getEfficiency();

  assert(efficiency.hitRate > 0, 'Should have hit rate');
  assert(efficiency.effectiveCapacity > 0, 'Should have effective capacity');
  assert(efficiency.memoryEfficiency > 0, 'Should have memory efficiency');

  console.log('✓ Efficiency metrics work correctly');
  console.log(`  Hit rate: ${(efficiency.hitRate * 100).toFixed(1)}%`);
  console.log(`  Effective capacity: ${(efficiency.effectiveCapacity * 100).toFixed(1)}%`);
  console.log(`  Memory efficiency: ${efficiency.memoryEfficiency.toFixed(2)}`);
}

// Test 10: Different k and threshold values
async function testDifferentParameters() {
  console.log('\n=== Test 10: Different Parameters ===');

  const cache = new VectorSearchCache({ maxSize: 100 });
  const store = new MockVectorStore();
  const embedding = generateEmbedding();

  // Same embedding, different k values
  await cache.cachedSearch(store, embedding, 5, 0.8);
  await cache.cachedSearch(store, embedding, 10, 0.8);
  await cache.cachedSearch(store, embedding, 5, 0.9);

  assert.strictEqual(store.searchCount, 3, 'Different parameters should create different cache entries');
  assert.strictEqual(cache.stats().size, 3, 'Should have 3 distinct cache entries');

  // Same parameters - should hit
  store.searchCount = 0;
  await cache.cachedSearch(store, embedding, 5, 0.8);
  assert.strictEqual(store.searchCount, 0, 'Same parameters should hit cache');

  console.log('✓ Different parameters create distinct cache entries');
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Vector Cache Test Suite\n');
  console.log('=' .repeat(50));

  try {
    await testCacheHitMiss();
    await testTTLExpiration();
    await testLRUEviction();
    testMemoryUsage();
    testPatternInvalidation();
    await testClearExpired();
    await testCacheManager();
    await testPerformance();
    testEfficiencyMetrics();
    await testDifferentParameters();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('=' .repeat(50));

    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAllTests };
