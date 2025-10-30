/**
 * Batch Detection API Unit Tests
 * Tests batch processing, async operations, error handling, and rate limiting
 */

const { performance } = require('perf_hooks');

// Mock BatchDetectionAPI for testing
class BatchDetectionAPI {
  constructor(options = {}) {
    this.maxBatchSize = options.maxBatchSize || 1000;
    this.rateLimit = options.rateLimit || 10000; // requests per minute
    this.rateLimitWindow = 60000; // 1 minute
    this.requestLog = [];
    this.batches = new Map();
    this.batchIdCounter = 0;
  }

  async detectBatch(requests) {
    if (requests.length > this.maxBatchSize) {
      throw new Error(`Batch size ${requests.length} exceeds maximum ${this.maxBatchSize}`);
    }

    // Check rate limit
    this._enforceRateLimit(requests.length);

    const batchId = `batch_${++this.batchIdCounter}`;
    const batch = {
      id: batchId,
      status: 'processing',
      total: requests.length,
      completed: 0,
      results: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    this.batches.set(batchId, batch);

    // Process requests
    try {
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];

        try {
          const result = await this._processRequest(request);
          batch.results.push(result);
          batch.completed++;
        } catch (error) {
          batch.errors.push({
            index: i,
            request,
            error: error.message
          });
          batch.completed++;
        }
      }

      batch.status = batch.errors.length === 0 ? 'completed' : 'completed_with_errors';
      batch.endTime = Date.now();

      return {
        batchId,
        status: batch.status,
        results: batch.results,
        errors: batch.errors,
        duration: batch.endTime - batch.startTime
      };
    } catch (error) {
      batch.status = 'failed';
      batch.endTime = Date.now();
      throw error;
    }
  }

  async detectBatchAsync(requests) {
    if (requests.length > this.maxBatchSize) {
      throw new Error(`Batch size ${requests.length} exceeds maximum ${this.maxBatchSize}`);
    }

    // Check rate limit
    this._enforceRateLimit(requests.length);

    const batchId = `batch_${++this.batchIdCounter}`;
    const batch = {
      id: batchId,
      status: 'queued',
      total: requests.length,
      completed: 0,
      results: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    this.batches.set(batchId, batch);

    // Process asynchronously (don't wait)
    setImmediate(async () => {
      batch.status = 'processing';

      try {
        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];

          try {
            const result = await this._processRequest(request);
            batch.results.push(result);
            batch.completed++;
          } catch (error) {
            batch.errors.push({
              index: i,
              request,
              error: error.message
            });
            batch.completed++;
          }
        }

        batch.status = batch.errors.length === 0 ? 'completed' : 'completed_with_errors';
      } catch (error) {
        batch.status = 'failed';
      } finally {
        batch.endTime = Date.now();
      }
    });

    return { batchId };
  }

  getBatchStatus(batchId) {
    const batch = this.batches.get(batchId);

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    return {
      batchId: batch.id,
      status: batch.status,
      progress: batch.completed / batch.total,
      completed: batch.completed,
      total: batch.total,
      errors: batch.errors.length,
      duration: batch.endTime ? batch.endTime - batch.startTime : Date.now() - batch.startTime
    };
  }

  getBatchResults(batchId) {
    const batch = this.batches.get(batchId);

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    if (batch.status === 'queued' || batch.status === 'processing') {
      throw new Error(`Batch ${batchId} not yet completed`);
    }

    return {
      batchId: batch.id,
      status: batch.status,
      results: batch.results,
      errors: batch.errors,
      duration: batch.endTime - batch.startTime
    };
  }

  async _processRequest(request) {
    // Simulate detection
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 1));

    if (request.shouldFail) {
      throw new Error('Simulated failure');
    }

    return {
      content: request.content,
      detected: request.content.includes('malicious'),
      confidence: 0.9,
      patterns: []
    };
  }

  _enforceRateLimit(requestCount) {
    const now = Date.now();

    // Remove old entries
    this.requestLog = this.requestLog.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );

    // Check if adding these requests would exceed limit
    if (this.requestLog.length + requestCount > this.rateLimit) {
      throw new Error('Rate limit exceeded');
    }

    // Log new requests
    for (let i = 0; i < requestCount; i++) {
      this.requestLog.push(now);
    }
  }

  getStats() {
    const batches = Array.from(this.batches.values());

    return {
      totalBatches: batches.length,
      completedBatches: batches.filter(b => b.status === 'completed' || b.status === 'completed_with_errors').length,
      failedBatches: batches.filter(b => b.status === 'failed').length,
      processingBatches: batches.filter(b => b.status === 'processing' || b.status === 'queued').length,
      totalRequests: batches.reduce((sum, b) => sum + b.total, 0),
      avgBatchDuration: this._calculateAvgDuration(batches),
      currentRateUsage: this.requestLog.length
    };
  }

  _calculateAvgDuration(batches) {
    const completed = batches.filter(b => b.endTime);
    if (completed.length === 0) return 0;

    const total = completed.reduce((sum, b) => sum + (b.endTime - b.startTime), 0);
    return total / completed.length;
  }

  clearHistory() {
    this.batches.clear();
    this.requestLog = [];
    this.batchIdCounter = 0;
  }
}

describe('Batch Detection API', () => {
  let api;

  beforeEach(() => {
    api = new BatchDetectionAPI({
      maxBatchSize: 1000,
      rateLimit: 10000
    });
  });

  afterEach(() => {
    api.clearHistory();
  });

  describe('Basic Batch Processing', () => {
    test('should process batch of requests', async () => {
      const requests = [
        { content: 'SELECT * FROM users' },
        { content: 'normal text' },
        { content: 'malicious payload' }
      ];

      const result = await api.detectBatch(requests);

      expect(result.batchId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.results.length).toBe(3);
      expect(result.errors.length).toBe(0);
    });

    test('should handle empty batch', async () => {
      const result = await api.detectBatch([]);

      expect(result.status).toBe('completed');
      expect(result.results.length).toBe(0);
    });

    test('should throw error for oversized batch', async () => {
      const requests = Array.from({ length: 1001 }, (_, i) => ({ content: `test${i}` }));

      await expect(api.detectBatch(requests)).rejects.toThrow('exceeds maximum');
    });

    test('should return batch duration', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({ content: `test${i}` }));

      const result = await api.detectBatch(requests);

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Async Batch Processing', () => {
    test('should queue batch for async processing', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({ content: `test${i}` }));

      const result = await api.detectBatchAsync(requests);

      expect(result.batchId).toBeDefined();

      // Should be queued immediately
      const status = api.getBatchStatus(result.batchId);
      expect(['queued', 'processing']).toContain(status.status);
    });

    test('should track progress during async processing', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => ({ content: `test${i}` }));

      const result = await api.detectBatchAsync(requests);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = api.getBatchStatus(result.batchId);
      expect(status.progress).toBeGreaterThan(0);
      expect(status.completed).toBeGreaterThan(0);
    });

    test('should complete async batch eventually', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({ content: `test${i}` }));

      const result = await api.detectBatchAsync(requests);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = api.getBatchStatus(result.batchId);
      expect(status.status).toMatch(/completed/);
      expect(status.progress).toBe(1);
    });
  });

  describe('Batch Status Tracking', () => {
    test('should retrieve batch status', async () => {
      const requests = [{ content: 'test' }];
      const result = await api.detectBatch(requests);

      const status = api.getBatchStatus(result.batchId);

      expect(status.batchId).toBe(result.batchId);
      expect(status.status).toBe('completed');
      expect(status.progress).toBe(1);
      expect(status.completed).toBe(1);
      expect(status.total).toBe(1);
    });

    test('should throw error for invalid batch ID', () => {
      expect(() => api.getBatchStatus('invalid')).toThrow('not found');
    });

    test('should update progress during processing', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({ content: `test${i}` }));

      const asyncResult = api.detectBatchAsync(requests);

      // Check progress multiple times
      await new Promise(resolve => setTimeout(resolve, 50));
      const status1 = api.getBatchStatus((await asyncResult).batchId);

      await new Promise(resolve => setTimeout(resolve, 100));
      const status2 = api.getBatchStatus((await asyncResult).batchId);

      // Progress should increase
      if (status1.status === 'processing' && status2.status === 'processing') {
        expect(status2.progress).toBeGreaterThanOrEqual(status1.progress);
      }
    });
  });

  describe('Result Aggregation', () => {
    test('should aggregate all results correctly', async () => {
      const requests = [
        { content: 'test1' },
        { content: 'malicious test2' },
        { content: 'test3' }
      ];

      const result = await api.detectBatch(requests);

      expect(result.results.length).toBe(3);
      expect(result.results[0].content).toBe('test1');
      expect(result.results[1].detected).toBe(true);
      expect(result.results[2].content).toBe('test3');
    });

    test('should retrieve completed batch results', async () => {
      const requests = [{ content: 'test' }];
      const batchResult = await api.detectBatch(requests);

      const results = api.getBatchResults(batchResult.batchId);

      expect(results.results.length).toBe(1);
      expect(results.status).toBe('completed');
    });

    test('should throw error when retrieving incomplete batch', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({ content: `test${i}` }));
      const result = await api.detectBatchAsync(requests);

      expect(() => api.getBatchResults(result.batchId)).toThrow('not yet completed');
    });
  });

  describe('Error Handling', () => {
    test('should handle individual request failures', async () => {
      const requests = [
        { content: 'test1' },
        { content: 'test2', shouldFail: true },
        { content: 'test3' }
      ];

      const result = await api.detectBatch(requests);

      expect(result.status).toBe('completed_with_errors');
      expect(result.results.length).toBe(2); // 2 successful
      expect(result.errors.length).toBe(1); // 1 failed
      expect(result.errors[0].index).toBe(1);
    });

    test('should include error details', async () => {
      const requests = [{ content: 'test', shouldFail: true }];

      const result = await api.detectBatch(requests);

      expect(result.errors[0].error).toBe('Simulated failure');
      expect(result.errors[0].request).toEqual(requests[0]);
    });

    test('should continue processing after individual failures', async () => {
      const requests = [
        { content: 'test1', shouldFail: true },
        { content: 'test2' },
        { content: 'test3', shouldFail: true },
        { content: 'test4' }
      ];

      const result = await api.detectBatch(requests);

      expect(result.results.length).toBe(2); // 2 successful
      expect(result.errors.length).toBe(2); // 2 failed
      expect(result.status).toBe('completed_with_errors');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limit', async () => {
      const smallApi = new BatchDetectionAPI({ rateLimit: 100 });

      // Fill up to limit
      const requests1 = Array.from({ length: 100 }, (_, i) => ({ content: `test${i}` }));
      await smallApi.detectBatch(requests1);

      // Next request should fail
      const requests2 = [{ content: 'test' }];
      await expect(smallApi.detectBatch(requests2)).rejects.toThrow('Rate limit exceeded');

      smallApi.clearHistory();
    });

    test('should track rate usage', async () => {
      const requests = Array.from({ length: 50 }, (_, i) => ({ content: `test${i}` }));
      await api.detectBatch(requests);

      const stats = api.getStats();
      expect(stats.currentRateUsage).toBe(50);
    });

    test('should reset rate limit after window', async () => {
      const shortWindowApi = new BatchDetectionAPI({
        rateLimit: 10,
        rateLimitWindow: 100 // 100ms window for testing
      });

      // Fill rate limit
      const requests = Array.from({ length: 10 }, (_, i) => ({ content: `test${i}` }));
      await shortWindowApi.detectBatch(requests);

      // Should fail immediately
      await expect(shortWindowApi.detectBatch([{ content: 'test' }])).rejects.toThrow('Rate limit');

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should succeed now
      await expect(shortWindowApi.detectBatch([{ content: 'test' }])).resolves.toBeDefined();

      shortWindowApi.clearHistory();
    });
  });

  describe('Statistics', () => {
    test('should track batch statistics', async () => {
      const requests1 = [{ content: 'test1' }];
      const requests2 = [{ content: 'test2' }, { content: 'test3' }];

      await api.detectBatch(requests1);
      await api.detectBatch(requests2);

      const stats = api.getStats();

      expect(stats.totalBatches).toBe(2);
      expect(stats.completedBatches).toBe(2);
      expect(stats.totalRequests).toBe(3);
      expect(stats.avgBatchDuration).toBeGreaterThan(0);
    });

    test('should calculate average batch duration', async () => {
      for (let i = 0; i < 5; i++) {
        await api.detectBatch([{ content: `test${i}` }]);
      }

      const stats = api.getStats();
      expect(stats.avgBatchDuration).toBeGreaterThan(0);
      expect(stats.avgBatchDuration).toBeLessThan(100);
    });

    test('should track processing batches', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => ({ content: `test${i}` }));

      api.detectBatchAsync(requests);
      api.detectBatchAsync(requests);

      const stats = api.getStats();
      expect(stats.processingBatches).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should process 1000 requests in batch efficiently', async () => {
      const requests = Array.from({ length: 1000 }, (_, i) => ({ content: `test${i}` }));

      const start = performance.now();
      const result = await api.detectBatch(requests);
      const duration = performance.now() - start;

      expect(result.results.length).toBe(1000);
      expect(duration).toBeLessThan(10000); // <10s for 1000 requests
    });

    test('should handle multiple concurrent batches', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({ content: `batch1_${i}` }));
      const batch2 = Array.from({ length: 100 }, (_, i) => ({ content: `batch2_${i}` }));
      const batch3 = Array.from({ length: 100 }, (_, i) => ({ content: `batch3_${i}` }));

      const results = await Promise.all([
        api.detectBatch(batch1),
        api.detectBatch(batch2),
        api.detectBatch(batch3)
      ]);

      expect(results.length).toBe(3);
      results.forEach(r => {
        expect(r.status).toMatch(/completed/);
        expect(r.results.length).toBe(100);
      });
    });
  });
});
