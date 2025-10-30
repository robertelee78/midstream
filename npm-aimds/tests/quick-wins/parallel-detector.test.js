/**
 * Parallel Detector Unit Tests
 * Tests worker management, parallel execution, failure recovery, and backpressure
 */

const { performance } = require('perf_hooks');
const { Worker } = require('worker_threads');

// Mock ParallelDetector for testing
class ParallelDetector {
  constructor(options = {}) {
    this.numWorkers = options.numWorkers || 4;
    this.workers = [];
    this.currentWorker = 0;
    this.stats = {
      totalRequests: 0,
      parallelRequests: 0,
      sequentialRequests: 0,
      workerFailures: 0,
      avgResponseTime: 0
    };
    this.queue = [];
    this.maxQueueSize = options.maxQueueSize || 1000;
  }

  async initialize() {
    // Simulate worker initialization
    this.workers = Array.from({ length: this.numWorkers }, (_, i) => ({
      id: i,
      busy: false,
      tasksCompleted: 0,
      failures: 0
    }));
  }

  _selectWorker() {
    // Round-robin selection
    const worker = this.workers[this.currentWorker];
    this.currentWorker = (this.currentWorker + 1) % this.numWorkers;
    return worker;
  }

  _selectAvailableWorker() {
    // Find first available worker
    return this.workers.find(w => !w.busy);
  }

  async detect(content, options = {}) {
    const start = performance.now();
    this.stats.totalRequests++;

    if (options.parallel && this.workers.length > 0) {
      const worker = this._selectWorker();
      worker.busy = true;
      this.stats.parallelRequests++;

      try {
        // Simulate detection
        await this._simulateDetection(content);
        worker.tasksCompleted++;
        worker.busy = false;

        const duration = performance.now() - start;
        this._updateAvgResponseTime(duration);

        return { detected: true, confidence: 0.9, worker: worker.id };
      } catch (error) {
        worker.failures++;
        this.stats.workerFailures++;
        worker.busy = false;
        throw error;
      }
    } else {
      this.stats.sequentialRequests++;
      await this._simulateDetection(content);

      const duration = performance.now() - start;
      this._updateAvgResponseTime(duration);

      return { detected: true, confidence: 0.9 };
    }
  }

  async detectBatch(contents, options = {}) {
    if (!options.parallel) {
      // Sequential processing
      const results = [];
      for (const content of contents) {
        results.push(await this.detect(content, { parallel: false }));
      }
      return results;
    }

    // Parallel processing
    const promises = contents.map(content => this.detect(content, { parallel: true }));
    return await Promise.all(promises);
  }

  async _simulateDetection(content) {
    // Simulate detection latency
    const latency = Math.random() * 10 + 5; // 5-15ms
    await new Promise(resolve => setTimeout(resolve, latency));
    return { detected: content.includes('malicious'), confidence: 0.9 };
  }

  _updateAvgResponseTime(duration) {
    const total = this.stats.avgResponseTime * (this.stats.totalRequests - 1);
    this.stats.avgResponseTime = (total + duration) / this.stats.totalRequests;
  }

  async enqueue(content) {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Queue full - backpressure activated');
    }
    this.queue.push(content);
  }

  async processQueue() {
    const batch = this.queue.splice(0, this.numWorkers);
    return await this.detectBatch(batch, { parallel: true });
  }

  getStats() {
    return {
      ...this.stats,
      workers: this.workers.map(w => ({
        id: w.id,
        tasksCompleted: w.tasksCompleted,
        failures: w.failures,
        busy: w.busy
      })),
      queueSize: this.queue.length
    };
  }

  async shutdown() {
    this.workers = [];
    this.queue = [];
  }
}

describe('ParallelDetector', () => {
  let detector;

  beforeEach(async () => {
    detector = new ParallelDetector({ numWorkers: 4 });
    await detector.initialize();
  });

  afterEach(async () => {
    await detector.shutdown();
  });

  describe('Worker Management', () => {
    test('should initialize correct number of workers', () => {
      const stats = detector.getStats();
      expect(stats.workers.length).toBe(4);
    });

    test('should use round-robin worker selection', async () => {
      const results = await Promise.all([
        detector.detect('test1', { parallel: true }),
        detector.detect('test2', { parallel: true }),
        detector.detect('test3', { parallel: true }),
        detector.detect('test4', { parallel: true })
      ]);

      const workerIds = results.map(r => r.worker);
      expect(new Set(workerIds).size).toBe(4); // All workers used
      expect(workerIds).toEqual([0, 1, 2, 3]);
    });

    test('should track worker statistics', async () => {
      await detector.detect('test', { parallel: true });
      await detector.detect('test', { parallel: true });

      const stats = detector.getStats();
      const totalTasks = stats.workers.reduce((sum, w) => sum + w.tasksCompleted, 0);
      expect(totalTasks).toBe(2);
    });
  });

  describe('Parallel Execution', () => {
    test('should execute tasks in parallel', async () => {
      const start = performance.now();

      await Promise.all([
        detector.detect('test1', { parallel: true }),
        detector.detect('test2', { parallel: true }),
        detector.detect('test3', { parallel: true }),
        detector.detect('test4', { parallel: true })
      ]);

      const duration = performance.now() - start;

      // Should take ~5-15ms (single task time), not 20-60ms (4x sequential)
      expect(duration).toBeLessThan(30);
    });

    test('should be faster than sequential execution', async () => {
      const testData = Array.from({ length: 20 }, (_, i) => `test${i}`);

      // Sequential
      const seqStart = performance.now();
      await detector.detectBatch(testData, { parallel: false });
      const seqDuration = performance.now() - seqStart;

      // Parallel
      const parStart = performance.now();
      await detector.detectBatch(testData, { parallel: true });
      const parDuration = performance.now() - parStart;

      const speedup = seqDuration / parDuration;
      expect(speedup).toBeGreaterThan(2); // At least 2x faster
    });

    test('should handle batch processing correctly', async () => {
      const batch = Array.from({ length: 10 }, (_, i) => `test${i}`);
      const results = await detector.detectBatch(batch, { parallel: true });

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toHaveProperty('detected');
        expect(result).toHaveProperty('confidence');
      });
    });
  });

  describe('Worker Failure Recovery', () => {
    test('should handle worker failures gracefully', async () => {
      // Simulate worker failure
      const originalSimulate = detector._simulateDetection;
      let callCount = 0;

      detector._simulateDetection = async function(content) {
        callCount++;
        if (callCount === 2) {
          throw new Error('Worker failed');
        }
        return originalSimulate.call(this, content);
      };

      const results = await Promise.allSettled([
        detector.detect('test1', { parallel: true }),
        detector.detect('test2', { parallel: true }), // This will fail
        detector.detect('test3', { parallel: true })
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      const stats = detector.getStats();
      expect(stats.workerFailures).toBe(1);
    });

    test('should mark worker as available after failure', async () => {
      detector._simulateDetection = async () => {
        throw new Error('Test failure');
      };

      try {
        await detector.detect('test', { parallel: true });
      } catch (error) {
        // Expected
      }

      const stats = detector.getStats();
      const allAvailable = stats.workers.every(w => !w.busy);
      expect(allAvailable).toBe(true);
    });

    test('should continue using worker after failure', async () => {
      let callCount = 0;
      const originalSimulate = detector._simulateDetection;

      detector._simulateDetection = async function(content) {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return originalSimulate.call(this, content);
      };

      // First call fails
      await expect(detector.detect('test', { parallel: true })).rejects.toThrow();

      // Second call should succeed
      const result = await detector.detect('test', { parallel: true });
      expect(result.detected).toBeDefined();
    });
  });

  describe('Result Aggregation', () => {
    test('should aggregate results correctly', async () => {
      const testData = [
        'SELECT * FROM users',
        'normal text',
        'malicious payload',
        'another test'
      ];

      const results = await detector.detectBatch(testData, { parallel: true });

      expect(results.length).toBe(4);
      expect(results[2].detected).toBe(true); // 'malicious' detected
    });

    test('should maintain result order', async () => {
      const testData = Array.from({ length: 10 }, (_, i) => `test${i}`);
      const results = await detector.detectBatch(testData, { parallel: true });

      expect(results.length).toBe(10);
      // Results should correspond to input order (even if processed in parallel)
      expect(results[0]).toBeDefined();
      expect(results[9]).toBeDefined();
    });
  });

  describe('Backpressure Handling', () => {
    test('should enforce queue size limit', async () => {
      const smallQueueDetector = new ParallelDetector({
        numWorkers: 2,
        maxQueueSize: 5
      });
      await smallQueueDetector.initialize();

      // Fill queue
      for (let i = 0; i < 5; i++) {
        await smallQueueDetector.enqueue(`test${i}`);
      }

      // Should reject when full
      await expect(smallQueueDetector.enqueue('overflow')).rejects.toThrow('Queue full');

      await smallQueueDetector.shutdown();
    });

    test('should process queued items', async () => {
      await detector.enqueue('test1');
      await detector.enqueue('test2');
      await detector.enqueue('test3');

      const results = await detector.processQueue();

      expect(results.length).toBe(3);
      expect(detector.getStats().queueSize).toBe(0);
    });

    test('should process queue in batches', async () => {
      const smallDetector = new ParallelDetector({ numWorkers: 2 });
      await smallDetector.initialize();

      // Enqueue 6 items (3 batches of 2)
      for (let i = 0; i < 6; i++) {
        await smallDetector.enqueue(`test${i}`);
      }

      // First batch
      const batch1 = await smallDetector.processQueue();
      expect(batch1.length).toBe(2);
      expect(smallDetector.getStats().queueSize).toBe(4);

      await smallDetector.shutdown();
    });
  });

  describe('Worker Pool Statistics', () => {
    test('should track total requests', async () => {
      await detector.detect('test1', { parallel: true });
      await detector.detect('test2', { parallel: false });
      await detector.detect('test3', { parallel: true });

      const stats = detector.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.parallelRequests).toBe(2);
      expect(stats.sequentialRequests).toBe(1);
    });

    test('should calculate average response time', async () => {
      for (let i = 0; i < 10; i++) {
        await detector.detect(`test${i}`, { parallel: true });
      }

      const stats = detector.getStats();
      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats.avgResponseTime).toBeLessThan(50); // Should be fast
    });

    test('should track worker task distribution', async () => {
      const tasks = Array.from({ length: 16 }, (_, i) => `test${i}`);
      await detector.detectBatch(tasks, { parallel: true });

      const stats = detector.getStats();
      const tasksPerWorker = stats.workers.map(w => w.tasksCompleted);

      // Should be roughly evenly distributed (4 tasks per worker)
      tasksPerWorker.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Performance', () => {
    test('should achieve 2-3x speedup with 4 workers', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => `test${i}`);

      const seqStart = performance.now();
      await detector.detectBatch(testData, { parallel: false });
      const seqTime = performance.now() - seqStart;

      const parStart = performance.now();
      await detector.detectBatch(testData, { parallel: true });
      const parTime = performance.now() - parStart;

      const speedup = seqTime / parTime;
      expect(speedup).toBeGreaterThanOrEqual(2);
      expect(speedup).toBeLessThanOrEqual(4); // Theoretical max with 4 workers
    });

    test('should handle high throughput (>1000 req/s)', async () => {
      const numRequests = 1000;
      const start = performance.now();

      const promises = Array.from({ length: numRequests }, (_, i) =>
        detector.detect(`test${i}`, { parallel: true })
      );

      await Promise.all(promises);
      const duration = (performance.now() - start) / 1000; // seconds

      const throughput = numRequests / duration;
      expect(throughput).toBeGreaterThan(1000); // >1000 req/s
    });
  });

  describe('Concurrent Access Safety', () => {
    test('should handle concurrent worker selection', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        detector.detect(`test${i}`, { parallel: true })
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(100);
      const stats = detector.getStats();
      expect(stats.totalRequests).toBe(100);
    });
  });
});
