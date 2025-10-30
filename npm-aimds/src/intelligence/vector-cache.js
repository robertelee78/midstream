const crypto = require('crypto');

/**
 * High-performance vector search cache for AgentDB integration
 *
 * Features:
 * - Fast embedding hash-based caching
 * - TTL-based expiration (default 1 hour)
 * - LRU eviction at capacity
 * - Comprehensive metrics tracking
 * - Target: 60%+ cache hit rate, +50K req/s throughput
 */
class VectorSearchCache {
  constructor(config = {}) {
    this.maxSize = config.maxSize || 5000;
    this.ttl = config.ttl || 3600000; // 1 hour default
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.startTime = Date.now();
  }

  /**
   * Generate cache key from embedding vector
   * @param {Float32Array|Array} embedding - Vector embedding
   * @param {number} k - Number of results
   * @param {number} threshold - Similarity threshold
   * @returns {string} Cache key
   */
  getKey(embedding, k, threshold) {
    const hash = this.hashVector(embedding);
    return `${hash}-${k}-${threshold}`;
  }

  /**
   * Fast hash function for Float32Array
   * Samples every 8th element for speed vs accuracy tradeoff
   * @param {Float32Array|Array} embedding - Vector to hash
   * @returns {string} MD5 hash
   */
  hashVector(embedding) {
    // Sample every 8th element for speed (12.5% sampling)
    const samples = [];
    for (let i = 0; i < embedding.length; i += 8) {
      samples.push(embedding[i]);
    }

    // Create hash from samples
    const buffer = Buffer.from(new Float32Array(samples).buffer);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Retrieve cached results
   * @param {Float32Array|Array} embedding - Query embedding
   * @param {number} k - Number of results
   * @param {number} threshold - Similarity threshold
   * @returns {Array|null} Cached results or null
   */
  async get(embedding, k, threshold) {
    const key = this.getKey(embedding, k, threshold);
    const cached = this.cache.get(key);

    if (!cached) {
      this.misses++;
      return null;
    }

    // Check TTL expiration
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // LRU: Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, cached);
    this.hits++;

    return cached.results;
  }

  /**
   * Store results in cache
   * @param {Float32Array|Array} embedding - Query embedding
   * @param {number} k - Number of results
   * @param {number} threshold - Similarity threshold
   * @param {Array} results - Search results to cache
   */
  set(embedding, k, threshold, results) {
    const key = this.getKey(embedding, k, threshold);

    // Evict oldest (first) entry if at capacity (LRU)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.evictions++;
    }

    this.cache.set(key, {
      results: results,
      timestamp: Date.now()
    });
  }

  /**
   * Wrapper for cached vector search
   * @param {Object} vectorStore - Vector store instance
   * @param {Float32Array|Array} embedding - Query embedding
   * @param {number} k - Number of results
   * @param {number} threshold - Similarity threshold
   * @returns {Promise<Array>} Search results
   */
  async cachedSearch(vectorStore, embedding, k, threshold) {
    // Check cache first
    const cached = await this.get(embedding, k, threshold);
    if (cached) {
      return cached;
    }

    // Cache miss - perform actual search
    const results = await vectorStore._searchSimilarUncached(embedding, k, threshold);

    // Store in cache
    this.set(embedding, k, threshold, results);

    return results;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache metrics
   */
  stats() {
    const total = this.hits + this.misses;
    const uptime = Date.now() - this.startTime;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? (this.hits / total) : 0,
      missRate: total > 0 ? (this.misses / total) : 0,
      totalRequests: total,
      memoryUsage: this.estimateMemoryUsage(),
      uptime: uptime,
      requestsPerSecond: total > 0 ? (total / (uptime / 1000)) : 0
    };
  }

  /**
   * Estimate memory usage
   * @returns {number} Estimated bytes
   */
  estimateMemoryUsage() {
    // Rough estimate: 1KB per cache entry (key + results + metadata)
    return this.cache.size * 1024;
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match
   * @returns {number} Number of invalidated entries
   */
  invalidateByPattern(pattern) {
    let invalidated = 0;
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  /**
   * Clear expired entries
   * @returns {number} Number of cleared entries
   */
  clearExpired() {
    const now = Date.now();
    let cleared = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all cache entries and reset metrics
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache efficiency metrics
   * @returns {Object} Efficiency metrics
   */
  getEfficiency() {
    const stats = this.stats();

    return {
      hitRate: stats.hitRate,
      effectiveCapacity: stats.size / stats.maxSize,
      evictionRate: stats.evictions / Math.max(stats.totalRequests, 1),
      avgRequestsPerSecond: stats.requestsPerSecond,
      memoryEfficiency: stats.size > 0 ? stats.hits / stats.size : 0
    };
  }
}

/**
 * Periodic cache cleanup manager
 */
class VectorCacheManager {
  constructor(cache, cleanupInterval = 300000) { // 5 minutes default
    this.cache = cache;
    this.cleanupInterval = cleanupInterval;
    this.cleanupTimer = null;
    this.isRunning = false;
  }

  /**
   * Start periodic cleanup
   */
  start() {
    if (this.isRunning) {
      console.warn('[VectorCacheManager] Already running');
      return;
    }

    this.isRunning = true;
    this.cleanupTimer = setInterval(() => {
      const cleared = this.cache.clearExpired();
      if (cleared > 0) {
        console.log(`[VectorCacheManager] Cleared ${cleared} expired vector cache entries`);
      }
    }, this.cleanupInterval);

    console.log(`[VectorCacheManager] Started with ${this.cleanupInterval}ms interval`);
  }

  /**
   * Stop periodic cleanup
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.isRunning = false;
      console.log('[VectorCacheManager] Stopped');
    }
  }

  /**
   * Get manager status
   * @returns {Object} Status
   */
  status() {
    return {
      isRunning: this.isRunning,
      cleanupInterval: this.cleanupInterval,
      cacheStats: this.cache.stats()
    };
  }
}

module.exports = {
  VectorSearchCache,
  VectorCacheManager
};
