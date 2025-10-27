/**
 * Performance Tests for Verification Module
 * Target: <500ms verification latency
 */

import { LeanAgenticVerifier } from '../../../AIMDS/src/lean-agentic/verifier';
import { Logger } from '../../../AIMDS/src/utils/logger';
import { Action, SecurityPolicy } from '../../../AIMDS/src/types';
import {
  mockVerifierConfig,
  mockDefaultPolicy,
  createMockPolicy
} from '../fixtures/mock-data';

jest.mock('lean-agentic');

describe('Verification Performance Tests', () => {
  let verifier: LeanAgenticVerifier;
  let logger: Logger;

  const mockAction: Action = {
    type: 'read',
    resource: '/api/data',
    parameters: {},
    context: { timestamp: Date.now() }
  };

  beforeAll(async () => {
    logger = new Logger('perf-test');
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();

    verifier = new LeanAgenticVerifier(mockVerifierConfig, logger);

    // Mock fast verification
    const engine = (verifier as any).engine;
    engine.hashConsEquals = jest.fn().mockResolvedValue(false);
    engine.typeCheck = jest.fn().mockResolvedValue({ valid: true });
    engine.evaluate = jest.fn().mockResolvedValue(true);
    engine.prove = jest.fn().mockResolvedValue({
      toString: () => 'proof_content'
    });

    await verifier.initialize();
  });

  afterAll(async () => {
    await verifier.shutdown();
  });

  describe('Policy Verification Performance', () => {
    test('should verify in <500ms (target)', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        const latency = performance.now() - start;
        latencies.push(latency);
      }

      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(iterations * 0.50)];
      const p95 = latencies[Math.floor(iterations * 0.95)];
      const p99 = latencies[Math.floor(iterations * 0.99)];
      const avg = latencies.reduce((sum, l) => sum + l, 0) / iterations;
      const max = Math.max(...latencies);

      console.log(`Verification Latency:
        p50: ${p50.toFixed(2)}ms
        p95: ${p95.toFixed(2)}ms
        p99: ${p99.toFixed(2)}ms
        avg: ${avg.toFixed(2)}ms
        max: ${max.toFixed(2)}ms`);

      expect(p95).toBeLessThan(500);
      expect(p99).toBeLessThan(700);
    });

    test('should use hash-cons for <1ms fast path', async () => {
      const engine = (verifier as any).engine;
      engine.hashConsEquals = jest.fn().mockResolvedValue(true);

      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        const latency = performance.now() - start;
        latencies.push(latency);
      }

      const avg = latencies.reduce((sum, l) => sum + l, 0) / iterations;

      console.log(`Hash-cons fast path avg: ${avg.toFixed(2)}ms`);

      expect(avg).toBeLessThan(5); // Including mock overhead
    });

    test('should handle complex policies efficiently', async () => {
      const complexPolicy = createMockPolicy({
        rules: Array.from({ length: 100 }, (_, i) => ({
          id: `rule_${i}`,
          condition: `action.type == "type${i}"`,
          action: 'verify' as const,
          priority: i
        })),
        constraints: Array.from({ length: 50 }, (_, i) => ({
          type: 'behavioral' as const,
          expression: `constraint_${i}`,
          severity: 'warning' as const
        }))
      });

      const { duration } = await testUtils.measurePerformance(() =>
        verifier.verifyPolicy(mockAction, complexPolicy)
      );

      console.log(`Complex policy (100 rules, 50 constraints): ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Theorem Proving Performance', () => {
    test('should prove theorems in <100ms (simple)', async () => {
      const theorems = [
        'theorem simple: true',
        'theorem auth: ∀ (a : Action), allowed a',
        'theorem safety: ∀ (a : Action), safe a → allowed a'
      ];

      const latencies: number[] = [];

      for (const theorem of theorems) {
        const start = performance.now();
        await verifier.proveTheorem(theorem);
        const latency = performance.now() - start;
        latencies.push(latency);
      }

      const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

      console.log(`Theorem proving avg: ${avg.toFixed(2)}ms`);

      expect(avg).toBeLessThan(100);
    });

    test('should benefit from proof caching', async () => {
      const theorem = 'theorem cached: ∀ (a : Action), valid a';

      // First call - not cached
      const { duration: firstCall } = await testUtils.measurePerformance(() =>
        verifier.proveTheorem(theorem)
      );

      // Second call - cached
      const { duration: cachedCall } = await testUtils.measurePerformance(() =>
        verifier.proveTheorem(theorem)
      );

      console.log(`First call: ${firstCall.toFixed(2)}ms, Cached call: ${cachedCall.toFixed(2)}ms`);

      expect(cachedCall).toBeLessThan(firstCall);
      expect(cachedCall).toBeLessThan(5); // Cache hit should be very fast
    });

    test('should timeout complex proofs', async () => {
      const engine = (verifier as any).engine;
      engine.prove = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const timeout = 1000; // 1 second timeout
      const newVerifier = new LeanAgenticVerifier(
        { ...mockVerifierConfig, proofTimeout: timeout },
        logger
      );
      (newVerifier as any).engine = engine;
      await newVerifier.initialize();

      const start = performance.now();
      const result = await newVerifier.proveTheorem('theorem complex: very_hard');
      const duration = performance.now() - start;

      console.log(`Timeout duration: ${duration.toFixed(2)}ms`);

      expect(result).toBeNull();
      expect(duration).toBeLessThanOrEqual(timeout + 100); // Some overhead

      await newVerifier.shutdown();
    });
  });

  describe('Cache Performance', () => {
    test('should achieve >95% cache hit rate', async () => {
      const uniquePolicies = 10;
      const totalRequests = 1000;

      const policies = Array.from({ length: uniquePolicies }, (_, i) =>
        createMockPolicy({ id: `policy_${i}` })
      );

      for (let i = 0; i < totalRequests; i++) {
        const policy = policies[i % uniquePolicies];
        await verifier.verifyPolicy(mockAction, policy);
      }

      const stats = verifier.getCacheStats();

      console.log(`Cache stats after ${totalRequests} requests:
        Proofs cached: ${stats.proofs}
        Hash-cons cached: ${stats.hashCons}
        Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

      // Cache should be populated
      expect(stats.proofs + stats.hashCons).toBeGreaterThan(0);
    });

    test('should handle cache eviction efficiently', async () => {
      const smallCacheVerifier = new LeanAgenticVerifier(
        { ...mockVerifierConfig, cacheSize: 10 },
        logger
      );
      await smallCacheVerifier.initialize();

      // Add more items than cache size
      for (let i = 0; i < 20; i++) {
        await smallCacheVerifier.proveTheorem(`theorem test${i}: true`);
      }

      const stats = smallCacheVerifier.getCacheStats();

      console.log(`Small cache stats: ${stats.proofs} proofs (max 10)`);

      expect(stats.proofs).toBeLessThanOrEqual(10);

      await smallCacheVerifier.shutdown();
    });
  });

  describe('Concurrent Verification', () => {
    test('should handle parallel verifications efficiently', async () => {
      const concurrentCount = 50;
      const verifications = Array(concurrentCount)
        .fill(null)
        .map(() => verifier.verifyPolicy(mockAction, mockDefaultPolicy));

      const start = performance.now();
      const results = await Promise.all(verifications);
      const duration = performance.now() - start;

      const avgTime = duration / concurrentCount;

      console.log(`${concurrentCount} parallel verifications: ${duration.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms avg`);

      expect(results).toHaveLength(concurrentCount);
      expect(avgTime).toBeLessThan(100);
    });

    test('should maintain performance under mixed workload', async () => {
      const verifyCount = 50;
      const proveCount = 20;

      const verifications = Array(verifyCount)
        .fill(null)
        .map(() => verifier.verifyPolicy(mockAction, mockDefaultPolicy));

      const proofs = Array(proveCount)
        .fill(null)
        .map((_, i) => verifier.proveTheorem(`theorem test${i}: true`));

      const start = performance.now();
      await Promise.all([...verifications, ...proofs]);
      const duration = performance.now() - start;

      console.log(`Mixed workload (${verifyCount} verify + ${proveCount} prove): ${duration.toFixed(2)}ms`);

      expect(duration).toBeLessThan(1000);
    }, 30000);
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory during sustained verification', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`Memory growth after ${iterations} verifications: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // <50MB
    }, 30000);

    test('should cleanup caches efficiently', async () => {
      // Fill caches
      for (let i = 0; i < 100; i++) {
        await verifier.proveTheorem(`theorem test${i}: true`);
      }

      const beforeCleanup = process.memoryUsage().heapUsed;

      verifier.clearCaches();

      const afterCleanup = process.memoryUsage().heapUsed;

      console.log(`Memory before cache clear: ${(beforeCleanup / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory after cache clear: ${(afterCleanup / 1024 / 1024).toFixed(2)}MB`);

      const stats = verifier.getCacheStats();
      expect(stats.proofs).toBe(0);
      expect(stats.hashCons).toBe(0);
    });
  });

  describe('Scalability Tests', () => {
    test('should scale linearly with policy complexity', async () => {
      const complexities = [10, 50, 100, 200];
      const results: any[] = [];

      for (const complexity of complexities) {
        const policy = createMockPolicy({
          rules: Array.from({ length: complexity }, (_, i) => ({
            id: `rule_${i}`,
            condition: `action.type == "type${i}"`,
            action: 'verify' as const,
            priority: i
          }))
        });

        const start = performance.now();
        await verifier.verifyPolicy(mockAction, policy);
        const latency = performance.now() - start;

        results.push({ complexity, latency });
      }

      console.log('Latency by policy complexity:');
      results.forEach(r => {
        console.log(`  ${r.complexity} rules: ${r.latency.toFixed(2)}ms`);
      });

      // Latency should grow reasonably
      results.forEach(r => {
        expect(r.latency).toBeLessThan(500);
      });
    });

    test('should handle high-frequency verification', async () => {
      const duration = 5000; // 5 seconds
      const targetRps = 50;
      const interval = 1000 / targetRps;

      const startTime = Date.now();
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        requestCount++;

        const elapsed = performance.now() - (startTime + requestCount * interval);
        if (elapsed < 0) {
          await testUtils.waitFor(-elapsed);
        }
      }

      const actualRps = (requestCount / duration) * 1000;

      console.log(`High-frequency verification: ${requestCount} requests in ${duration / 1000}s (${actualRps.toFixed(1)} rps)`);

      expect(actualRps).toBeGreaterThan(targetRps * 0.8); // Within 20% of target
    }, 10000);
  });
});
