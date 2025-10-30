/**
 * Performance Validation Test Suite
 * Tests for 750K+ req/s throughput target
 */

const { describe, test, expect, beforeAll } = require('vitest');
const { ThroughputBenchmark } = require('../../benchmarks/throughput-validation');
const { StressTest } = require('../../benchmarks/stress-test');
const os = require('os');

describe('AI Defence 2.0 - Performance Validation', () => {
  let benchmark;
  let stressTest;

  beforeAll(() => {
    benchmark = new ThroughputBenchmark();
    stressTest = new StressTest({ duration: 5000 }); // 5 second test for CI
  });

  describe('Throughput Benchmarks', () => {
    test('Should achieve 750K+ req/s with full detection suite', async () => {
      const results = await benchmark.runBenchmark();

      // Find the full detection suite result
      const fullSuiteResult = results.find(r =>
        r.scenario.includes('Full Detection')
      );

      expect(fullSuiteResult).toBeDefined();
      expect(fullSuiteResult.reqPerSec).toBeGreaterThanOrEqual(750000);
      expect(fullSuiteResult.passed).toBe(true);
    }, 60000); // 60 second timeout

    test('Should maintain performance with mixed workload', async () => {
      const results = await benchmark.runBenchmark();

      const mixedResult = results.find(r =>
        r.scenario.includes('Mixed Workload')
      );

      expect(mixedResult).toBeDefined();
      expect(mixedResult.reqPerSec).toBeGreaterThanOrEqual(750000);
      expect(mixedResult.passed).toBe(true);
    }, 60000);

    test('Baseline performance should exceed target', async () => {
      const results = await benchmark.runBenchmark();

      const baselineResult = results.find(r =>
        r.scenario.includes('Baseline')
      );

      expect(baselineResult).toBeDefined();
      expect(baselineResult.reqPerSec).toBeGreaterThanOrEqual(750000);
    }, 60000);
  });

  describe('Latency Requirements', () => {
    test('Average latency should be <0.1ms', async () => {
      const results = await benchmark.runBenchmark();

      results.forEach(result => {
        const avgLatency = parseFloat(result.avgLatency);
        expect(avgLatency).toBeLessThan(0.1);
      });
    }, 60000);

    test('P95 latency should be <0.2ms', async () => {
      const results = await benchmark.runBenchmark();

      results.forEach(result => {
        const p95Latency = parseFloat(result.p95Latency);
        expect(p95Latency).toBeLessThan(0.2);
      });
    }, 60000);

    test('P99 latency should be <0.5ms', async () => {
      const results = await benchmark.runBenchmark();

      results.forEach(result => {
        const p99Latency = parseFloat(result.p99Latency);
        expect(p99Latency).toBeLessThan(0.5);
      });
    }, 60000);
  });

  describe('Resource Utilization', () => {
    test('Memory usage should be <200MB per scenario', async () => {
      const results = await benchmark.runBenchmark();

      results.forEach(result => {
        const memoryMB = result.memoryUsage / 1024 / 1024;
        expect(memoryMB).toBeLessThan(200);
      });
    }, 60000);

    test('Should handle concurrent load across all CPUs', async () => {
      const result = await stressTest.run();

      expect(result.workers).toBe(os.cpus().length);
      expect(result.reqPerSec).toBeGreaterThanOrEqual(750000);
      expect(result.passed).toBe(true);
    }, 30000);
  });

  describe('Stability and Consistency', () => {
    test('Should maintain consistent performance across test duration', async () => {
      const results = await benchmark.runBenchmark();

      // Check that all scenarios pass
      const allPassed = results.every(r => r.passed);
      expect(allPassed).toBe(true);
    }, 60000);

    test('Should detect threats accurately under high load', async () => {
      const result = await stressTest.run();

      // Should detect some threats in the test inputs
      expect(result.totalThreats).toBeGreaterThan(0);

      // Threat detection ratio should be reasonable (we use ~25% threat inputs)
      const threatRatio = result.totalThreats / result.totalRequests;
      expect(threatRatio).toBeGreaterThan(0.15); // At least 15%
      expect(threatRatio).toBeLessThan(0.35); // At most 35%
    }, 30000);
  });

  describe('Performance Grades', () => {
    test('Should achieve A or better grade', async () => {
      const results = await benchmark.runBenchmark();

      // Calculate overall performance score
      const avgThroughput = results.reduce((sum, r) => sum + r.reqPerSec, 0) / results.length;
      const avgLatency = results.reduce((sum, r) => sum + parseFloat(r.avgLatency), 0) / results.length;

      let score = 0;

      // Throughput scoring
      if (avgThroughput >= 750000) score += 40;
      else if (avgThroughput >= 500000) score += 30;
      else score += 20;

      // Latency scoring
      if (avgLatency < 0.1) score += 30;
      else if (avgLatency < 0.2) score += 20;
      else score += 10;

      // Consistency scoring (all passed)
      const allPassed = results.every(r => r.passed);
      if (allPassed) score += 30;

      expect(score).toBeGreaterThanOrEqual(80); // A grade = 80+
    }, 60000);
  });

  describe('Target Achievement', () => {
    test('Should achieve at least 100% of target throughput', async () => {
      const results = await benchmark.runBenchmark();

      results.forEach(result => {
        const achievement = parseFloat(result.targetAchievement);
        expect(achievement).toBeGreaterThanOrEqual(100);
      });
    }, 60000);

    test('Multi-worker test should achieve target', async () => {
      const result = await stressTest.run();

      const achievement = parseFloat(result.targetAchievement);
      expect(achievement).toBeGreaterThanOrEqual(100);
    }, 30000);
  });
});
