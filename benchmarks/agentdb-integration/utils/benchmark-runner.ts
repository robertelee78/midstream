/**
 * Benchmark Runner Utility
 * Provides common infrastructure for running performance benchmarks
 */

import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  opsPerSec: number;
  memoryUsed?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  measureMemory?: boolean;
  gc?: boolean;
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark function multiple times and collect statistics
   */
  async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 1000,
      warmupIterations = 100,
      measureMemory = true,
      gc = true,
    } = options;

    // Warmup phase
    console.log(`[${name}] Warming up (${warmupIterations} iterations)...`);
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    // Force garbage collection if available
    if (gc && global.gc) {
      global.gc();
    }

    // Measurement phase
    console.log(`[${name}] Running benchmark (${iterations} iterations)...`);
    const times: number[] = [];
    const memBefore = measureMemory ? process.memoryUsage() : null;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const memAfter = measureMemory ? process.memoryUsage() : null;

    // Calculate statistics
    times.sort((a, b) => a - b);
    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / iterations;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const p50 = times[Math.floor(iterations * 0.5)];
    const p95 = times[Math.floor(iterations * 0.95)];
    const p99 = times[Math.floor(iterations * 0.99)];
    const opsPerSec = 1000 / avgTime;

    const result: BenchmarkResult = {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      p50,
      p95,
      p99,
      opsPerSec,
    };

    if (memBefore && memAfter) {
      result.memoryUsed = {
        heapUsed: memAfter.heapUsed - memBefore.heapUsed,
        heapTotal: memAfter.heapTotal - memBefore.heapTotal,
        external: memAfter.external - memBefore.external,
        rss: memAfter.rss - memBefore.rss,
      };
    }

    this.results.push(result);
    return result;
  }

  /**
   * Print formatted benchmark results
   */
  printResults(result: BenchmarkResult): void {
    console.log(`\n=== ${result.name} ===`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Average: ${result.avgTime.toFixed(3)}ms`);
    console.log(`Min: ${result.minTime.toFixed(3)}ms`);
    console.log(`Max: ${result.maxTime.toFixed(3)}ms`);
    console.log(`P50: ${result.p50.toFixed(3)}ms`);
    console.log(`P95: ${result.p95.toFixed(3)}ms`);
    console.log(`P99: ${result.p99.toFixed(3)}ms`);
    console.log(`Ops/sec: ${result.opsPerSec.toFixed(2)}`);

    if (result.memoryUsed) {
      console.log(`Memory (heap): ${(result.memoryUsed.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory (RSS): ${(result.memoryUsed.rss / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * Get all collected results
   */
  getResults(): BenchmarkResult[] {
    return this.results;
  }

  /**
   * Export results to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.results, null, 2);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(): string {
    let report = '# Benchmark Results\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Summary\n\n';
    report += '| Benchmark | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Ops/sec |\n';
    report += '|-----------|----------|----------|----------|----------|---------|\n';

    for (const result of this.results) {
      report += `| ${result.name} | ${result.avgTime.toFixed(3)} | ${result.p50.toFixed(3)} | ${result.p95.toFixed(3)} | ${result.p99.toFixed(3)} | ${result.opsPerSec.toFixed(2)} |\n`;
    }

    report += '\n## Detailed Results\n\n';

    for (const result of this.results) {
      report += `### ${result.name}\n\n`;
      report += `- **Iterations**: ${result.iterations}\n`;
      report += `- **Total Time**: ${result.totalTime.toFixed(3)}ms\n`;
      report += `- **Average**: ${result.avgTime.toFixed(3)}ms\n`;
      report += `- **Min**: ${result.minTime.toFixed(3)}ms\n`;
      report += `- **Max**: ${result.maxTime.toFixed(3)}ms\n`;
      report += `- **P50**: ${result.p50.toFixed(3)}ms\n`;
      report += `- **P95**: ${result.p95.toFixed(3)}ms\n`;
      report += `- **P99**: ${result.p99.toFixed(3)}ms\n`;
      report += `- **Ops/sec**: ${result.opsPerSec.toFixed(2)}\n`;

      if (result.memoryUsed) {
        report += `- **Memory (Heap)**: ${(result.memoryUsed.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
        report += `- **Memory (RSS)**: ${(result.memoryUsed.rss / 1024 / 1024).toFixed(2)}MB\n`;
      }

      report += '\n';
    }

    return report;
  }
}

/**
 * Compare two benchmark results and calculate improvement
 */
export function compareBenchmarks(baseline: BenchmarkResult, optimized: BenchmarkResult): {
  speedup: number;
  improvement: number;
  summary: string;
} {
  const speedup = baseline.avgTime / optimized.avgTime;
  const improvement = ((baseline.avgTime - optimized.avgTime) / baseline.avgTime) * 100;

  const summary = improvement > 0
    ? `${speedup.toFixed(2)}x faster (${improvement.toFixed(1)}% improvement)`
    : `${(1 / speedup).toFixed(2)}x slower (${Math.abs(improvement).toFixed(1)}% regression)`;

  return { speedup, improvement, summary };
}

/**
 * Validate performance against target
 */
export function validateTarget(result: BenchmarkResult, targetMs: number): {
  passed: boolean;
  margin: number;
  summary: string;
} {
  const passed = result.avgTime <= targetMs;
  const margin = ((result.avgTime - targetMs) / targetMs) * 100;

  const summary = passed
    ? `✅ PASSED: ${result.avgTime.toFixed(3)}ms <= ${targetMs}ms (${Math.abs(margin).toFixed(1)}% under target)`
    : `❌ FAILED: ${result.avgTime.toFixed(3)}ms > ${targetMs}ms (${margin.toFixed(1)}% over target)`;

  return { passed, margin, summary };
}
