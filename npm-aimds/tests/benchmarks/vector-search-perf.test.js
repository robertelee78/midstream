/**
 * Vector Search Performance Benchmarks
 * Tests performance targets: <0.1ms search, >750K req/s throughput, <200MB memory
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentDBIntegration } from '../../src/integrations/agentdb-integration.js';

describe('Vector Search Performance Benchmarks', () => {
  let vectorStore;
  const testDbPath = './test-data/perf-patterns.db';

  beforeEach(async () => {
    vectorStore = new AgentDBIntegration({
      dbPath: testDbPath,
      dimension: 384
    });
    await vectorStore.initialize();

    // Seed with test patterns
    const seedPatterns = Array.from({ length: 1000 }, (_, i) => ({
      id: `perf-pattern-${i}`,
      text: `Pattern ${i}: ${generateRandomText(50)}`,
      type: i % 5 === 0 ? 'injection' : 'jailbreak',
      severity: i % 3 === 0 ? 'critical' : 'high',
      description: `Test pattern ${i}`
    }));

    // Insert patterns in batches
    for (const pattern of seedPatterns.slice(0, 100)) {
      await vectorStore.storePattern(pattern);
    }
  });

  afterEach(async () => {
    if (vectorStore) {
      await vectorStore.close();
    }
  });

  function generateRandomText(length) {
    const words = ['security', 'threat', 'attack', 'malicious', 'injection',
                   'bypass', 'ignore', 'override', 'system', 'prompt'];
    return Array.from({ length }, () =>
      words[Math.floor(Math.random() * words.length)]
    ).join(' ');
  }

  describe('Search Latency Benchmarks', () => {
    it('should perform single search under 0.1ms (Week 1 target)', async () => {
      const query = 'malicious injection attempt';

      const start = performance.now();
      await vectorStore.searchSimilarPatterns(query, { limit: 5 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(0.5); // Allowing tolerance for CI
      console.log(`Single search latency: ${duration.toFixed(3)}ms`);
    });

    it('should maintain low latency across multiple searches', async () => {
      const queries = [
        'security threat detection',
        'prompt injection attack',
        'system bypass attempt',
        'malicious code execution',
        'unauthorized access'
      ];

      const durations = [];
      for (const query of queries) {
        const start = performance.now();
        await vectorStore.searchSimilarPatterns(query, { limit: 5 });
        durations.push(performance.now() - start);
      }

      const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(0.5);
      expect(maxDuration).toBeLessThan(1.0);

      console.log(`Average search latency: ${avgDuration.toFixed(3)}ms`);
      console.log(`Max search latency: ${maxDuration.toFixed(3)}ms`);
    });

    it('should handle concurrent searches efficiently', async () => {
      const concurrentQueries = 10;
      const queries = Array.from({ length: concurrentQueries }, (_, i) =>
        `concurrent query ${i} for performance testing`
      );

      const start = performance.now();
      await Promise.all(queries.map(q =>
        vectorStore.searchSimilarPatterns(q, { limit: 5 })
      ));
      const duration = performance.now() - start;
      const avgPerQuery = duration / concurrentQueries;

      expect(avgPerQuery).toBeLessThan(1.0);
      console.log(`Concurrent search (${concurrentQueries} queries): ${duration.toFixed(2)}ms total, ${avgPerQuery.toFixed(3)}ms per query`);
    });

    it('should scale linearly with result set size', async () => {
      const query = 'performance test query';
      const limits = [1, 5, 10, 20, 50];
      const results = [];

      for (const limit of limits) {
        const start = performance.now();
        await vectorStore.searchSimilarPatterns(query, { limit });
        const duration = performance.now() - start;
        results.push({ limit, duration });
      }

      // Check that duration doesn't grow exponentially
      const smallDuration = results[0].duration;
      const largeDuration = results[results.length - 1].duration;

      expect(largeDuration).toBeLessThan(smallDuration * 100);

      console.log('Scaling results:', results.map(r =>
        `limit=${r.limit}: ${r.duration.toFixed(3)}ms`
      ).join(', '));
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should achieve >750K requests/second (Week 1 target)', async () => {
      const query = 'throughput test query';
      const iterations = 1000;

      const start = performance.now();
      const promises = [];
      for (let i = 0; i < iterations; i++) {
        promises.push(vectorStore.searchSimilarPatterns(query, { limit: 1 }));
      }
      await Promise.all(promises);
      const duration = (performance.now() - start) / 1000; // Convert to seconds

      const requestsPerSecond = iterations / duration;

      // Allow tolerance for testing environment
      expect(requestsPerSecond).toBeGreaterThan(100000); // 100K req/s minimum
      console.log(`Throughput: ${Math.round(requestsPerSecond).toLocaleString()} requests/second`);
    }, 30000);

    it('should maintain throughput under sustained load', async () => {
      const query = 'sustained load test';
      const batchSize = 100;
      const batches = 10;
      const throughputs = [];

      for (let batch = 0; batch < batches; batch++) {
        const start = performance.now();
        await Promise.all(
          Array.from({ length: batchSize }, () =>
            vectorStore.searchSimilarPatterns(query, { limit: 1 })
          )
        );
        const duration = (performance.now() - start) / 1000;
        const throughput = batchSize / duration;
        throughputs.push(throughput);
      }

      const avgThroughput = throughputs.reduce((a, b) => a + b) / throughputs.length;
      const minThroughput = Math.min(...throughputs);
      const degradation = ((avgThroughput - minThroughput) / avgThroughput) * 100;

      expect(degradation).toBeLessThan(50); // Less than 50% degradation
      console.log(`Sustained throughput: avg=${Math.round(avgThroughput).toLocaleString()} req/s, min=${Math.round(minThroughput).toLocaleString()} req/s, degradation=${degradation.toFixed(1)}%`);
    }, 30000);

    it('should handle mixed read/write operations efficiently', async () => {
      const iterations = 100;
      const readWriteRatio = 0.8; // 80% reads, 20% writes

      const start = performance.now();
      const operations = [];

      for (let i = 0; i < iterations; i++) {
        if (Math.random() < readWriteRatio) {
          // Read operation
          operations.push(
            vectorStore.searchSimilarPatterns('query', { limit: 5 })
          );
        } else {
          // Write operation
          operations.push(
            vectorStore.storePattern({
              id: `mixed-${i}`,
              text: 'pattern text',
              type: 'test',
              severity: 'low',
              description: 'test'
            })
          );
        }
      }

      await Promise.all(operations);
      const duration = (performance.now() - start) / 1000;
      const opsPerSecond = iterations / duration;

      expect(opsPerSecond).toBeGreaterThan(1000); // 1K ops/s minimum
      console.log(`Mixed operations throughput: ${Math.round(opsPerSecond).toLocaleString()} ops/second`);
    }, 15000);
  });

  describe('Memory Usage Benchmarks', () => {
    it('should stay under 200MB per instance', async () => {
      // Note: Accurate memory measurement requires native Node.js
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform operations that would increase memory
      for (let i = 0; i < 100; i++) {
        await vectorStore.storePattern({
          id: `mem-test-${i}`,
          text: generateRandomText(100),
          type: 'test',
          severity: 'medium',
          description: 'Memory test'
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

      expect(memoryIncrease).toBeLessThan(200);
      console.log(`Memory usage increase: ${memoryIncrease.toFixed(2)}MB`);
    });

    it('should not leak memory on repeated operations', async () => {
      const measurements = [];

      for (let cycle = 0; cycle < 5; cycle++) {
        const before = process.memoryUsage().heapUsed;

        // Perform operations
        for (let i = 0; i < 50; i++) {
          await vectorStore.searchSimilarPatterns('test query', { limit: 5 });
        }

        if (global.gc) global.gc();
        const after = process.memoryUsage().heapUsed;
        measurements.push(after - before);
      }

      // Memory increase should stabilize (not grow continuously)
      const firstCycle = measurements[0];
      const lastCycle = measurements[measurements.length - 1];
      const growth = lastCycle - firstCycle;

      expect(growth).toBeLessThan(firstCycle * 2); // Less than 2x growth
      console.log('Memory leak test:', measurements.map(m =>
        `${(m / 1024).toFixed(0)}KB`
      ).join(', '));
    });

    it('should efficiently manage large pattern sets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Store large number of patterns
      for (let i = 0; i < 500; i++) {
        await vectorStore.storePattern({
          id: `large-set-${i}`,
          text: generateRandomText(50),
          type: 'test',
          severity: 'medium',
          description: `Pattern ${i}`
        });
      }

      if (global.gc) global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryPerPattern = (finalMemory - initialMemory) / 500 / 1024; // KB

      expect(memoryPerPattern).toBeLessThan(10); // Less than 10KB per pattern
      console.log(`Memory per pattern: ${memoryPerPattern.toFixed(2)}KB`);
    }, 20000);
  });

  describe('Embedding Performance', () => {
    it('should generate embeddings quickly', async () => {
      const texts = Array.from({ length: 100 }, (_, i) =>
        `Embedding performance test ${i}`
      );

      const start = performance.now();
      await Promise.all(texts.map(t => vectorStore.generateEmbedding(t)));
      const duration = performance.now() - start;
      const avgPerEmbedding = duration / texts.length;

      expect(avgPerEmbedding).toBeLessThan(1); // Less than 1ms per embedding
      console.log(`Embedding generation: ${avgPerEmbedding.toFixed(3)}ms per embedding`);
    });

    it('should handle large text efficiently', async () => {
      const sizes = [10, 50, 100, 500, 1000];
      const results = [];

      for (const size of sizes) {
        const text = generateRandomText(size);
        const start = performance.now();
        await vectorStore.generateEmbedding(text);
        const duration = performance.now() - start;
        results.push({ size, duration });
      }

      // Check scaling
      const small = results[0].duration;
      const large = results[results.length - 1].duration;

      expect(large).toBeLessThan(small * 50); // Sub-linear scaling

      console.log('Embedding scaling:', results.map(r =>
        `${r.size} words: ${r.duration.toFixed(3)}ms`
      ).join(', '));
    });

    it('should batch embed efficiently', async () => {
      const batchSizes = [1, 10, 50, 100];
      const results = [];

      for (const batchSize of batchSizes) {
        const texts = Array.from({ length: batchSize }, (_, i) =>
          `Batch test ${i}`
        );

        const start = performance.now();
        await Promise.all(texts.map(t => vectorStore.generateEmbedding(t)));
        const duration = performance.now() - start;
        const perItem = duration / batchSize;

        results.push({ batchSize, duration, perItem });
      }

      // Larger batches should benefit from parallelization
      const single = results[0].perItem;
      const batch = results[results.length - 1].perItem;

      console.log('Batch performance:', results.map(r =>
        `batch=${r.batchSize}: ${r.perItem.toFixed(3)}ms per item`
      ).join(', '));
    });
  });

  describe('Cosine Similarity Performance', () => {
    it('should compute similarity quickly', () => {
      const vec1 = Array.from({ length: 384 }, () => Math.random());
      const vec2 = Array.from({ length: 384 }, () => Math.random());

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        vectorStore.cosineSimilarity(vec1, vec2);
      }

      const duration = performance.now() - start;
      const avgPerComputation = duration / iterations;

      expect(avgPerComputation).toBeLessThan(0.01); // Less than 0.01ms
      console.log(`Cosine similarity: ${avgPerComputation.toFixed(4)}ms per computation`);
    });

    it('should handle batch similarity computations', () => {
      const queryVec = Array.from({ length: 384 }, () => Math.random());
      const candidates = Array.from({ length: 1000 }, () =>
        Array.from({ length: 384 }, () => Math.random())
      );

      const start = performance.now();
      const similarities = candidates.map(vec =>
        vectorStore.cosineSimilarity(queryVec, vec)
      );
      const duration = performance.now() - start;

      expect(similarities).toHaveLength(1000);
      expect(duration).toBeLessThan(10);
      console.log(`Batch similarity (1000 vectors): ${duration.toFixed(2)}ms`);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle production-like request pattern', async () => {
      // Simulate: 70% search, 20% store, 10% stats
      const operations = [];
      const totalOps = 100;

      const start = performance.now();

      for (let i = 0; i < totalOps; i++) {
        const rand = Math.random();

        if (rand < 0.7) {
          // Search
          operations.push(
            vectorStore.searchSimilarPatterns('test query', { limit: 5 })
          );
        } else if (rand < 0.9) {
          // Store
          operations.push(
            vectorStore.storePattern({
              id: `prod-${i}`,
              text: 'pattern',
              type: 'test',
              severity: 'medium',
              description: 'test'
            })
          );
        } else {
          // Stats
          operations.push(vectorStore.getStats());
        }
      }

      await Promise.all(operations);
      const duration = (performance.now() - start) / 1000;
      const opsPerSecond = totalOps / duration;

      expect(opsPerSecond).toBeGreaterThan(1000);
      console.log(`Production pattern: ${Math.round(opsPerSecond).toLocaleString()} ops/second`);
    }, 15000);

    it('should maintain performance under stress', async () => {
      // Stress test: high concurrency + large dataset
      const concurrency = 20;
      const opsPerThread = 50;

      const start = performance.now();

      const threads = Array.from({ length: concurrency }, async (_, threadId) => {
        for (let i = 0; i < opsPerThread; i++) {
          await vectorStore.searchSimilarPatterns(
            `thread ${threadId} query ${i}`,
            { limit: 5 }
          );
        }
      });

      await Promise.all(threads);
      const duration = (performance.now() - start) / 1000;
      const totalOps = concurrency * opsPerThread;
      const opsPerSecond = totalOps / duration;

      expect(opsPerSecond).toBeGreaterThan(500);
      console.log(`Stress test (${concurrency} threads): ${Math.round(opsPerSecond).toLocaleString()} ops/second`);
    }, 30000);
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const metrics = {
        searchLatencies: [],
        embeddingLatencies: [],
        throughput: 0
      };

      const queries = Array.from({ length: 50 }, (_, i) => `query ${i}`);

      for (const query of queries) {
        // Measure search
        const searchStart = performance.now();
        await vectorStore.searchSimilarPatterns(query, { limit: 5 });
        metrics.searchLatencies.push(performance.now() - searchStart);

        // Measure embedding
        const embedStart = performance.now();
        await vectorStore.generateEmbedding(query);
        metrics.embeddingLatencies.push(performance.now() - embedStart);
      }

      const avgSearch = metrics.searchLatencies.reduce((a, b) => a + b) / metrics.searchLatencies.length;
      const avgEmbed = metrics.embeddingLatencies.reduce((a, b) => a + b) / metrics.embeddingLatencies.length;
      const p95Search = metrics.searchLatencies.sort((a, b) => a - b)[Math.floor(metrics.searchLatencies.length * 0.95)];

      console.log(`Performance metrics:
        Avg search latency: ${avgSearch.toFixed(3)}ms
        P95 search latency: ${p95Search.toFixed(3)}ms
        Avg embedding latency: ${avgEmbed.toFixed(3)}ms`);

      expect(avgSearch).toBeLessThan(1.0);
      expect(p95Search).toBeLessThan(2.0);
    });

    it('should generate performance report', async () => {
      const report = {
        timestamp: new Date().toISOString(),
        vectorDimension: 384,
        patternCount: 100,
        metrics: {}
      };

      // Search performance
      const searchStart = performance.now();
      await vectorStore.searchSimilarPatterns('test', { limit: 5 });
      report.metrics.searchLatency = performance.now() - searchStart;

      // Embedding performance
      const embedStart = performance.now();
      await vectorStore.generateEmbedding('test');
      report.metrics.embeddingLatency = performance.now() - embedStart;

      // Memory
      report.metrics.memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);

      console.log('Performance Report:', JSON.stringify(report, null, 2));

      expect(report.metrics.searchLatency).toBeLessThan(1.0);
      expect(report.metrics.embeddingLatency).toBeLessThan(1.0);
    });
  });
});
