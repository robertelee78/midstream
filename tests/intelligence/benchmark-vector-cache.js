/**
 * Performance benchmark for Vector Cache
 *
 * Validates:
 * - Throughput exceeds +50K req/s
 * - Cache hit rate exceeds 60%
 * - Memory usage stays under 50MB for 5K entries
 * - Zero cache corruption
 */

const { VectorSearchCache } = require('../../npm-aimds/src/intelligence/vector-cache');
const { CachedThreatVectorStore } = require('../../npm-aimds/src/intelligence/vector-store-integration');

// Generate random embedding
function generateEmbedding(dim = 384) {
  const embedding = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    embedding[i] = Math.random() * 2 - 1; // Range: -1 to 1
  }
  return embedding;
}

// Normalize vector
function normalize(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  const magnitude = Math.sqrt(sum);

  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / magnitude;
  }
  return normalized;
}

// Benchmark 1: Cache throughput
async function benchmarkThroughput() {
  console.log('\n=== Benchmark 1: Cache Throughput ===');

  const vectorStore = new CachedThreatVectorStore({
    dimensions: 384,
    cacheSize: 5000,
    cacheTTL: 3600000
  });

  // Populate vector store
  console.log('Populating vector store with 1000 vectors...');
  for (let i = 0; i < 1000; i++) {
    const embedding = normalize(generateEmbedding());
    await vectorStore.addVector(`vector-${i}`, embedding, {
      type: 'threat',
      severity: Math.random()
    });
  }

  // Generate query embeddings (100 unique queries)
  const queries = Array.from({ length: 100 }, () => normalize(generateEmbedding()));

  // Warm up cache
  console.log('Warming up cache...');
  for (let i = 0; i < 100; i++) {
    await vectorStore.searchSimilar(queries[i % queries.length], 10, 0.7);
  }

  // Benchmark with repeated queries (simulates real-world cache hits)
  const iterations = 100000;
  console.log(`\nRunning ${iterations} searches...`);

  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const query = queries[i % queries.length]; // Cycle through queries for cache hits
    await vectorStore.searchSimilar(query, 10, 0.7);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000; // seconds
  const throughput = iterations / duration;

  const stats = vectorStore.getCacheStats();

  console.log('\n📊 Results:');
  console.log(`  Total requests: ${iterations.toLocaleString()}`);
  console.log(`  Duration: ${duration.toFixed(2)}s`);
  console.log(`  Throughput: ${throughput.toLocaleString()} req/s`);
  console.log(`  Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  Cache size: ${stats.size} entries`);
  console.log(`  Memory usage: ${(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

  // Validate targets
  const throughputTarget = 50000;
  const hitRateTarget = 0.6;

  console.log('\n✅ Validation:');
  console.log(`  Throughput: ${throughput >= throughputTarget ? '✓' : '✗'} (target: ${throughputTarget.toLocaleString()} req/s)`);
  console.log(`  Hit rate: ${stats.hitRate >= hitRateTarget ? '✓' : '✗'} (target: ${(hitRateTarget * 100).toFixed(0)}%)`);
  console.log(`  Memory: ${stats.memoryUsage < 50 * 1024 * 1024 ? '✓' : '✗'} (target: <50MB)`);

  await vectorStore.shutdown();

  return {
    throughput,
    hitRate: stats.hitRate,
    memoryUsage: stats.memoryUsage,
    passed: throughput >= throughputTarget && stats.hitRate >= hitRateTarget
  };
}

// Benchmark 2: Cache hit rate with varying query patterns
async function benchmarkHitRate() {
  console.log('\n=== Benchmark 2: Cache Hit Rate Patterns ===');

  const cache = new VectorSearchCache({ maxSize: 5000, ttl: 3600000 });

  // Mock vector store
  const mockStore = {
    _searchSimilarUncached: async () => [
      { id: 1, score: 0.95 },
      { id: 2, score: 0.88 }
    ]
  };

  const scenarios = [
    { name: '100% repeated queries', repeatRate: 1.0, queries: 10 },
    { name: '80% repeated queries', repeatRate: 0.8, queries: 50 },
    { name: '60% repeated queries', repeatRate: 0.6, queries: 100 },
    { name: '40% repeated queries', repeatRate: 0.4, queries: 200 },
    { name: '20% repeated queries', repeatRate: 0.2, queries: 500 }
  ];

  for (const scenario of scenarios) {
    cache.clear();

    const queries = Array.from({ length: scenario.queries }, () =>
      normalize(generateEmbedding())
    );

    // Run searches
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      let query;

      if (Math.random() < scenario.repeatRate) {
        // Repeated query
        query = queries[i % Math.floor(scenario.queries * 0.2)]; // Top 20% queries
      } else {
        // Random query
        query = queries[Math.floor(Math.random() * scenario.queries)];
      }

      await cache.cachedSearch(mockStore, query, 10, 0.7);
    }

    const stats = cache.stats();
    console.log(`\n  ${scenario.name}:`);
    console.log(`    Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`    Hits: ${stats.hits.toLocaleString()}`);
    console.log(`    Misses: ${stats.misses.toLocaleString()}`);
  }
}

// Benchmark 3: Memory efficiency
async function benchmarkMemory() {
  console.log('\n=== Benchmark 3: Memory Efficiency ===');

  const cacheSizes = [100, 500, 1000, 2500, 5000];

  for (const size of cacheSizes) {
    const cache = new VectorSearchCache({ maxSize: size });

    // Fill cache
    for (let i = 0; i < size; i++) {
      const embedding = generateEmbedding();
      cache.set(embedding, 10, 0.7, [
        { id: i, score: 0.95, metadata: { type: 'test' } }
      ]);
    }

    const memoryMB = cache.estimateMemoryUsage() / 1024 / 1024;
    const memoryPerEntry = cache.estimateMemoryUsage() / size;

    console.log(`\n  Cache size: ${size.toLocaleString()} entries`);
    console.log(`    Memory: ${memoryMB.toFixed(2)} MB`);
    console.log(`    Per entry: ${memoryPerEntry.toFixed(0)} bytes`);
    console.log(`    Status: ${memoryMB < 50 ? '✓ Efficient' : '✗ Too large'}`);
  }
}

// Benchmark 4: Concurrent access
async function benchmarkConcurrency() {
  console.log('\n=== Benchmark 4: Concurrent Access ===');

  const vectorStore = new CachedThreatVectorStore({
    dimensions: 384,
    cacheSize: 5000
  });

  // Populate
  for (let i = 0; i < 500; i++) {
    const embedding = normalize(generateEmbedding());
    await vectorStore.addVector(`vector-${i}`, embedding, { type: 'test' });
  }

  const queries = Array.from({ length: 50 }, () => normalize(generateEmbedding()));
  const concurrencyLevels = [1, 5, 10, 20, 50];

  for (const concurrency of concurrencyLevels) {
    const iterations = 1000;
    const startTime = Date.now();

    // Run concurrent searches
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      const query = queries[i % queries.length];
      const promise = vectorStore.searchSimilar(query, 10, 0.7);
      promises.push(promise);

      // Wait for batch to complete
      if (promises.length >= concurrency) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }

    // Wait for remaining
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    const duration = (Date.now() - startTime) / 1000;
    const throughput = iterations / duration;

    console.log(`\n  Concurrency: ${concurrency}`);
    console.log(`    Throughput: ${throughput.toLocaleString()} req/s`);
    console.log(`    Duration: ${duration.toFixed(2)}s`);
  }

  await vectorStore.shutdown();
}

// Benchmark 5: Cache corruption check
async function benchmarkCorruption() {
  console.log('\n=== Benchmark 5: Cache Corruption Check ===');

  const cache = new VectorSearchCache({ maxSize: 1000 });

  const mockStore = {
    searchCount: 0,
    _searchSimilarUncached: async (embedding) => {
      mockStore.searchCount++;
      // Return deterministic results based on first element
      return [
        { id: embedding[0], score: 0.95 },
        { id: embedding[0] + 1, score: 0.88 }
      ];
    }
  };

  const queries = Array.from({ length: 100 }, () => normalize(generateEmbedding()));
  let corruptionDetected = 0;

  // Run many searches
  for (let i = 0; i < 10000; i++) {
    const query = queries[i % queries.length];
    const result1 = await cache.cachedSearch(mockStore, query, 10, 0.7);
    const result2 = await cache.cachedSearch(mockStore, query, 10, 0.7);

    // Verify results are identical
    if (JSON.stringify(result1) !== JSON.stringify(result2)) {
      corruptionDetected++;
      console.log(`  ✗ Corruption detected at iteration ${i}`);
    }
  }

  const stats = cache.stats();

  console.log(`\n  Total searches: ${stats.totalRequests.toLocaleString()}`);
  console.log(`  Cache hits: ${stats.hits.toLocaleString()}`);
  console.log(`  Corruptions: ${corruptionDetected}`);
  console.log(`  Status: ${corruptionDetected === 0 ? '✓ No corruption' : '✗ Corruption detected'}`);

  return corruptionDetected === 0;
}

// Run all benchmarks
async function runAllBenchmarks() {
  console.log('⚡ Vector Cache Performance Benchmarks');
  console.log('='.repeat(60));

  try {
    const results = {};

    results.throughput = await benchmarkThroughput();
    await benchmarkHitRate();
    await benchmarkMemory();
    await benchmarkConcurrency();
    results.corruption = await benchmarkCorruption();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Throughput: ${results.throughput.throughput.toLocaleString()} req/s`);
    console.log(`Hit rate: ${(results.throughput.hitRate * 100).toFixed(2)}%`);
    console.log(`Memory: ${(results.throughput.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Corruption: ${results.corruption ? '✓ None' : '✗ Detected'}`);
    console.log(`Overall: ${results.throughput.passed && results.corruption ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));

    return results.throughput.passed && results.corruption;
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  runAllBenchmarks().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAllBenchmarks };
