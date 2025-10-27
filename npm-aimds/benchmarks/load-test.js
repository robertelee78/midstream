#!/usr/bin/env node

/**
 * Load Testing for AIMDS QUIC Server
 * Benchmarks server performance under load
 */

import { performance } from 'perf_hooks';

class LoadTester {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'http://localhost:3000/detect',
      concurrency: config.concurrency || 100,
      totalRequests: config.totalRequests || 10000,
      warmupRequests: config.warmupRequests || 100,
      ...config
    };

    this.results = {
      successful: 0,
      failed: 0,
      totalTime: 0,
      times: [],
      errors: []
    };
  }

  async warmup() {
    console.log(`Warming up with ${this.config.warmupRequests} requests...`);

    const promises = [];
    for (let i = 0; i < this.config.warmupRequests; i++) {
      promises.push(this.sendRequest('Warmup request'));
    }

    await Promise.all(promises);
    console.log('Warmup complete\n');
  }

  async sendRequest(text) {
    const start = performance.now();

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const end = performance.now();
      const duration = end - start;

      if (response.ok) {
        await response.json();
        return { success: true, duration };
      } else {
        return { success: false, duration, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      const end = performance.now();
      return { success: false, duration: end - start, error: error.message };
    }
  }

  async runBatch(batchSize, batchId) {
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      const text = `Test request ${batchId * batchSize + i}`;
      promises.push(this.sendRequest(text));
    }

    const results = await Promise.all(promises);

    for (const result of results) {
      if (result.success) {
        this.results.successful++;
      } else {
        this.results.failed++;
        this.results.errors.push(result.error);
      }

      this.results.times.push(result.duration);
      this.results.totalTime += result.duration;
    }
  }

  async run() {
    console.log('AIMDS Load Test');
    console.log('='.repeat(60));
    console.log(`URL:         ${this.config.url}`);
    console.log(`Concurrency: ${this.config.concurrency}`);
    console.log(`Requests:    ${this.config.totalRequests}`);
    console.log('='.repeat(60), '\n');

    // Warmup
    await this.warmup();

    // Main test
    const startTime = performance.now();
    const batches = Math.ceil(this.config.totalRequests / this.config.concurrency);

    console.log(`Running ${batches} batches...`);

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(
        this.config.concurrency,
        this.config.totalRequests - i * this.config.concurrency
      );

      await this.runBatch(batchSize, i);

      // Progress indicator
      const progress = ((i + 1) / batches * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${progress}% [${i + 1}/${batches} batches]`);
    }

    const endTime = performance.now();
    const totalTestTime = endTime - startTime;

    console.log('\n\n' + '='.repeat(60));
    this.printResults(totalTestTime);
  }

  printResults(totalTestTime) {
    const times = this.results.times.sort((a, b) => a - b);
    const total = this.results.successful + this.results.failed;

    // Calculate percentiles
    const p50 = times[Math.floor(times.length * 0.5)];
    const p90 = times[Math.floor(times.length * 0.9)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    // Calculate throughput
    const throughput = (this.results.successful / (totalTestTime / 1000)).toFixed(2);

    console.log('Results:');
    console.log('-'.repeat(60));
    console.log(`Total Requests:      ${total}`);
    console.log(`Successful:          ${this.results.successful} (${(this.results.successful / total * 100).toFixed(2)}%)`);
    console.log(`Failed:              ${this.results.failed} (${(this.results.failed / total * 100).toFixed(2)}%)`);
    console.log('');
    console.log(`Total Time:          ${(totalTestTime / 1000).toFixed(2)}s`);
    console.log(`Throughput:          ${throughput} req/s`);
    console.log('');
    console.log('Response Times (ms):');
    console.log(`  Min:               ${times[0].toFixed(2)}`);
    console.log(`  Max:               ${times[times.length - 1].toFixed(2)}`);
    console.log(`  Mean:              ${(this.results.totalTime / times.length).toFixed(2)}`);
    console.log(`  Median (p50):      ${p50.toFixed(2)}`);
    console.log(`  p90:               ${p90.toFixed(2)}`);
    console.log(`  p95:               ${p95.toFixed(2)}`);
    console.log(`  p99:               ${p99.toFixed(2)}`);
    console.log('='.repeat(60));

    // Performance rating
    const targetThroughput = 89421 / 8; // Per-core target
    const efficiency = (parseFloat(throughput) / targetThroughput * 100).toFixed(2);

    console.log('\nPerformance Rating:');
    if (efficiency >= 90) {
      console.log(`  ✓ EXCELLENT: ${efficiency}% of target (${targetThroughput.toFixed(0)} req/s)`);
    } else if (efficiency >= 70) {
      console.log(`  ✓ GOOD: ${efficiency}% of target (${targetThroughput.toFixed(0)} req/s)`);
    } else if (efficiency >= 50) {
      console.log(`  ⚠ FAIR: ${efficiency}% of target (${targetThroughput.toFixed(0)} req/s)`);
    } else {
      console.log(`  ✗ POOR: ${efficiency}% of target (${targetThroughput.toFixed(0)} req/s)`);
    }

    if (this.results.errors.length > 0) {
      console.log('\nSample Errors:');
      const uniqueErrors = [...new Set(this.results.errors)];
      uniqueErrors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];

    if (key === 'url') config.url = value;
    else if (key === 'concurrency') config.concurrency = parseInt(value);
    else if (key === 'requests') config.totalRequests = parseInt(value);
  }

  const tester = new LoadTester(config);

  tester.run()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Load test failed:', err);
      process.exit(1);
    });
}

export default LoadTester;
