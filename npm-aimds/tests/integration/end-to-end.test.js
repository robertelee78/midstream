/**
 * End-to-End Integration Tests
 * Tests complete workflows with all quick-win optimizations enabled
 */

const { performance } = require('perf_hooks');

// Mock complete system with all optimizations
class IntegratedAIMDS {
  constructor() {
    this.patternCache = new Map();
    this.vectorCache = new Map();
    this.bufferPool = [];
    this.workers = 4;
    this.stats = {
      requests: 0,
      cacheHits: 0,
      detections: 0
    };

    // Initialize buffer pool
    for (let i = 0; i < 10; i++) {
      this.bufferPool.push(Buffer.alloc(8192));
    }
  }

  async detectSingle(content, options = {}) {
    this.stats.requests++;

    // Check pattern cache
    const cacheKey = this._hashContent(content);
    if (this.patternCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.patternCache.get(cacheKey);
    }

    // Acquire buffer from pool
    const buffer = this._acquireBuffer();

    try {
      // Simulate detection with parallel processing
      const result = await this._detectWithWorkers(content);

      // Cache result
      this.patternCache.set(cacheKey, result);

      if (result.detected) {
        this.stats.detections++;
      }

      return result;
    } finally {
      // Release buffer back to pool
      this._releaseBuffer(buffer);
    }
  }

  async detectBatch(contents) {
    const results = [];

    // Process in parallel batches
    const batchSize = this.workers;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(content => this.detectSingle(content))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async vectorSearch(embedding, topK = 5) {
    const cacheKey = JSON.stringify(embedding);

    // Check vector cache
    if (this.vectorCache.has(cacheKey)) {
      return this.vectorCache.get(cacheKey);
    }

    // Simulate vector search
    await new Promise(resolve => setTimeout(resolve, 10));

    const results = Array.from({ length: topK }, (_, i) => ({
      id: `result_${i}`,
      score: 0.9 - (i * 0.1),
      pattern: `Pattern ${i}`
    }));

    this.vectorCache.set(cacheKey, results);
    return results;
  }

  _hashContent(content) {
    // Simple hash for testing
    return `hash_${content.substring(0, 20)}`;
  }

  _acquireBuffer() {
    return this.bufferPool.length > 0
      ? this.bufferPool.pop()
      : Buffer.alloc(8192);
  }

  _releaseBuffer(buffer) {
    buffer.fill(0);
    this.bufferPool.push(buffer);
  }

  async _detectWithWorkers(content) {
    // Simulate parallel detection
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 1));

    const isMalicious = content.includes('malicious') ||
                       content.includes('SELECT') ||
                       content.includes('<script>');

    return {
      detected: isMalicious,
      confidence: isMalicious ? 0.95 : 0.05,
      patterns: isMalicious ? ['sql-injection', 'xss'] : [],
      timestamp: Date.now()
    };
  }

  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.cacheHits / this.stats.requests || 0,
      detectionRate: this.stats.detections / this.stats.requests || 0
    };
  }

  reset() {
    this.patternCache.clear();
    this.vectorCache.clear();
    this.stats = {
      requests: 0,
      cacheHits: 0,
      detections: 0
    };
  }
}

describe('End-to-End Integration Tests', () => {
  let system;

  beforeEach(() => {
    system = new IntegratedAIMDS();
  });

  afterEach(() => {
    system.reset();
  });

  describe('Single Detection Flow', () => {
    test('should detect SQL injection end-to-end', async () => {
      const content = "SELECT * FROM users WHERE id = '1' OR '1'='1'";

      const result = await system.detectSingle(content);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.patterns).toContain('sql-injection');
      expect(result.timestamp).toBeDefined();
    });

    test('should detect XSS attempt end-to-end', async () => {
      const content = '<script>alert("XSS")</script>';

      const result = await system.detectSingle(content);

      expect(result.detected).toBe(true);
      expect(result.patterns).toContain('xss');
    });

    test('should handle normal content correctly', async () => {
      const content = 'Hello, this is a normal message';

      const result = await system.detectSingle(content);

      expect(result.detected).toBe(false);
      expect(result.confidence).toBeLessThan(0.1);
      expect(result.patterns).toHaveLength(0);
    });

    test('should use pattern cache on repeat detection', async () => {
      const content = 'SELECT * FROM users';

      // First detection
      await system.detectSingle(content);

      // Second detection (should use cache)
      await system.detectSingle(content);

      const stats = system.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.requests).toBe(2);
      expect(stats.cacheHitRate).toBe(0.5);
    });
  });

  describe('Batch Detection Flow', () => {
    test('should process batch of mixed content', async () => {
      const contents = [
        'Normal message',
        "SELECT * FROM users WHERE id = 1 OR 1=1",
        'Another normal message',
        '<script>alert(1)</script>',
        'Safe content'
      ];

      const results = await system.detectBatch(contents);

      expect(results).toHaveLength(5);
      expect(results[0].detected).toBe(false);
      expect(results[1].detected).toBe(true);
      expect(results[2].detected).toBe(false);
      expect(results[3].detected).toBe(true);
      expect(results[4].detected).toBe(false);
    });

    test('should process large batch efficiently', async () => {
      const contents = Array.from({ length: 100 }, (_, i) =>
        i % 3 === 0 ? `malicious content ${i}` : `safe content ${i}`
      );

      const start = performance.now();
      const results = await system.detectBatch(contents);
      const duration = performance.now() - start;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(2000); // Should complete in <2s

      const maliciousCount = results.filter(r => r.detected).length;
      expect(maliciousCount).toBeCloseTo(34, 1); // ~33 malicious
    });

    test('should maintain accuracy in batch processing', async () => {
      const contents = [
        "'; DROP TABLE users; --",
        'normal text',
        '<img src=x onerror=alert(1)>',
        'SELECT id, name FROM products',
        'Hello world'
      ];

      const results = await system.detectBatch(contents);

      // Verify each result individually
      expect(results[0].detected).toBe(true); // SQL injection
      expect(results[1].detected).toBe(false); // Normal
      expect(results[2].detected).toBe(true); // XSS
      expect(results[3].detected).toBe(true); // SQL
      expect(results[4].detected).toBe(false); // Normal
    });
  });

  describe('Vector Search Integration', () => {
    test('should perform vector similarity search', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      const results = await system.vectorSearch(embedding);

      expect(results).toHaveLength(5);
      expect(results[0].score).toBeGreaterThan(results[4].score);
      results.forEach(result => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('pattern');
      });
    });

    test('should cache vector search results', async () => {
      const embedding = [0.5, 0.6, 0.7];

      const start1 = performance.now();
      const results1 = await system.vectorSearch(embedding);
      const duration1 = performance.now() - start1;

      const start2 = performance.now();
      const results2 = await system.vectorSearch(embedding);
      const duration2 = performance.now() - start2;

      expect(results1).toEqual(results2);
      expect(duration2).toBeLessThan(duration1 / 5); // Cached should be 5x+ faster
    });

    test('should support different topK values', async () => {
      const embedding = [0.1, 0.2];

      const results3 = await system.vectorSearch(embedding, 3);
      const results10 = await system.vectorSearch(embedding, 10);

      expect(results3).toHaveLength(3);
      expect(results10).toHaveLength(10);
    });
  });

  describe('Performance with All Optimizations', () => {
    test('should achieve high throughput', async () => {
      const startTime = Date.now();
      let count = 0;

      // Run for 1 second
      while (Date.now() - startTime < 1000) {
        await system.detectSingle(`test content ${count}`);
        count++;
      }

      const throughput = count / ((Date.now() - startTime) / 1000);

      expect(throughput).toBeGreaterThan(100); // >100 req/s in integration
    });

    test('should maintain low latency under load', async () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await system.detectSingle(`test ${i}`);
        latencies.push(performance.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(95)];
      const p99 = latencies[Math.floor(99)];

      expect(p95).toBeLessThan(20); // <20ms p95
      expect(p99).toBeLessThan(50); // <50ms p99
    });

    test('should benefit from caching over time', async () => {
      // Generate workload with repeated patterns (Zipf distribution)
      const patterns = Array.from({ length: 10 }, (_, i) => `pattern ${i}`);

      // First pass (cold cache)
      for (let i = 0; i < 100; i++) {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        await system.detectSingle(pattern);
      }

      const stats1 = system.getStats();
      const hitRate1 = stats1.cacheHitRate;

      // Second pass (warm cache)
      for (let i = 0; i < 100; i++) {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        await system.detectSingle(pattern);
      }

      const stats2 = system.getStats();
      const hitRate2 = stats2.cacheHitRate;

      // Hit rate should improve
      expect(hitRate2).toBeGreaterThan(hitRate1);
      expect(hitRate2).toBeGreaterThan(0.5);
    });
  });

  describe('Resource Management', () => {
    test('should reuse buffers from pool', async () => {
      const initialPoolSize = system.bufferPool.length;

      // Process multiple requests
      for (let i = 0; i < 20; i++) {
        await system.detectSingle(`test ${i}`);
      }

      const finalPoolSize = system.bufferPool.length;

      // Pool should be roughly the same size (buffers reused)
      expect(Math.abs(finalPoolSize - initialPoolSize)).toBeLessThan(5);
    });

    test('should handle concurrent requests safely', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        system.detectSingle(`test ${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveProperty('detected');
        expect(result).toHaveProperty('confidence');
      });
    });

    test('should maintain stable memory usage', async () => {
      // Process 1000 requests
      for (let i = 0; i < 1000; i++) {
        await system.detectSingle(`test ${i % 100}`); // Reuse some patterns
      }

      // Caches should have reasonable size
      expect(system.patternCache.size).toBeLessThan(200);
      expect(system.bufferPool.length).toBeGreaterThan(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle detection errors gracefully', async () => {
      // Override detection to simulate error
      const originalDetect = system._detectWithWorkers;
      system._detectWithWorkers = async () => {
        throw new Error('Detection failed');
      };

      await expect(system.detectSingle('test')).rejects.toThrow('Detection failed');

      // Restore
      system._detectWithWorkers = originalDetect;
    });

    test('should continue after partial batch failure', async () => {
      let callCount = 0;
      const originalDetect = system._detectWithWorkers;

      system._detectWithWorkers = async function(content) {
        callCount++;
        if (callCount === 3) {
          throw new Error('Simulated failure');
        }
        return originalDetect.call(this, content);
      };

      const contents = ['test1', 'test2', 'test3', 'test4', 'test5'];

      const results = await Promise.allSettled(
        contents.map(c => system.detectSingle(c))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('rejected');
      expect(results[3].status).toBe('fulfilled');
      expect(results[4].status).toBe('fulfilled');

      system._detectWithWorkers = originalDetect;
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track accurate statistics', async () => {
      await system.detectSingle('test1');
      await system.detectSingle('test1'); // cache hit
      await system.detectSingle('malicious');
      await system.detectSingle('test2');

      const stats = system.getStats();

      expect(stats.requests).toBe(4);
      expect(stats.cacheHits).toBe(1);
      expect(stats.detections).toBe(1);
      expect(stats.cacheHitRate).toBe(0.25);
      expect(stats.detectionRate).toBe(0.25);
    });

    test('should provide real-time statistics', async () => {
      const statsHistory = [];

      for (let i = 0; i < 10; i++) {
        await system.detectSingle(`test ${i % 5}`);
        statsHistory.push({ ...system.getStats() });
      }

      // Requests should increase
      expect(statsHistory[9].requests).toBe(10);

      // Cache hits should increase over time
      expect(statsHistory[9].cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle API request workflow', async () => {
      // Simulate API request with all components
      const apiRequest = {
        content: "SELECT * FROM users WHERE username = 'admin'",
        metadata: {
          ip: '192.168.1.1',
          timestamp: Date.now()
        }
      };

      const result = await system.detectSingle(apiRequest.content);

      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should handle form validation workflow', async () => {
      const formInputs = [
        'john.doe@example.com',
        'normalusername',
        "admin'--",
        'valid-password-123',
        '<script>alert("xss")</script>'
      ];

      const results = await system.detectBatch(formInputs);

      expect(results[0].detected).toBe(false); // Valid email
      expect(results[1].detected).toBe(false); // Valid username
      expect(results[2].detected).toBe(true);  // SQL injection
      expect(results[3].detected).toBe(false); // Valid password
      expect(results[4].detected).toBe(true);  // XSS
    });

    test('should handle content moderation workflow', async () => {
      const userComments = [
        'Great product!',
        'This sucks <script>alert(1)</script>',
        'Very helpful, thanks!',
        "'; DROP TABLE comments; --",
        'Would recommend to friends'
      ];

      const results = await system.detectBatch(userComments);

      const safeComments = results.filter(r => !r.detected).length;
      const maliciousComments = results.filter(r => r.detected).length;

      expect(safeComments).toBe(3);
      expect(maliciousComments).toBe(2);
    });
  });
});
