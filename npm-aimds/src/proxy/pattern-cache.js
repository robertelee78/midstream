/**
 * Pattern Cache for AI Defence 2.0
 *
 * High-performance LRU cache with TTL for frequently detected patterns.
 * Targets 70%+ cache hit rate and +50K req/s throughput improvement.
 *
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - Configurable TTL (Time To Live) for cache entries
 * - SHA-256 hashing for cache keys
 * - Comprehensive hit/miss tracking
 * - Memory-efficient storage (<100MB for 10K entries)
 * - Thread-safe operations
 */

const crypto = require('crypto');

class PatternCache {
  /**
   * Initialize pattern cache with configurable capacity and TTL
   *
   * @param {number} maxSize - Maximum number of cache entries (default: 10000)
   * @param {number} ttl - Time-to-live in milliseconds (default: 3600000 = 1 hour)
   */
  constructor(maxSize = 10000, ttl = 3600000) {
    // Map preserves insertion order, making LRU implementation efficient
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;

    // Performance tracking
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
    this.totalSets = 0;

    // Memory tracking
    this.memoryUsageBytes = 0;

    // Timestamps
    this.createdAt = Date.now();
    this.lastAccessAt = Date.now();
  }

  /**
   * Hash input text to create cache key using SHA-256
   *
   * @param {string} text - Input text to hash
   * @returns {string} - 64-character hex hash
   */
  hash(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  /**
   * Get cached detection result by input text
   *
   * @param {string} text - Input text to lookup
   * @returns {Object|null} - Cached result or null if not found/expired
   */
  get(text) {
    this.lastAccessAt = Date.now();
    const key = this.hash(text);
    const cached = this.cache.get(key);

    // Cache miss
    if (!cached) {
      this.misses++;
      return null;
    }

    // Check TTL expiration
    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      this.expirations++;
      this.updateMemoryUsage();
      return null;
    }

    // LRU: Move accessed entry to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, cached);

    this.hits++;

    // Return result with cache metadata
    return {
      ...cached.result,
      fromCache: true,
      cachedAt: cached.timestamp,
      cacheAge: now - cached.timestamp
    };
  }

  /**
   * Store detection result in cache
   *
   * @param {string} text - Input text
   * @param {Object} result - Detection result to cache
   */
  set(text, result) {
    const key = this.hash(text);
    const now = Date.now();

    // Evict oldest entry if at capacity (LRU)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.evictions++;
    }

    // Store with metadata
    this.cache.set(key, {
      result: { ...result }, // Clone to prevent mutation
      timestamp: now,
      accessCount: 1
    });

    this.totalSets++;
    this.lastAccessAt = now;
    this.updateMemoryUsage();
  }

  /**
   * Check if entry exists in cache (without incrementing hit count)
   *
   * @param {string} text - Input text to check
   * @returns {boolean} - True if entry exists and not expired
   */
  has(text) {
    const key = this.hash(text);
    const cached = this.cache.get(key);

    if (!cached) return false;

    // Check TTL
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Delete specific entry from cache
   *
   * @param {string} text - Input text to delete
   * @returns {boolean} - True if entry was deleted
   */
  delete(text) {
    const key = this.hash(text);
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.updateMemoryUsage();
    }

    return deleted;
  }

  /**
   * Get comprehensive cache statistics
   *
   * @returns {Object} - Statistics including hit rate, size, memory usage
   */
  stats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    const fillRate = this.cache.size / this.maxSize;
    const uptimeMs = Date.now() - this.createdAt;

    return {
      // Size metrics
      size: this.cache.size,
      maxSize: this.maxSize,
      fillRate: (fillRate * 100).toFixed(2) + '%',

      // Hit/miss metrics
      hits: this.hits,
      misses: this.misses,
      total: total,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      hitRateDecimal: hitRate,

      // Eviction metrics
      evictions: this.evictions,
      expirations: this.expirations,
      totalSets: this.totalSets,

      // Memory metrics
      memoryUsageMB: (this.memoryUsageBytes / (1024 * 1024)).toFixed(2),
      memoryUsageBytes: this.memoryUsageBytes,
      avgEntrySize: this.cache.size > 0
        ? (this.memoryUsageBytes / this.cache.size).toFixed(0)
        : 0,

      // Time metrics
      ttlMs: this.ttl,
      ttlSeconds: (this.ttl / 1000).toFixed(0),
      uptimeMs: uptimeMs,
      uptimeSeconds: (uptimeMs / 1000).toFixed(0),
      lastAccessAt: new Date(this.lastAccessAt).toISOString(),

      // Performance metrics
      requestsPerSecond: uptimeMs > 0
        ? ((total / uptimeMs) * 1000).toFixed(2)
        : 0
    };
  }

  /**
   * Get detailed performance report
   *
   * @returns {Object} - Detailed performance metrics
   */
  getPerformanceReport() {
    const stats = this.stats();
    const entries = Array.from(this.cache.entries());

    // Analyze cache entry ages
    const now = Date.now();
    const ages = entries.map(([, entry]) => now - entry.timestamp);
    const avgAge = ages.length > 0
      ? ages.reduce((a, b) => a + b, 0) / ages.length
      : 0;

    return {
      ...stats,
      cacheEfficiency: {
        hitRate: stats.hitRateDecimal,
        evictionRate: this.totalSets > 0
          ? (this.evictions / this.totalSets).toFixed(4)
          : 0,
        expirationRate: this.totalSets > 0
          ? (this.expirations / this.totalSets).toFixed(4)
          : 0
      },
      entryMetrics: {
        averageAge: (avgAge / 1000).toFixed(2) + 's',
        oldestEntry: ages.length > 0
          ? (Math.max(...ages) / 1000).toFixed(2) + 's'
          : 'N/A',
        newestEntry: ages.length > 0
          ? (Math.min(...ages) / 1000).toFixed(2) + 's'
          : 'N/A'
      },
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Generate recommendations based on cache statistics
   *
   * @param {Object} stats - Current cache statistics
   * @returns {Array<string>} - Array of recommendation strings
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.hitRateDecimal < 0.5) {
      recommendations.push('Low hit rate (<50%). Consider increasing cache size or TTL.');
    } else if (stats.hitRateDecimal >= 0.7) {
      recommendations.push('Excellent hit rate (≥70%). Cache is performing optimally.');
    }

    if (stats.fillRate > '95%') {
      recommendations.push('Cache nearly full (>95%). Consider increasing maxSize.');
    }

    if (this.evictions > this.totalSets * 0.3) {
      recommendations.push('High eviction rate (>30%). Increase cache size for better performance.');
    }

    if (this.expirations > this.totalSets * 0.3) {
      recommendations.push('High expiration rate (>30%). Consider increasing TTL.');
    }

    const memoryMB = this.memoryUsageBytes / (1024 * 1024);
    if (memoryMB > 100) {
      recommendations.push('Memory usage exceeds 100MB. Consider reducing cache size.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache is well-tuned and performing optimally.');
    }

    return recommendations;
  }

  /**
   * Update memory usage estimate
   * Estimates based on average JavaScript object size
   */
  updateMemoryUsage() {
    // Rough estimate: 200 bytes per entry (key + value + metadata)
    this.memoryUsageBytes = this.cache.size * 200;
  }

  /**
   * Clear all cache entries and reset statistics
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
    this.totalSets = 0;
    this.memoryUsageBytes = 0;
    this.createdAt = Date.now();
    this.lastAccessAt = Date.now();
  }

  /**
   * Prune expired entries from cache
   *
   * @returns {number} - Number of entries pruned
   */
  prune() {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        this.expirations++;
        pruned++;
      }
    }

    if (pruned > 0) {
      this.updateMemoryUsage();
    }

    return pruned;
  }

  /**
   * Warm up cache with common patterns
   *
   * @param {Array<{text: string, result: Object}>} patterns - Patterns to pre-load
   */
  warmUp(patterns) {
    for (const { text, result } of patterns) {
      this.set(text, result);
    }
  }

  /**
   * Export cache state for persistence
   *
   * @returns {Object} - Serializable cache state
   */
  export() {
    return {
      config: {
        maxSize: this.maxSize,
        ttl: this.ttl
      },
      stats: this.stats(),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        result: entry.result,
        timestamp: entry.timestamp
      }))
    };
  }

  /**
   * Import cache state from exported data
   *
   * @param {Object} data - Exported cache state
   */
  import(data) {
    this.clear();

    if (data.config) {
      this.maxSize = data.config.maxSize;
      this.ttl = data.config.ttl;
    }

    if (data.entries) {
      const now = Date.now();

      for (const { key, result, timestamp } of data.entries) {
        // Only import non-expired entries
        if (now - timestamp <= this.ttl) {
          this.cache.set(key, {
            result,
            timestamp,
            accessCount: 1
          });
        }
      }

      this.updateMemoryUsage();
    }
  }
}

module.exports = { PatternCache };
