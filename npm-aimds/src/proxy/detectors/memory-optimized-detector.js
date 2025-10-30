/**
 * Memory-Optimized Detector
 * Integrates memory pooling for zero-copy threat detection
 * Target: +20K req/s throughput, <5ms GC pauses
 */

const { poolManager } = require('../../utils/memory-pool');

class MemoryOptimizedDetector {
  constructor(config = {}) {
    this.config = config;

    // Initialize buffer pools
    this.smallPool = poolManager.getPool('detector-small', {
      bufferSize: 1024,      // 1KB for headers/metadata
      initialSize: 200,
      maxSize: 2000,
      autoScale: true
    });

    this.mediumPool = poolManager.getPool('detector-medium', {
      bufferSize: 8192,      // 8KB for typical payloads
      initialSize: 100,
      maxSize: 1000,
      autoScale: true
    });

    this.largePool = poolManager.getPool('detector-large', {
      bufferSize: 65536,     // 64KB for bulk operations
      initialSize: 50,
      maxSize: 500,
      autoScale: true
    });

    this.stats = {
      requestsProcessed: 0,
      threatsDetected: 0,
      avgProcessingTime: 0,
      poolHits: 0,
      poolMisses: 0
    };
  }

  /**
   * Select appropriate pool based on data size
   */
  selectPool(dataSize) {
    if (dataSize <= 1024) return this.smallPool;
    if (dataSize <= 8192) return this.mediumPool;
    return this.largePool;
  }

  /**
   * Analyze request with memory pooling
   */
  async analyzeRequest(req, body) {
    const startTime = process.hrtime.bigint();

    try {
      // Estimate data size
      const bodySize = Buffer.byteLength(JSON.stringify(body || {}));
      const pool = this.selectPool(bodySize);

      // Use pooled buffer for analysis
      const result = await pool.withBuffer(async (buffer) => {
        // Write data to buffer (zero-copy when possible)
        const data = JSON.stringify({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body
        });

        buffer.write(data.slice(0, buffer.length));

        // Perform threat detection
        return this.detectThreats(buffer, data);
      });

      this.stats.poolHits++;
      this.stats.requestsProcessed++;

      if (result.threats.length > 0) {
        this.stats.threatsDetected++;
      }

      // Update avg processing time
      const endTime = process.hrtime.bigint();
      const processingTime = Number(endTime - startTime) / 1000000;
      this.stats.avgProcessingTime =
        (this.stats.avgProcessingTime * (this.stats.requestsProcessed - 1) + processingTime)
        / this.stats.requestsProcessed;

      return result;

    } catch (err) {
      this.stats.poolMisses++;
      console.error('Detection error:', err);
      return {
        threats: [],
        error: err.message,
        confidence: 0
      };
    }
  }

  /**
   * Detect threats from buffer
   */
  detectThreats(buffer, data) {
    const threats = [];
    const dataLower = data.toLowerCase();

    // SQL Injection patterns
    if (this.containsSQLInjection(dataLower)) {
      threats.push({
        type: 'sql_injection',
        severity: 'high',
        confidence: 0.95,
        details: 'SQL injection pattern detected'
      });
    }

    // XSS patterns
    if (this.containsXSS(dataLower)) {
      threats.push({
        type: 'xss',
        severity: 'high',
        confidence: 0.92,
        details: 'XSS pattern detected'
      });
    }

    // Command Injection
    if (this.containsCommandInjection(dataLower)) {
      threats.push({
        type: 'command_injection',
        severity: 'critical',
        confidence: 0.97,
        details: 'Command injection pattern detected'
      });
    }

    // Path Traversal
    if (this.containsPathTraversal(data)) {
      threats.push({
        type: 'path_traversal',
        severity: 'high',
        confidence: 0.90,
        details: 'Path traversal pattern detected'
      });
    }

    return {
      threats,
      confidence: threats.length > 0 ? Math.max(...threats.map(t => t.confidence)) : 1.0,
      timestamp: Date.now()
    };
  }

  containsSQLInjection(data) {
    const sqlPatterns = [
      /union\s+select/i,
      /or\s+1\s*=\s*1/i,
      /'\s*or\s*'1'\s*=\s*'1/i,
      /;\s*drop\s+table/i,
      /--\s*$/m,
      /\/\*.*\*\//
    ];
    return sqlPatterns.some(pattern => pattern.test(data));
  }

  containsXSS(data) {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /<img[^>]+src[^>]*>/i,
      /eval\s*\(/i
    ];
    return xssPatterns.some(pattern => pattern.test(data));
  }

  containsCommandInjection(data) {
    const cmdPatterns = [
      /;\s*rm\s+-rf/i,
      /\|\s*nc\s+/i,
      /&&\s*cat\s+/i,
      /`.*`/,
      /\$\(.*\)/
    ];
    return cmdPatterns.some(pattern => pattern.test(data));
  }

  containsPathTraversal(data) {
    const pathPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i
    ];
    return pathPatterns.some(pattern => pattern.test(data));
  }

  /**
   * Get detector statistics including pool stats
   */
  getStats() {
    return {
      detector: this.stats,
      pools: {
        small: this.smallPool.stats(),
        medium: this.mediumPool.stats(),
        large: this.largePool.stats()
      },
      memory: poolManager.getStats()
    };
  }

  /**
   * Health check including pool health
   */
  healthCheck() {
    const poolHealth = poolManager.healthCheck();
    const detectorHealth = {
      healthy: this.stats.poolMisses / Math.max(1, this.stats.requestsProcessed) < 0.01,
      avgProcessingTime: this.stats.avgProcessingTime,
      threatDetectionRate: this.stats.threatsDetected / Math.max(1, this.stats.requestsProcessed)
    };

    return {
      detector: detectorHealth,
      pools: poolHealth
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    // Pools are managed globally, so just reset stats
    this.stats = {
      requestsProcessed: 0,
      threatsDetected: 0,
      avgProcessingTime: 0,
      poolHits: 0,
      poolMisses: 0
    };
  }
}

module.exports = MemoryOptimizedDetector;
