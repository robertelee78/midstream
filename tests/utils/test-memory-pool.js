/**
 * Comprehensive tests for Memory Pooling System
 * Tests: acquire/release, memory leaks, auto-scaling, GC pauses, concurrent access
 */

const { BufferPool, MemoryPoolManager, poolManager, createStandardPools } = require('../../npm-aimds/src/utils/memory-pool');
const assert = require('assert');

console.log('🧪 Memory Pool Test Suite\n');

// Test 1: Basic Acquire/Release
function testBasicAcquireRelease() {
  console.log('Test 1: Basic Acquire/Release');
  const pool = new BufferPool({ bufferSize: 1024, initialSize: 10, maxSize: 20 });

  const buffer = pool.acquire();
  assert(buffer instanceof Buffer, 'Should return a Buffer');
  assert.strictEqual(buffer.length, 1024, 'Buffer should be correct size');

  const stats1 = pool.stats();
  assert.strictEqual(stats1.inUse, 1, 'Should have 1 buffer in use');
  assert.strictEqual(stats1.available, 9, 'Should have 9 available');

  pool.release(buffer);
  const stats2 = pool.stats();
  assert.strictEqual(stats2.inUse, 0, 'Should have 0 buffers in use');
  assert.strictEqual(stats2.available, 10, 'Should have 10 available');

  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 2: Auto-scaling
function testAutoScaling() {
  console.log('Test 2: Auto-scaling');
  const pool = new BufferPool({ bufferSize: 512, initialSize: 5, maxSize: 20 });

  const buffers = [];
  // Exhaust initial pool
  for (let i = 0; i < 10; i++) {
    buffers.push(pool.acquire());
  }

  const stats = pool.stats();
  assert.strictEqual(stats.totalAllocated, 10, 'Should have auto-scaled to 10');
  assert.strictEqual(stats.inUse, 10, 'All buffers should be in use');
  assert(stats.exhaustionEvents > 0, 'Should record exhaustion events');

  // Release all
  buffers.forEach(b => pool.release(b));
  const stats2 = pool.stats();
  assert.strictEqual(stats2.inUse, 0, 'All should be released');

  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 3: Max limit enforcement
function testMaxLimit() {
  console.log('Test 3: Max Limit Enforcement');
  const pool = new BufferPool({ bufferSize: 256, initialSize: 2, maxSize: 5 });

  const buffers = [];
  for (let i = 0; i < 5; i++) {
    buffers.push(pool.acquire());
  }

  let threw = false;
  try {
    pool.acquire(); // Should throw
  } catch (err) {
    threw = true;
    assert(err.message.includes('exhausted'), 'Should throw exhausted error');
  }
  assert(threw, 'Should have thrown on exceeding max');

  buffers.forEach(b => pool.release(b));
  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 4: withBuffer pattern
async function testWithBufferPattern() {
  console.log('Test 4: withBuffer Pattern');
  const pool = new BufferPool({ bufferSize: 1024, initialSize: 10 });

  let bufferInCallback;
  const result = await pool.withBuffer(async (buffer) => {
    bufferInCallback = buffer;
    assert(buffer instanceof Buffer, 'Should receive buffer');
    buffer.write('test data');
    return 'success';
  });

  assert.strictEqual(result, 'success', 'Should return callback result');
  assert(!pool.inUse.has(bufferInCallback), 'Buffer should be released');
  assert.strictEqual(pool.stats().inUse, 0, 'No buffers in use');

  // Test error handling
  try {
    await pool.withBuffer(async () => {
      throw new Error('Test error');
    });
  } catch (err) {
    assert.strictEqual(err.message, 'Test error', 'Should propagate error');
  }
  assert.strictEqual(pool.stats().inUse, 0, 'Buffer should be released on error');

  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 5: Memory leak detection (100K cycles)
async function testMemoryLeakDetection() {
  console.log('Test 5: Memory Leak Detection (100K cycles)');
  const pool = new BufferPool({ bufferSize: 512, initialSize: 50, maxSize: 100 });

  const cycles = 100000;
  const startMem = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  for (let i = 0; i < cycles; i++) {
    await pool.withBuffer(async (buffer) => {
      buffer.write(`iteration ${i}`);
    });
  }

  const endTime = Date.now();
  const endMem = process.memoryUsage().heapUsed;
  const stats = pool.stats();

  console.log(`  Cycles: ${cycles}`);
  console.log(`  Time: ${endTime - startTime}ms`);
  console.log(`  Memory delta: ${((endMem - startMem) / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Leak detection: ${stats.leakDetection}`);
  console.log(`  Ops/sec: ${Math.round(cycles / ((endTime - startTime) / 1000))}`);

  assert.strictEqual(stats.leakDetection, 0, 'Should have zero leaks');
  assert.strictEqual(stats.inUse, 0, 'All buffers released');

  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 6: Concurrent access
async function testConcurrentAccess() {
  console.log('Test 6: Concurrent Access');
  const pool = new BufferPool({ bufferSize: 1024, initialSize: 50, maxSize: 200 });

  const concurrentOps = 100;
  const promises = [];

  for (let i = 0; i < concurrentOps; i++) {
    promises.push(
      pool.withBuffer(async (buffer) => {
        buffer.write(`concurrent op ${i}`);
        // Simulate async work
        await new Promise(resolve => setImmediate(resolve));
        return i;
      })
    );
  }

  const results = await Promise.all(promises);
  assert.strictEqual(results.length, concurrentOps, 'All ops completed');

  const stats = pool.stats();
  assert.strictEqual(stats.inUse, 0, 'All buffers released');
  assert.strictEqual(stats.leakDetection, 0, 'No leaks');

  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 7: Pool manager
function testPoolManager() {
  console.log('Test 7: Pool Manager');
  const manager = new MemoryPoolManager();

  const pool1 = manager.getPool('test1', { bufferSize: 512, initialSize: 10 });
  const pool2 = manager.getPool('test2', { bufferSize: 1024, initialSize: 20 });

  // Same pool returned for same name
  const pool1Again = manager.getPool('test1');
  assert.strictEqual(pool1, pool1Again, 'Should return same pool instance');

  pool1.acquire();
  pool2.acquire();
  pool2.acquire();

  const stats = manager.getStats();
  assert.strictEqual(stats.pools.test1.inUse, 1, 'Pool1 has 1 in use');
  assert.strictEqual(stats.pools.test2.inUse, 2, 'Pool2 has 2 in use');
  assert.strictEqual(stats.global.totalPools, 2, 'Should have 2 pools');

  manager.destroyAll();
  console.log('✅ PASS\n');
}

// Test 8: Health check
function testHealthCheck() {
  console.log('Test 8: Health Check');
  const manager = new MemoryPoolManager();

  const pool = manager.getPool('health-test', { bufferSize: 1024, initialSize: 10 });

  // Initial health should be good
  let health = manager.healthCheck();
  assert.strictEqual(health.healthy, true, 'Should be healthy initially');

  // Simulate leak
  for (let i = 0; i < 15; i++) {
    pool.acquire(); // Acquire without release
  }

  health = manager.healthCheck();
  assert(health.warnings.length > 0 || !health.healthy, 'Should detect leak');

  manager.destroyAll();
  console.log('✅ PASS\n');
}

// Test 9: Buffer clearing (security)
function testBufferClearing() {
  console.log('Test 9: Buffer Clearing (Security)');
  const pool = new BufferPool({ bufferSize: 1024, initialSize: 5 });

  const buffer1 = pool.acquire();
  buffer1.write('sensitive data');
  pool.release(buffer1);

  const buffer2 = pool.acquire();
  // Buffer should be cleared
  const cleared = buffer2.slice(0, 14).every(byte => byte === 0);
  assert(cleared, 'Buffer should be cleared after release');

  pool.release(buffer2);
  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 10: GC pause measurement
async function testGCPauses() {
  console.log('Test 10: GC Pause Measurement');

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  const pool = new BufferPool({ bufferSize: 4096, initialSize: 100, maxSize: 500 });

  const iterations = 50000;
  const pauseThreshold = 5; // 5ms threshold
  let maxPause = 0;
  let pausesOverThreshold = 0;

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();

    await pool.withBuffer(async (buffer) => {
      buffer.write(`data ${i}`);
    });

    const end = process.hrtime.bigint();
    const pauseMs = Number(end - start) / 1000000;

    if (pauseMs > maxPause) maxPause = pauseMs;
    if (pauseMs > pauseThreshold) pausesOverThreshold++;
  }

  console.log(`  Max pause: ${maxPause.toFixed(3)}ms`);
  console.log(`  Pauses > ${pauseThreshold}ms: ${pausesOverThreshold}`);
  console.log(`  Success rate: ${((1 - pausesOverThreshold/iterations) * 100).toFixed(2)}%`);

  // Most operations should be under threshold
  const successRate = 1 - (pausesOverThreshold / iterations);
  assert(successRate > 0.95, 'Should have <5% operations over threshold');

  pool.destroy();
  console.log('✅ PASS\n');
}

// Test 11: Standard pools
function testStandardPools() {
  console.log('Test 11: Standard Pools Creation');

  // Clean up any existing pools
  poolManager.destroyAll();

  createStandardPools();

  const stats = poolManager.getStats();
  assert(stats.pools.small, 'Should have small pool');
  assert(stats.pools.medium, 'Should have medium pool');
  assert(stats.pools.large, 'Should have large pool');

  assert.strictEqual(stats.pools.small.bufferSize, 1024, 'Small pool: 1KB');
  assert.strictEqual(stats.pools.medium.bufferSize, 8192, 'Medium pool: 8KB');
  assert.strictEqual(stats.pools.large.bufferSize, 65536, 'Large pool: 64KB');

  poolManager.destroyAll();
  console.log('✅ PASS\n');
}

// Test 12: Shrinking
function testShrinking() {
  console.log('Test 12: Pool Shrinking');
  const pool = new BufferPool({
    bufferSize: 1024,
    initialSize: 10,
    maxSize: 100,
    autoScale: true // Enable auto-scale
  });

  // Grow pool
  const buffers = [];
  for (let i = 0; i < 50; i++) {
    buffers.push(pool.acquire());
  }
  assert.strictEqual(pool.stats().totalAllocated, 50, 'Should have 50 allocated');

  // Release all
  buffers.forEach(b => pool.release(b));

  // Shrink to 20
  pool.shrink(20);
  assert.strictEqual(pool.stats().available, 20, 'Should shrink to 20');
  assert.strictEqual(pool.stats().totalAllocated, 20, 'Total allocated should be 20');

  // Verify can still acquire after shrinking (with auto-scale)
  const newBuffer = pool.acquire();
  assert(newBuffer, 'Should be able to acquire after shrink');
  pool.release(newBuffer);

  pool.destroy();
  console.log('✅ PASS\n');
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   AI Defence 2.0 - Memory Pool Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    testBasicAcquireRelease();
    testAutoScaling();
    testMaxLimit();
    await testWithBufferPattern();
    await testMemoryLeakDetection();
    await testConcurrentAccess();
    testPoolManager();
    testHealthCheck();
    testBufferClearing();
    await testGCPauses();
    testStandardPools();
    testShrinking();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
