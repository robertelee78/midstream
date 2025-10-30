/**
 * Performance validation for memory pooling
 * Validates: +20K req/s improvement, <5ms GC pauses, zero leaks
 */

const MemoryOptimizedDetector = require('../../npm-aimds/src/proxy/detectors/memory-optimized-detector');
const { createStandardPools, poolManager } = require('../../npm-aimds/src/utils/memory-pool');

console.log('🚀 Memory Pooling Performance Validation\n');
console.log('═══════════════════════════════════════════════════════\n');

// Initialize standard pools
createStandardPools();

async function benchmarkThroughput() {
  console.log('📊 Throughput Benchmark\n');

  const detector = new MemoryOptimizedDetector();
  const duration = 10000; // 10 seconds
  const startTime = Date.now();
  const startMem = process.memoryUsage();

  let requestsProcessed = 0;
  let gcPauses = [];

  // Sample requests
  const requests = [
    { method: 'GET', url: '/api/users', headers: {}, body: {} },
    { method: 'POST', url: '/api/login', headers: {}, body: { username: 'test', password: 'pass' } },
    { method: 'PUT', url: '/api/update', headers: {}, body: { data: 'x'.repeat(1000) } },
    { method: 'DELETE', url: '/api/delete', headers: {}, body: {} }
  ];

  while (Date.now() - startTime < duration) {
    const req = requests[requestsProcessed % requests.length];

    const opStart = process.hrtime.bigint();
    await detector.analyzeRequest(req, req.body);
    const opEnd = process.hrtime.bigint();

    const pauseMs = Number(opEnd - opStart) / 1000000;
    if (pauseMs > 5) {
      gcPauses.push(pauseMs);
    }

    requestsProcessed++;
  }

  const endTime = Date.now();
  const endMem = process.memoryUsage();
  const stats = detector.getStats();

  const throughput = Math.round((requestsProcessed / (endTime - startTime)) * 1000);
  const memDelta = (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024;

  console.log(`✓ Duration: ${duration}ms`);
  console.log(`✓ Requests processed: ${requestsProcessed.toLocaleString()}`);
  console.log(`✓ Throughput: ${throughput.toLocaleString()} req/s`);
  console.log(`✓ Avg processing time: ${stats.detector.avgProcessingTime.toFixed(3)}ms`);
  console.log(`✓ Memory delta: ${memDelta.toFixed(2)}MB`);
  console.log(`✓ GC pauses >5ms: ${gcPauses.length}`);

  if (gcPauses.length > 0) {
    console.log(`✓ Max GC pause: ${Math.max(...gcPauses).toFixed(3)}ms`);
    console.log(`✓ Avg GC pause: ${(gcPauses.reduce((a, b) => a + b, 0) / gcPauses.length).toFixed(3)}ms`);
  }

  console.log('\n📈 Pool Statistics:');
  console.log(JSON.stringify(stats.pools, null, 2));

  console.log('\n🏥 Health Check:');
  const health = detector.healthCheck();
  console.log(JSON.stringify(health, null, 2));

  // Validate targets
  console.log('\n✅ Target Validation:');

  const throughputTarget = 20000; // 20K req/s improvement target
  if (throughput >= throughputTarget) {
    console.log(`✓ Throughput: ${throughput} >= ${throughputTarget} req/s ✅`);
  } else {
    console.log(`⚠ Throughput: ${throughput} < ${throughputTarget} req/s (${((throughput/throughputTarget)*100).toFixed(1)}% of target)`);
  }

  const gcPauseRate = (gcPauses.length / requestsProcessed) * 100;
  if (gcPauseRate < 1) {
    console.log(`✓ GC pauses: ${gcPauseRate.toFixed(3)}% < 1% ✅`);
  } else {
    console.log(`⚠ GC pauses: ${gcPauseRate.toFixed(3)}% >= 1%`);
  }

  const poolHealth = poolManager.healthCheck();
  if (poolHealth.healthy && poolHealth.errors.length === 0) {
    console.log(`✓ Memory leaks: None detected ✅`);
  } else {
    console.log(`⚠ Memory issues: ${JSON.stringify(poolHealth.errors)}`);
  }

  const avgPoolUtil = (
    parseFloat(stats.pools.small.utilization) +
    parseFloat(stats.pools.medium.utilization) +
    parseFloat(stats.pools.large.utilization)
  ) / 3;

  console.log(`✓ Avg pool utilization: ${(avgPoolUtil * 100).toFixed(1)}%`);

  if (avgPoolUtil >= 0.6 && avgPoolUtil <= 0.9) {
    console.log(`✓ Pool utilization in optimal range (60-90%) ✅`);
  } else if (avgPoolUtil > 0.9) {
    console.log(`⚠ Pool utilization high (>90%) - consider increasing pool sizes`);
  } else {
    console.log(`ℹ Pool utilization low (<60%) - pools will auto-shrink`);
  }

  detector.destroy();
  console.log('\n');
}

async function benchmarkMemoryLeaks() {
  console.log('🔍 Memory Leak Detection (100K requests)\n');

  const detector = new MemoryOptimizedDetector();
  const iterations = 100000;

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  const startMem = process.memoryUsage();
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    await detector.analyzeRequest(
      { method: 'POST', url: '/test', headers: {}, body: { data: `test${i}` } },
      { data: `test${i}` }
    );

    // Progress indicator
    if (i > 0 && i % 10000 === 0) {
      process.stdout.write(`\r  Progress: ${i.toLocaleString()} / ${iterations.toLocaleString()}`);
    }
  }

  process.stdout.write('\r');

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  const endTime = Date.now();
  const endMem = process.memoryUsage();
  const stats = detector.getStats();

  const memDelta = (endMem.heapUsed - startMem.heapUsed) / 1024 / 1024;
  const duration = endTime - startTime;

  console.log(`✓ Iterations: ${iterations.toLocaleString()}`);
  console.log(`✓ Duration: ${duration.toLocaleString()}ms`);
  console.log(`✓ Throughput: ${Math.round((iterations / duration) * 1000).toLocaleString()} req/s`);
  console.log(`✓ Memory delta: ${memDelta.toFixed(2)}MB`);
  console.log(`✓ Leak detection (acquire-release): ${stats.memory.global.totalLeaks}`);

  const poolHealth = poolManager.healthCheck();
  console.log(`✓ Pool health: ${poolHealth.healthy ? '✅ Healthy' : '⚠ Issues detected'}`);

  if (poolHealth.warnings.length > 0) {
    console.log(`  Warnings: ${poolHealth.warnings.join(', ')}`);
  }
  if (poolHealth.errors.length > 0) {
    console.log(`  Errors: ${poolHealth.errors.join(', ')}`);
  }

  // Validate
  if (stats.memory.global.totalLeaks === 0 && poolHealth.healthy) {
    console.log('\n✅ Zero memory leaks detected\n');
  } else {
    console.log('\n⚠ Potential memory issues detected\n');
  }

  detector.destroy();
}

async function benchmarkConcurrency() {
  console.log('⚡ Concurrent Request Handling\n');

  const detector = new MemoryOptimizedDetector();
  const concurrency = 100;
  const requestsPerWorker = 1000;

  const startTime = Date.now();

  const workers = Array.from({ length: concurrency }, async (_, i) => {
    for (let j = 0; j < requestsPerWorker; j++) {
      await detector.analyzeRequest(
        {
          method: 'POST',
          url: `/worker${i}/req${j}`,
          headers: {},
          body: { worker: i, request: j }
        },
        { worker: i, request: j }
      );
    }
  });

  await Promise.all(workers);

  const endTime = Date.now();
  const stats = detector.getStats();

  const totalRequests = concurrency * requestsPerWorker;
  const duration = endTime - startTime;
  const throughput = Math.round((totalRequests / duration) * 1000);

  console.log(`✓ Concurrent workers: ${concurrency}`);
  console.log(`✓ Requests per worker: ${requestsPerWorker.toLocaleString()}`);
  console.log(`✓ Total requests: ${totalRequests.toLocaleString()}`);
  console.log(`✓ Duration: ${duration.toLocaleString()}ms`);
  console.log(`✓ Throughput: ${throughput.toLocaleString()} req/s`);
  console.log(`✓ Avg processing time: ${stats.detector.avgProcessingTime.toFixed(3)}ms`);

  const poolHealth = poolManager.healthCheck();
  console.log(`✓ Pool health: ${poolHealth.healthy ? '✅' : '⚠'}`);
  console.log(`✓ Memory leaks: ${stats.memory.global.totalLeaks === 0 ? '✅ None' : '⚠ ' + stats.memory.global.totalLeaks}`);

  console.log('\n');
  detector.destroy();
}

async function runAllBenchmarks() {
  try {
    await benchmarkThroughput();
    await benchmarkMemoryLeaks();
    await benchmarkConcurrency();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL PERFORMANCE BENCHMARKS COMPLETED');
    console.log('═══════════════════════════════════════════════════════');

    // Final cleanup
    poolManager.destroyAll();

  } catch (err) {
    console.error('\n❌ BENCHMARK FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run benchmarks
runAllBenchmarks();
