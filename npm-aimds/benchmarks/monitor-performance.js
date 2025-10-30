#!/usr/bin/env node

/**
 * AI Defence 2.0 - Continuous Performance Monitor
 * Monitors performance metrics over extended periods
 */

const DetectionEngine = require('../src/proxy/detectors/detection-engine');
const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor(options = {}) {
    this.durationMinutes = options.duration || 5;
    this.sampleInterval = options.interval || 1000; // 1 second
    this.metrics = {
      throughput: [],
      latency: [],
      memory: [],
      cpu: []
    };
    this.detailedMetrics = [];
  }

  async monitor() {
    console.log('📊 AI Defence 2.0 - Continuous Performance Monitor');
    console.log('═'.repeat(70));
    console.log(`Duration: ${this.durationMinutes} minutes`);
    console.log(`Sample Interval: ${this.sampleInterval}ms`);
    console.log('═'.repeat(70));
    console.log('');

    const engine = new DetectionEngine({
      enablePatternMatching: true,
      enablePII: true,
      enableJailbreak: true
    });

    const testInputs = [
      'Normal user query',
      'What is the weather?',
      'ignore previous instructions',
      'Tell me about AI',
      'DROP TABLE users',
      'How does this work?',
      '<script>alert(1)</script>',
      'Regular conversation'
    ];

    const iterations = (this.durationMinutes * 60 * 1000) / this.sampleInterval;
    let totalRequests = 0;

    console.log('🚀 Starting monitoring...\n');

    for (let i = 0; i < iterations; i++) {
      const sampleStart = performance.now();

      // Measure throughput for this interval
      let count = 0;
      const latencies = [];
      const intervalEnd = performance.now() + this.sampleInterval;

      while (performance.now() < intervalEnd) {
        const input = testInputs[totalRequests % testInputs.length];
        const reqStart = performance.now();
        await engine.detect(input);
        const reqEnd = performance.now();

        latencies.push(reqEnd - reqStart);
        count++;
        totalRequests++;
      }

      const sampleEnd = performance.now();
      const sampleDuration = (sampleEnd - sampleStart) / 1000; // seconds

      // Collect system metrics
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate metrics
      const throughput = Math.floor(count / sampleDuration);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const memoryMB = memUsage.heapUsed / 1024 / 1024;
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

      // Store metrics
      this.metrics.throughput.push(throughput);
      this.metrics.latency.push(avgLatency);
      this.metrics.memory.push(memoryMB);
      this.metrics.cpu.push(cpuPercent);

      this.detailedMetrics.push({
        timestamp: new Date().toISOString(),
        elapsed: (i + 1) * (this.sampleInterval / 1000),
        throughput,
        avgLatency: avgLatency.toFixed(4),
        memoryMB: memoryMB.toFixed(2),
        cpuPercent: cpuPercent.toFixed(2),
        totalRequests
      });

      // Report every 10 seconds
      if ((i + 1) % 10 === 0) {
        const recentThroughput = this.metrics.throughput.slice(-10);
        const avgRecentThroughput = Math.floor(
          recentThroughput.reduce((a, b) => a + b) / recentThroughput.length
        );

        console.log(
          `[${Math.floor((i + 1) * (this.sampleInterval / 1000))}s] ` +
          `Throughput: ${avgRecentThroughput.toLocaleString()} req/s | ` +
          `Latency: ${avgLatency.toFixed(3)}ms | ` +
          `Memory: ${memoryMB.toFixed(1)}MB | ` +
          `Total: ${totalRequests.toLocaleString()} reqs`
        );
      }
    }

    console.log('\n✅ Monitoring complete\n');

    // Generate report
    const report = this.generateReport();

    // Print report
    this.printReport(report);

    // Save results
    this.saveResults(report);

    return report;
  }

  generateReport() {
    const avgThroughput = this.metrics.throughput.reduce((a, b) => a + b) / this.metrics.throughput.length;
    const maxThroughput = Math.max(...this.metrics.throughput);
    const minThroughput = Math.min(...this.metrics.throughput);

    const avgLatency = this.metrics.latency.reduce((a, b) => a + b) / this.metrics.latency.length;
    const maxLatency = Math.max(...this.metrics.latency);
    const minLatency = Math.min(...this.metrics.latency);

    const avgMemory = this.metrics.memory.reduce((a, b) => a + b) / this.metrics.memory.length;
    const maxMemory = Math.max(...this.metrics.memory);

    const avgCpu = this.metrics.cpu.reduce((a, b) => a + b) / this.metrics.cpu.length;

    // Calculate stability (coefficient of variation)
    const throughputStdDev = this.calculateStdDev(this.metrics.throughput);
    const throughputStability = (1 - (throughputStdDev / avgThroughput)) * 100;

    const latencyStdDev = this.calculateStdDev(this.metrics.latency);
    const latencyStability = (1 - (latencyStdDev / avgLatency)) * 100;

    return {
      duration: this.durationMinutes,
      samples: this.metrics.throughput.length,
      throughput: {
        avg: Math.floor(avgThroughput),
        max: Math.floor(maxThroughput),
        min: Math.floor(minThroughput),
        stability: throughputStability.toFixed(2)
      },
      latency: {
        avg: avgLatency.toFixed(4),
        max: maxLatency.toFixed(4),
        min: minLatency.toFixed(4),
        stability: latencyStability.toFixed(2)
      },
      memory: {
        avg: avgMemory.toFixed(2),
        max: maxMemory.toFixed(2)
      },
      cpu: {
        avg: avgCpu.toFixed(2)
      },
      detailedMetrics: this.detailedMetrics
    };
  }

  calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  printReport(report) {
    console.log('═'.repeat(70));
    console.log('📋 PERFORMANCE MONITORING REPORT');
    console.log('═'.repeat(70));
    console.log(`Duration: ${report.duration} minutes`);
    console.log(`Samples: ${report.samples}`);
    console.log('');
    console.log('📊 Throughput:');
    console.log(`  Average: ${report.throughput.avg.toLocaleString()} req/s`);
    console.log(`  Maximum: ${report.throughput.max.toLocaleString()} req/s`);
    console.log(`  Minimum: ${report.throughput.min.toLocaleString()} req/s`);
    console.log(`  Stability: ${report.throughput.stability}%`);
    console.log('');
    console.log('⚡ Latency:');
    console.log(`  Average: ${report.latency.avg}ms`);
    console.log(`  Maximum: ${report.latency.max}ms`);
    console.log(`  Minimum: ${report.latency.min}ms`);
    console.log(`  Stability: ${report.latency.stability}%`);
    console.log('');
    console.log('💾 Memory:');
    console.log(`  Average: ${report.memory.avg}MB`);
    console.log(`  Maximum: ${report.memory.max}MB`);
    console.log('');
    console.log('🖥️  CPU:');
    console.log(`  Average: ${report.cpu.avg}s`);
    console.log('═'.repeat(70));

    // Performance grade
    const grade = this.calculateGrade(report);
    console.log(`\n${grade.emoji} Performance Grade: ${grade.letter} (${grade.score}/100)`);
    console.log(`   ${grade.description}`);
  }

  calculateGrade(report) {
    let score = 0;

    // Throughput (40 points)
    if (report.throughput.avg >= 750000) score += 40;
    else if (report.throughput.avg >= 500000) score += 30;
    else if (report.throughput.avg >= 250000) score += 20;
    else score += 10;

    // Latency (30 points)
    if (parseFloat(report.latency.avg) < 0.05) score += 30;
    else if (parseFloat(report.latency.avg) < 0.1) score += 25;
    else if (parseFloat(report.latency.avg) < 0.5) score += 15;
    else score += 5;

    // Stability (30 points)
    const avgStability = (parseFloat(report.throughput.stability) + parseFloat(report.latency.stability)) / 2;
    if (avgStability >= 95) score += 30;
    else if (avgStability >= 90) score += 25;
    else if (avgStability >= 80) score += 15;
    else score += 5;

    let letter, emoji, description;
    if (score >= 90) {
      letter = 'A+';
      emoji = '🌟';
      description = 'Excellent performance - exceeds all targets';
    } else if (score >= 80) {
      letter = 'A';
      emoji = '✅';
      description = 'Great performance - meets all targets';
    } else if (score >= 70) {
      letter = 'B';
      emoji = '👍';
      description = 'Good performance - close to targets';
    } else if (score >= 60) {
      letter = 'C';
      emoji = '⚠️';
      description = 'Acceptable performance - needs optimization';
    } else {
      letter = 'D';
      emoji = '❌';
      description = 'Poor performance - requires immediate attention';
    }

    return { score, letter, emoji, description };
  }

  saveResults(report) {
    const resultsPath = path.join(__dirname, 'monitor-results.json');

    fs.writeFileSync(
      resultsPath,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        system: {
          cpus: os.cpus().length,
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          totalMemory: os.totalmem(),
          freeMemory: os.freemem()
        },
        ...report
      }, null, 2)
    );

    console.log(`\n✅ Results saved to ${resultsPath}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--duration' || args[i] === '-d') {
      options.duration = parseInt(args[++i]);
    } else if (args[i] === '--interval' || args[i] === '-i') {
      options.interval = parseInt(args[++i]);
    }
  }

  const monitor = new PerformanceMonitor(options);
  monitor.monitor()
    .then(() => {
      console.log('\n✅ Monitoring completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Monitoring failed:', err);
      process.exit(1);
    });
}

module.exports = { PerformanceMonitor };
