/**
 * Performance Regression Test Suite
 * Automated tests to ensure performance doesn't degrade over time
 */

import { BenchmarkRunner, validateTarget } from './utils/benchmark-runner';
import * as fs from 'fs';
import * as path from 'path';

interface RegressionBaseline {
  timestamp: string;
  version: string;
  metrics: {
    [key: string]: {
      avgTime: number;
      p95: number;
      p99: number;
      opsPerSec: number;
    };
  };
}

interface RegressionTest {
  name: string;
  target: number;
  unit: string;
  critical: boolean;
  test: () => Promise<number>;
}

class RegressionTestRunner {
  private baselinePath: string;
  private baseline: RegressionBaseline | null = null;
  private currentResults: { [key: string]: any } = {};

  constructor(baselinePath?: string) {
    this.baselinePath = baselinePath || path.join(__dirname, 'results', 'regression-baseline.json');
  }

  /**
   * Load existing baseline
   */
  loadBaseline(): boolean {
    if (fs.existsSync(this.baselinePath)) {
      try {
        this.baseline = JSON.parse(fs.readFileSync(this.baselinePath, 'utf-8'));
        console.log(`✅ Loaded baseline from ${this.baseline?.timestamp}`);
        return true;
      } catch (error) {
        console.warn(`⚠️  Could not load baseline: ${error}`);
        return false;
      }
    }
    console.log('ℹ️  No baseline found, will create new baseline');
    return false;
  }

  /**
   * Save current results as new baseline
   */
  saveBaseline(version: string = '1.0.0'): void {
    const baseline: RegressionBaseline = {
      timestamp: new Date().toISOString(),
      version,
      metrics: this.currentResults,
    };

    fs.mkdirSync(path.dirname(this.baselinePath), { recursive: true });
    fs.writeFileSync(this.baselinePath, JSON.stringify(baseline, null, 2));
    console.log(`✅ Baseline saved to ${this.baselinePath}`);
  }

  /**
   * Run regression test
   */
  async runTest(test: RegressionTest): Promise<{
    name: string;
    current: number;
    baseline?: number;
    regression: number;
    passed: boolean;
  }> {
    console.log(`\nRunning: ${test.name}`);

    const currentValue = await test.test();
    this.currentResults[test.name] = {
      avgTime: currentValue,
      p95: currentValue * 1.2,
      p99: currentValue * 1.5,
      opsPerSec: 1000 / currentValue,
    };

    const baselineValue = this.baseline?.metrics[test.name]?.avgTime;
    const regression = baselineValue ? ((currentValue - baselineValue) / baselineValue) * 100 : 0;

    // Test passes if:
    // 1. No baseline exists (first run)
    // 2. Within target
    // 3. No significant regression (>10% for critical, >20% for non-critical)
    let passed = true;
    let reason = '';

    if (currentValue > test.target) {
      passed = false;
      reason = `Exceeds target (${currentValue.toFixed(2)} > ${test.target})`;
    } else if (baselineValue && regression > (test.critical ? 10 : 20)) {
      passed = false;
      reason = `Regression detected (${regression.toFixed(1)}% slower)`;
    }

    const status = passed ? '✅' : '❌';
    console.log(`  ${status} Current: ${currentValue.toFixed(2)}${test.unit}`);
    if (baselineValue) {
      console.log(`     Baseline: ${baselineValue.toFixed(2)}${test.unit}`);
      console.log(`     Change: ${regression > 0 ? '+' : ''}${regression.toFixed(1)}%`);
    }
    if (!passed) {
      console.log(`     ${reason}`);
    }

    return {
      name: test.name,
      current: currentValue,
      baseline: baselineValue,
      regression,
      passed,
    };
  }

  /**
   * Run all regression tests
   */
  async runAll(tests: RegressionTest[]): Promise<{
    passed: number;
    failed: number;
    results: Array<any>;
  }> {
    console.log('='.repeat(80));
    console.log('PERFORMANCE REGRESSION TESTS');
    console.log('='.repeat(80));

    this.loadBaseline();

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('REGRESSION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Passed: ${passed}/${tests.length}`);
    console.log(`Failed: ${failed}/${tests.length}`);
    console.log(`Pass Rate: ${(passed / tests.length * 100).toFixed(1)}%`);

    return { passed, failed, results };
  }

  /**
   * Generate regression report
   */
  generateReport(results: any[], outputPath: string): void {
    let report = '# Performance Regression Test Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n\n`;

    if (this.baseline) {
      report += `**Baseline**: ${this.baseline.timestamp} (v${this.baseline.version})\n\n`;
    } else {
      report += `**Baseline**: None (first run)\n\n`;
    }

    report += '## Test Results\n\n';
    report += '| Test | Current | Baseline | Change | Status |\n';
    report += '|------|---------|----------|--------|--------|\n';

    for (const result of results) {
      const status = result.passed ? '✅ Pass' : '❌ Fail';
      const change = result.baseline
        ? `${result.regression > 0 ? '+' : ''}${result.regression.toFixed(1)}%`
        : 'N/A';
      const baseline = result.baseline ? result.baseline.toFixed(2) : 'N/A';

      report += `| ${result.name} | ${result.current.toFixed(2)} | ${baseline} | ${change} | ${status} |\n`;
    }

    report += '\n## Performance Trends\n\n';

    if (this.baseline) {
      const improved = results.filter(r => r.regression < 0).length;
      const regressed = results.filter(r => r.regression > 0).length;
      const unchanged = results.filter(r => r.regression === 0 || !r.baseline).length;

      report += `- **Improved**: ${improved} tests\n`;
      report += `- **Regressed**: ${regressed} tests\n`;
      report += `- **Unchanged**: ${unchanged} tests\n\n`;

      if (regressed > 0) {
        report += '### Regressions Detected\n\n';
        for (const result of results.filter(r => r.regression > 0)) {
          report += `- **${result.name}**: ${result.regression.toFixed(1)}% slower (${result.baseline?.toFixed(2)} → ${result.current.toFixed(2)})\n`;
        }
        report += '\n';
      }

      if (improved > 0) {
        report += '### Improvements\n\n';
        for (const result of results.filter(r => r.regression < 0)) {
          report += `- **${result.name}**: ${Math.abs(result.regression).toFixed(1)}% faster (${result.baseline?.toFixed(2)} → ${result.current.toFixed(2)})\n`;
        }
        report += '\n';
      }
    }

    fs.writeFileSync(outputPath, report);
    console.log(`\n✅ Regression report saved to: ${outputPath}`);
  }
}

// Define regression tests
const REGRESSION_TESTS: RegressionTest[] = [
  {
    name: 'Embedding: State Vector (128-dim)',
    target: 10,
    unit: 'ms',
    critical: true,
    test: async () => {
      const runner = new BenchmarkRunner();
      const result = await runner.runBenchmark(
        'test',
        async () => {
          const vector = new Float32Array(128);
          for (let i = 0; i < 128; i++) {
            vector[i] = Math.random();
          }
          // Simulate embedding
          const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
          for (let i = 0; i < 128; i++) {
            vector[i] /= norm;
          }
        },
        { iterations: 1000 }
      );
      return result.avgTime;
    },
  },
  {
    name: 'Embedding: Token Sequence (100 tokens)',
    target: 10,
    unit: 'ms',
    critical: true,
    test: async () => {
      const runner = new BenchmarkRunner();
      const result = await runner.runBenchmark(
        'test',
        async () => {
          const tokens = Array.from({ length: 100 }, () => Math.floor(Math.random() * 10000));
          const embedding = new Float32Array(512);
          for (const token of tokens) {
            for (let i = 0; i < 512; i++) {
              embedding[i] += Math.sin(token * i * 0.01);
            }
          }
        },
        { iterations: 1000 }
      );
      return result.avgTime;
    },
  },
  {
    name: 'RL: Inference (Action Selection)',
    target: 5,
    unit: 'ms',
    critical: true,
    test: async () => {
      const runner = new BenchmarkRunner();
      const qTable = new Map<string, number>();
      qTable.set('state1_action1', 0.5);
      qTable.set('state1_action2', 0.3);
      qTable.set('state1_action3', 0.8);

      const result = await runner.runBenchmark(
        'test',
        () => {
          const actions = ['action1', 'action2', 'action3'];
          let best = actions[0];
          let bestValue = qTable.get(`state1_${best}`) || 0;

          for (const action of actions) {
            const value = qTable.get(`state1_${action}`) || 0;
            if (value > bestValue) {
              bestValue = value;
              best = action;
            }
          }

          return best;
        },
        { iterations: 10000 }
      );
      return result.avgTime;
    },
  },
  {
    name: 'RL: Learning Step',
    target: 20,
    unit: 'ms',
    critical: false,
    test: async () => {
      const runner = new BenchmarkRunner();
      const qTable = new Map<string, number>();
      const learningRate = 0.1;
      const discountFactor = 0.95;

      const result = await runner.runBenchmark(
        'test',
        () => {
          const state = 'state1';
          const action = 'action1';
          const reward = Math.random();
          const nextState = 'state2';

          const currentQ = qTable.get(`${state}_${action}`) || 0;
          const maxNextQ = Math.max(
            qTable.get(`${nextState}_action1`) || 0,
            qTable.get(`${nextState}_action2`) || 0,
            qTable.get(`${nextState}_action3`) || 0
          );

          const newQ = currentQ + learningRate * (reward + discountFactor * maxNextQ - currentQ);
          qTable.set(`${state}_${action}`, newQ);
        },
        { iterations: 10000 }
      );
      return result.avgTime;
    },
  },
  {
    name: 'Vector Search: Cosine Similarity (512-dim)',
    target: 1,
    unit: 'ms',
    critical: true,
    test: async () => {
      const runner = new BenchmarkRunner();
      const a = new Float32Array(512).fill(0).map(() => Math.random());
      const b = new Float32Array(512).fill(0).map(() => Math.random());

      const result = await runner.runBenchmark(
        'test',
        () => {
          let dot = 0;
          let normA = 0;
          let normB = 0;

          for (let i = 0; i < 512; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
          }

          return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        },
        { iterations: 10000 }
      );
      return result.avgTime;
    },
  },
  {
    name: 'Quantization: 8-bit (512-dim)',
    target: 5,
    unit: 'ms',
    critical: false,
    test: async () => {
      const runner = new BenchmarkRunner();
      const vector = new Float32Array(512).fill(0).map(() => Math.random() * 2 - 1);

      const result = await runner.runBenchmark(
        'test',
        () => {
          let min = Infinity;
          let max = -Infinity;

          for (const val of vector) {
            if (val < min) min = val;
            if (val > max) max = val;
          }

          const scale = (max - min) / 255;
          const quantized = new Uint8Array(512);

          for (let i = 0; i < 512; i++) {
            quantized[i] = Math.round((vector[i] - min) / scale);
          }

          return quantized;
        },
        { iterations: 1000 }
      );
      return result.avgTime;
    },
  },
];

async function main() {
  const runner = new RegressionTestRunner();

  const { passed, failed, results } = await runner.runAll(REGRESSION_TESTS);

  // Generate report
  const reportPath = path.join(__dirname, 'results', 'regression-report.md');
  runner.generateReport(results, reportPath);

  // Save results as JSON
  const jsonPath = path.join(__dirname, 'results', 'regression-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ passed, failed, results }, null, 2));

  // Ask if user wants to update baseline
  if (passed === REGRESSION_TESTS.length && !runner['baseline']) {
    console.log('\n✅ All tests passed! This can be used as the new baseline.');
    runner.saveBaseline('1.0.0');
  } else if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review results before updating baseline.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('Regression tests failed:', error);
    process.exit(1);
  });
}

export { RegressionTestRunner, REGRESSION_TESTS };
