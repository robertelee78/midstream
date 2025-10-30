/**
 * AI Defence Memory Pooling System
 * High-performance buffer pool with auto-scaling and zero-copy operations
 * Target: <5ms GC pauses, +20K req/s throughput improvement
 */

class BufferPool {
  constructor(config = {}) {
    this.bufferSize = config.bufferSize || 1024;
    this.initialSize = config.initialSize || 100;
    this.maxSize = config.maxSize || 1000;
    this.autoScale = config.autoScale !== false;
    this.shrinkInterval = config.shrinkInterval || 60000; // 60s default
    this.shrinkThreshold = config.shrinkThreshold || 0.3; // 30% utilization

    this.available = [];
    this.inUse = new Set();
    this.totalAllocated = 0;
    this.acquisitions = 0;
    this.releases = 0;
    this.exhaustionEvents = 0;
    this.createdAt = Date.now();
    this.lastShrink = Date.now();

    // Pre-allocate initial buffers
    this.preallocate(this.initialSize);

    // Auto-shrink timer
    if (this.autoScale) {
      this.shrinkTimer = setInterval(() => this.autoShrink(), this.shrinkInterval);
      // Don't prevent process exit
      if (this.shrinkTimer.unref) this.shrinkTimer.unref();
    }
  }

  preallocate(count) {
    for (let i = 0; i < count; i++) {
      const buffer = Buffer.alloc(this.bufferSize);
      this.available.push(buffer);
      this.totalAllocated++;
    }
  }

  acquire() {
    this.acquisitions++;

    let buffer;
    if (this.available.length > 0) {
      buffer = this.available.pop();
    } else {
      // Pool exhausted
      this.exhaustionEvents++;

      if (this.autoScale && this.totalAllocated < this.maxSize) {
        // Allocate new buffer
        buffer = Buffer.alloc(this.bufferSize);
        this.totalAllocated++;
      } else {
        throw new Error(
          `Buffer pool exhausted (max: ${this.maxSize}, in use: ${this.inUse.size})`
        );
      }
    }

    this.inUse.add(buffer);
    return buffer;
  }

  release(buffer) {
    this.releases++;

    // CRITICAL FIX: Throw error on double-release to catch bugs early
    if (!this.inUse.has(buffer)) {
      const error = new Error(
        `Cannot release buffer: not acquired from this pool (ID: ${buffer.id || 'unknown'}). ` +
        `This indicates a double-release bug that could corrupt pool state.`
      );
      console.error('❌ CRITICAL:', error.message);
      throw error;
    }

    this.inUse.delete(buffer);

    // Clear buffer before returning to pool (security + prevent leaks)
    buffer.fill(0);

    this.available.push(buffer);
  }

  /**
   * Auto-release pattern with try-finally
   * Ensures buffer is always released even on errors
   */
  async withBuffer(fn) {
    const buffer = this.acquire();
    try {
      return await fn(buffer);
    } finally {
      this.release(buffer);
    }
  }

  /**
   * Synchronous version of withBuffer
   */
  withBufferSync(fn) {
    const buffer = this.acquire();
    try {
      return fn(buffer);
    } finally {
      this.release(buffer);
    }
  }

  stats() {
    const uptime = Date.now() - this.createdAt;
    const utilization = this.totalAllocated > 0
      ? this.inUse.size / this.totalAllocated
      : 0;

    return {
      bufferSize: this.bufferSize,
      available: this.available.length,
      inUse: this.inUse.size,
      totalAllocated: this.totalAllocated,
      utilization: utilization.toFixed(3),
      acquisitions: this.acquisitions,
      releases: this.releases,
      exhaustionEvents: this.exhaustionEvents,
      memoryUsageMB: ((this.totalAllocated * this.bufferSize) / (1024 * 1024)).toFixed(2),
      uptimeMs: uptime,
      acquisitionsPerSec: uptime > 0 ? Math.round((this.acquisitions / uptime) * 1000) : 0,
      leakDetection: this.acquisitions - this.releases
    };
  }

  /**
   * Automatic shrinking based on utilization
   */
  autoShrink() {
    const utilization = this.totalAllocated > 0
      ? this.inUse.size / this.totalAllocated
      : 0;

    // Only shrink if utilization is below threshold and we have excess buffers
    if (utilization < this.shrinkThreshold && this.available.length > this.initialSize) {
      const targetSize = Math.max(this.initialSize, Math.ceil(this.inUse.size / 0.7));
      this.shrink(targetSize);
      this.lastShrink = Date.now();
    }
  }

  /**
   * Manually shrink pool to target size
   */
  shrink(targetSize) {
    const initialSize = this.available.length;
    while (this.available.length > targetSize && this.available.length > 0) {
      this.available.pop();
      this.totalAllocated--;
    }
    const shrunk = initialSize - this.available.length;
    if (shrunk > 0) {
      console.log(`Pool shrunk by ${shrunk} buffers (utilization was low)`);
    }
  }

  /**
   * Gracefully destroy pool
   */
  destroy() {
    if (this.shrinkTimer) {
      clearInterval(this.shrinkTimer);
    }
    this.available = [];
    this.inUse.clear();
    this.totalAllocated = 0;
  }
}

/**
 * Global pool manager for multiple buffer pools
 */
class MemoryPoolManager {
  constructor() {
    this.pools = new Map();
    this.globalStats = {
      totalAcquisitions: 0,
      totalReleases: 0,
      totalExhaustions: 0
    };
  }

  /**
   * Get or create a named pool
   */
  getPool(name, config) {
    if (!this.pools.has(name)) {
      this.pools.set(name, new BufferPool(config));
    }
    return this.pools.get(name);
  }

  /**
   * Get pool by name (returns undefined if not exists)
   */
  getExistingPool(name) {
    return this.pools.get(name);
  }

  /**
   * Get statistics for all pools
   */
  getStats() {
    const stats = {
      pools: {},
      global: {
        totalPools: this.pools.size,
        totalMemoryMB: 0,
        totalAcquisitions: 0,
        totalReleases: 0,
        totalExhaustions: 0,
        totalLeaks: 0
      }
    };

    for (const [name, pool] of this.pools.entries()) {
      const poolStats = pool.stats();
      stats.pools[name] = poolStats;

      // Aggregate global stats
      stats.global.totalMemoryMB += parseFloat(poolStats.memoryUsageMB);
      stats.global.totalAcquisitions += poolStats.acquisitions;
      stats.global.totalReleases += poolStats.releases;
      stats.global.totalExhaustions += poolStats.exhaustionEvents;
      stats.global.totalLeaks += poolStats.leakDetection;
    }

    return stats;
  }

  /**
   * Destroy a specific pool
   */
  destroyPool(name) {
    const pool = this.pools.get(name);
    if (pool) {
      pool.destroy();
      this.pools.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Destroy all pools
   */
  destroyAll() {
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
  }

  /**
   * Health check across all pools
   */
  healthCheck() {
    const stats = this.getStats();
    const health = {
      healthy: true,
      warnings: [],
      errors: []
    };

    // Check for memory leaks
    if (stats.global.totalLeaks > 100) {
      health.healthy = false;
      health.errors.push(`Memory leak detected: ${stats.global.totalLeaks} unreleased buffers`);
    } else if (stats.global.totalLeaks > 10) {
      health.warnings.push(`Potential memory leak: ${stats.global.totalLeaks} unreleased buffers`);
    }

    // Check for frequent exhaustions
    if (stats.global.totalExhaustions > 1000) {
      health.warnings.push('High pool exhaustion rate - consider increasing pool sizes');
    }

    // Check individual pool utilization
    for (const [name, poolStats] of Object.entries(stats.pools)) {
      const util = parseFloat(poolStats.utilization);
      if (util > 0.95) {
        health.warnings.push(`Pool "${name}" is ${(util * 100).toFixed(1)}% utilized`);
      }
    }

    return health;
  }
}

// Singleton instance
const poolManager = new MemoryPoolManager();

/**
 * Helper function to create standard pools for AI Defence
 */
function createStandardPools() {
  // Small buffers for quick operations (1KB)
  poolManager.getPool('small', {
    bufferSize: 1024,
    initialSize: 200,
    maxSize: 2000
  });

  // Medium buffers for typical payloads (8KB)
  poolManager.getPool('medium', {
    bufferSize: 8192,
    initialSize: 100,
    maxSize: 1000
  });

  // Large buffers for bulk operations (64KB)
  poolManager.getPool('large', {
    bufferSize: 65536,
    initialSize: 50,
    maxSize: 500
  });

  console.log('Standard memory pools initialized');
}

module.exports = {
  BufferPool,
  MemoryPoolManager,
  poolManager,
  createStandardPools
};
