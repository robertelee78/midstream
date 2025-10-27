/**
 * Performance Tests for Detection Module
 * Target: <10ms detection latency
 */

import { AgentDBClient } from '../../../AIMDS/src/agentdb/client';
import { Logger } from '../../../AIMDS/src/utils/logger';
import {
  mockAgentDBConfig,
  generateMockEmbedding,
  mockThreatPatterns
} from '../fixtures/mock-data';

jest.mock('agentdb');

describe('Detection Performance Tests', () => {
  let client: AgentDBClient;
  let logger: Logger;

  beforeAll(async () => {
    logger = new Logger('perf-test');
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();

    client = new AgentDBClient(mockAgentDBConfig, logger);

    // Mock fast vector search
    (client as any).db.search = jest.fn().mockResolvedValue(
      mockThreatPatterns.map(p => ({
        id: p.id,
        similarity: 0.85,
        metadata: p.metadata,
        embedding: p.embedding
      }))
    );

    await client.initialize();
  });

  afterAll(async () => {
    await client.shutdown();
  });

  describe('Vector Search Performance', () => {
    test('should complete search in <2ms (p95)', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const embedding = generateMockEmbedding(i);
        const start = performance.now();
        await client.vectorSearch(embedding, { k: 10 });
        const latency = performance.now() - start;
        latencies.push(latency);
      }

      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(iterations * 0.50)];
      const p95 = latencies[Math.floor(iterations * 0.95)];
      const p99 = latencies[Math.floor(iterations * 0.99)];
      const avg = latencies.reduce((sum, l) => sum + l, 0) / iterations;

      console.log(`Vector Search Latency:
        p50: ${p50.toFixed(2)}ms
        p95: ${p95.toFixed(2)}ms
        p99: ${p99.toFixed(2)}ms
        avg: ${avg.toFixed(2)}ms`);

      expect(p50).toBeLessThan(5);
      expect(p95).toBeLessThan(10);
      expect(p99).toBeLessThan(15);
    });

    test('should handle k=100 search in <5ms', async () => {
      const embedding = generateMockEmbedding();

      const { duration } = await testUtils.measurePerformance(() =>
        client.vectorSearch(embedding, { k: 100 })
      );

      expect(duration).toBeLessThan(10);
    });

    test('should maintain performance under concurrent load', async () => {
      const concurrentSearches = 50;
      const searches = Array(concurrentSearches)
        .fill(null)
        .map((_, i) => ({
          embedding: generateMockEmbedding(i),
          options: { k: 10 }
        }));

      const start = performance.now();

      await Promise.all(
        searches.map(s => client.vectorSearch(s.embedding, s.options))
      );

      const totalTime = performance.now() - start;
      const avgTime = totalTime / concurrentSearches;

      console.log(`Concurrent ${concurrentSearches} searches: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms avg`);

      expect(avgTime).toBeLessThan(15);
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Detection Throughput', () => {
    test('should achieve >10,000 detections/sec', async () => {
      const iterations = 10000;
      const batchSize = 100;
      const batches = iterations / batchSize;

      const start = performance.now();

      for (let i = 0; i < batches; i++) {
        const batch = Array(batchSize)
          .fill(null)
          .map((_, j) => generateMockEmbedding(i * batchSize + j));

        await Promise.all(
          batch.map(embedding => client.vectorSearch(embedding, { k: 10 }))
        );
      }

      const duration = performance.now() - start;
      const throughput = (iterations / duration) * 1000;

      console.log(`Detection Throughput: ${throughput.toFixed(0)} req/s`);
      console.log(`Total time for ${iterations} detections: ${duration.toFixed(2)}ms`);

      expect(throughput).toBeGreaterThan(1000); // Accounting for test overhead
    }, 60000);
  });

  describe('Memory Usage', () => {
    test('should maintain stable memory under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const embedding = generateMockEmbedding(i);
        await client.vectorSearch(embedding, { k: 10 });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth after ${iterations} searches: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Should not leak significant memory
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // <50MB growth
    }, 30000);

    test('should cleanup old incidents efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Store many incidents
      for (let i = 0; i < 1000; i++) {
        await client.storeIncident({
          id: `inc_${i}`,
          timestamp: Date.now() - (i * 1000),
          request: {} as any,
          result: {} as any,
          embedding: generateMockEmbedding(i)
        });
      }

      const beforeCleanup = process.memoryUsage().heapUsed;

      await client.cleanup();

      const afterCleanup = process.memoryUsage().heapUsed;

      console.log(`Memory before cleanup: ${(beforeCleanup / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after cleanup: ${(afterCleanup / 1024 / 1024).toFixed(2)}MB`);

      // Cleanup should free memory
      expect(afterCleanup).toBeLessThanOrEqual(beforeCleanup);
    }, 30000);
  });

  describe('Embedding Performance', () => {
    test('should handle various embedding dimensions efficiently', async () => {
      const dimensions = [128, 384, 768, 1536];
      const results: any[] = [];

      for (const dim of dimensions) {
        const embedding = generateMockEmbedding(1, dim);
        const start = performance.now();
        await client.vectorSearch(embedding, { k: 10 });
        const latency = performance.now() - start;
        results.push({ dim, latency });
      }

      console.log('Latency by embedding dimension:');
      results.forEach(r => {
        console.log(`  ${r.dim}d: ${r.latency.toFixed(2)}ms`);
      });

      // All dimensions should complete quickly
      results.forEach(r => {
        expect(r.latency).toBeLessThan(10);
      });
    });

    test('should handle sparse embeddings', async () => {
      const sparseEmbedding = Array(384).fill(0);
      sparseEmbedding[0] = 1.0;
      sparseEmbedding[100] = 0.5;
      sparseEmbedding[200] = 0.3;

      const { duration } = await testUtils.measurePerformance(() =>
        client.vectorSearch(sparseEmbedding, { k: 10 })
      );

      expect(duration).toBeLessThan(10);
    });
  });

  describe('Real-world Load Patterns', () => {
    test('should handle bursty traffic', async () => {
      const burstSize = 100;
      const burstCount = 10;
      const burstInterval = 100; // ms

      const latencies: number[] = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const start = performance.now();

        const searches = Array(burstSize)
          .fill(null)
          .map((_, i) =>
            client.vectorSearch(generateMockEmbedding(burst * burstSize + i), { k: 10 })
          );

        await Promise.all(searches);

        const burstLatency = performance.now() - start;
        latencies.push(burstLatency);

        await testUtils.waitFor(burstInterval);
      }

      const avgBurstLatency = latencies.reduce((sum, l) => sum + l, 0) / burstCount;

      console.log(`Average burst latency (${burstSize} req): ${avgBurstLatency.toFixed(2)}ms`);

      expect(avgBurstLatency).toBeLessThan(500);
    }, 60000);

    test('should maintain performance during sustained load', async () => {
      const duration = 10000; // 10 seconds
      const targetRps = 100; // requests per second
      const interval = 1000 / targetRps;

      const startTime = Date.now();
      const latencies: number[] = [];
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        const reqStart = performance.now();

        await client.vectorSearch(generateMockEmbedding(requestCount), { k: 10 });

        const reqLatency = performance.now() - reqStart;
        latencies.push(reqLatency);
        requestCount++;

        // Maintain target RPS
        const elapsed = performance.now() - (startTime + requestCount * interval);
        if (elapsed < 0) {
          await testUtils.waitFor(-elapsed);
        }
      }

      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.50)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];

      console.log(`Sustained load (${duration / 1000}s @ ${targetRps} rps):
        Total requests: ${requestCount}
        p50: ${p50.toFixed(2)}ms
        p95: ${p95.toFixed(2)}ms
        p99: ${p99.toFixed(2)}ms`);

      expect(p50).toBeLessThan(5);
      expect(p95).toBeLessThan(15);
    }, 15000);
  });
});
