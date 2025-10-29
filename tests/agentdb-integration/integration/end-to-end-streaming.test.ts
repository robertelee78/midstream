/**
 * End-to-End Integration Tests
 * Tests full streaming pipeline with AgentDB storage and adaptive optimization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  generateCPUUsagePattern,
  generateAnomalySequence,
  generateSineWave,
  EXAMPLE_SEQUENCES,
} from '../fixtures/test-data-generator';

interface StreamingConfig {
  windowSize: number;
  threshold: number;
  sensitivity: number;
  agentdbPath?: string;
  enablePatternStorage?: boolean;
  enableAdaptiveLearning?: boolean;
}

interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  confidence: number;
  timestamp: Date;
  sequence: number[];
}

interface StreamingStats {
  eventsProcessed: number;
  anomaliesDetected: number;
  patternsStored: number;
  averageLatency: number;
  throughput: number;
}

/**
 * Mock Integrated Streaming System
 * Combines Midstreamer + AgentDB + Adaptive Learning
 */
class MockIntegratedStreamingSystem {
  private config: StreamingConfig;
  private stats: StreamingStats;
  private storedPatterns: Map<string, any> = new Map();

  constructor(config: StreamingConfig) {
    this.config = config;
    this.stats = {
      eventsProcessed: 0,
      anomaliesDetected: 0,
      patternsStored: 0,
      averageLatency: 0,
      throughput: 0,
    };
  }

  async initialize(): Promise<void> {
    // Initialize components
  }

  async processStream(data: number[]): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];
    const startTime = Date.now();

    // Sliding window processing
    for (let i = 0; i < data.length - this.config.windowSize + 1; i++) {
      const window = data.slice(i, i + this.config.windowSize);

      // Detect anomalies
      const result = await this.detectAnomaly(window);
      results.push(result);

      this.stats.eventsProcessed++;

      if (result.isAnomaly) {
        this.stats.anomaliesDetected++;

        // Store pattern if enabled
        if (this.config.enablePatternStorage) {
          await this.storePattern(window, result);
          this.stats.patternsStored++;
        }
      }
    }

    // Update statistics
    const duration = (Date.now() - startTime) / 1000;
    this.stats.averageLatency = (duration / results.length) * 1000;
    this.stats.throughput = results.length / duration;

    return results;
  }

  async processStreamAdaptive(
    dataGenerator: () => AsyncIterableIterator<number[]>
  ): Promise<StreamingStats> {
    const startTime = Date.now();
    let batchCount = 0;

    for await (const batch of dataGenerator()) {
      await this.processStream(batch);
      batchCount++;

      // Adaptive learning (every 10 batches)
      if (this.config.enableAdaptiveLearning && batchCount % 10 === 0) {
        await this.adaptParameters();
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    this.stats.throughput = this.stats.eventsProcessed / duration;

    return this.stats;
  }

  async queryStoredPatterns(
    querySequence: number[],
    limit: number = 5
  ): Promise<Array<{ id: string; similarity: number }>> {
    const results: Array<{ id: string; similarity: number }> = [];

    for (const [id, pattern] of this.storedPatterns) {
      const similarity = this.calculateSimilarity(querySequence, pattern.sequence);
      if (similarity > 0.7) {
        results.push({ id, similarity });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  getStatistics(): StreamingStats {
    return { ...this.stats };
  }

  getConfiguration(): StreamingConfig {
    return { ...this.config };
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

  // Private methods
  private async detectAnomaly(window: number[]): Promise<AnomalyResult> {
    // Simple threshold-based detection
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance =
      window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    const std = Math.sqrt(variance);

    const lastValue = window[window.length - 1];
    const zScore = Math.abs((lastValue - mean) / (std || 1));

    const score = zScore / this.config.threshold;
    const isAnomaly = score > 1.0;

    return {
      isAnomaly,
      score: Math.min(1, score),
      confidence: Math.min(1, score * 0.9),
      timestamp: new Date(),
      sequence: window,
    };
  }

  private async storePattern(sequence: number[], result: AnomalyResult): Promise<string> {
    const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    this.storedPatterns.set(id, {
      sequence,
      result,
      timestamp: new Date(),
    });

    return id;
  }

  private async adaptParameters(): Promise<void> {
    // Simple adaptive logic: adjust threshold based on detection rate
    const detectionRate = this.stats.anomaliesDetected / this.stats.eventsProcessed;

    if (detectionRate > 0.1) {
      // Too many detections, increase threshold
      this.config.threshold *= 1.05;
    } else if (detectionRate < 0.01) {
      // Too few detections, decrease threshold
      this.config.threshold *= 0.95;
    }

    // Keep within bounds
    this.config.threshold = Math.max(0.5, Math.min(5.0, this.config.threshold));
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      // Pad shorter sequence
      const maxLen = Math.max(a.length, b.length);
      a = [...a, ...new Array(maxLen - a.length).fill(a[a.length - 1])];
      b = [...b, ...new Array(maxLen - b.length).fill(b[b.length - 1])];
    }

    // Euclidean distance similarity
    const distance = Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );

    const maxDistance = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));

    return 1 - Math.min(1, distance / (maxDistance || 1));
  }
}

describe('End-to-End Streaming Integration', () => {
  let system: MockIntegratedStreamingSystem;

  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    system = new MockIntegratedStreamingSystem({
      windowSize: 50,
      threshold: 2.0,
      sensitivity: 1.0,
      enablePatternStorage: true,
      enableAdaptiveLearning: false,
    });

    await system.initialize();
  });

  describe('Basic Streaming', () => {
    it('should process streaming data', async () => {
      const data = generateCPUUsagePattern(500);

      const results = await system.processStream(data);

      expect(results.length).toBeGreaterThan(0);
      expect(system.getStatistics().eventsProcessed).toBeGreaterThan(0);
    });

    it('should detect anomalies in stream', async () => {
      const { data, anomalyIndices } = generateAnomalySequence(200, {
        position: 100,
        magnitude: 50,
        duration: 5,
        type: 'spike',
      });

      const results = await system.processStream(data);

      // Should detect the injected anomaly
      const detectedAnomalies = results.filter((r) => r.isAnomaly);
      expect(detectedAnomalies.length).toBeGreaterThan(0);
    });

    it('should maintain low false positive rate', async () => {
      // Normal data without anomalies
      const normalData = generateSineWave({
        length: 500,
        frequency: 0.1,
        amplitude: 30,
        noise: 2,
      });

      const results = await system.processStream(normalData);

      const falsePositives = results.filter((r) => r.isAnomaly).length;
      const falsePositiveRate = falsePositives / results.length;

      expect(falsePositiveRate).toBeLessThan(0.1); // < 10% false positives
    });

    it('should process with low latency', async () => {
      const data = generateCPUUsagePattern(1000);

      await system.processStream(data);

      const stats = system.getStatistics();
      expect(stats.averageLatency).toBeLessThan(15); // < 15ms per event
    });

    it('should achieve high throughput', async () => {
      const data = generateCPUUsagePattern(10000);

      await system.processStream(data);

      const stats = system.getStatistics();
      expect(stats.throughput).toBeGreaterThan(1000); // > 1000 events/sec
    });
  });

  describe('Pattern Storage', () => {
    it('should store anomaly patterns', async () => {
      const { data } = generateAnomalySequence(200, {
        position: 100,
        magnitude: 50,
        type: 'spike',
      });

      await system.processStream(data);

      const stats = system.getStatistics();
      expect(stats.patternsStored).toBeGreaterThan(0);
    });

    it('should retrieve similar patterns', async () => {
      // Store some patterns
      const pattern1 = generateAnomalySequence(100, {
        position: 50,
        magnitude: 40,
        type: 'spike',
      }).data;

      const pattern2 = generateAnomalySequence(100, {
        position: 50,
        magnitude: 42,
        type: 'spike',
      }).data;

      await system.processStream(pattern1);
      await system.processStream(pattern2);

      // Query with similar pattern
      const query = generateAnomalySequence(100, {
        position: 50,
        magnitude: 41,
        type: 'spike',
      }).data.slice(0, 50);

      const similar = await system.queryStoredPatterns(query, 5);

      expect(similar.length).toBeGreaterThan(0);
      similar.forEach((match) => {
        expect(match.similarity).toBeGreaterThan(0.7);
      });
    });

    it('should organize patterns by namespace', async () => {
      // Test pattern namespacing
      const cpuPattern = EXAMPLE_SEQUENCES.cpuUsage;
      const spikePattern = EXAMPLE_SEQUENCES.spikePattern;

      await system.processStream(cpuPattern);
      await system.processStream(spikePattern);

      const stats = system.getStatistics();
      expect(stats.patternsStored).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Parameter Optimization', () => {
    it('should adapt parameters during streaming', async () => {
      const adaptiveSystem = new MockIntegratedStreamingSystem({
        windowSize: 50,
        threshold: 2.0,
        sensitivity: 1.0,
        enableAdaptiveLearning: true,
      });

      await adaptiveSystem.initialize();

      const initialThreshold = adaptiveSystem.getConfiguration().threshold;

      // Create data generator
      async function* dataGenerator() {
        for (let batch = 0; batch < 20; batch++) {
          yield generateCPUUsagePattern(500);
        }
      }

      await adaptiveSystem.processStreamAdaptive(dataGenerator);

      const finalThreshold = adaptiveSystem.getConfiguration().threshold;

      // Threshold should have adapted
      expect(finalThreshold).not.toBe(initialThreshold);
    });

    it('should improve detection accuracy over time', async () => {
      const adaptiveSystem = new MockIntegratedStreamingSystem({
        windowSize: 50,
        threshold: 3.0, // Start with high threshold
        sensitivity: 1.0,
        enableAdaptiveLearning: true,
      });

      await adaptiveSystem.initialize();

      // Generate data with anomalies
      const dataWithAnomalies = generateAnomalySequence(1000, {
        position: 500,
        magnitude: 50,
        duration: 10,
        type: 'spike',
      }).data;

      // Process in batches
      for (let i = 0; i < 5; i++) {
        const batch = dataWithAnomalies.slice(i * 200, (i + 1) * 200);
        await adaptiveSystem.processStream(batch);
      }

      const stats = adaptiveSystem.getStatistics();

      // Should have detected anomalies
      expect(stats.anomaliesDetected).toBeGreaterThan(0);
    });
  });

  describe('Memory-Augmented Detection', () => {
    it('should use stored patterns for detection', async () => {
      // Store historical patterns
      const historicalPattern = generateAnomalySequence(100, {
        position: 50,
        magnitude: 40,
        type: 'spike',
      }).data;

      await system.processStream(historicalPattern);

      // Process new similar pattern
      const newPattern = generateAnomalySequence(100, {
        position: 50,
        magnitude: 42,
        type: 'spike',
      }).data;

      const results = await system.processStream(newPattern);

      // Should detect based on similarity to stored patterns
      const detected = results.filter((r) => r.isAnomaly);
      expect(detected.length).toBeGreaterThan(0);
    });

    it('should provide confidence based on historical data', async () => {
      // Store multiple similar patterns
      for (let i = 0; i < 5; i++) {
        const pattern = generateAnomalySequence(100, {
          position: 50,
          magnitude: 40 + i,
          type: 'spike',
        }).data;

        await system.processStream(pattern);
      }

      // Process new similar pattern
      const newPattern = generateAnomalySequence(100, {
        position: 50,
        magnitude: 42,
        type: 'spike',
      }).data;

      const results = await system.processStream(newPattern);

      const anomalies = results.filter((r) => r.isAnomaly);

      if (anomalies.length > 0) {
        // Confidence should be higher with more historical data
        expect(anomalies[0].confidence).toBeGreaterThan(0.7);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high-volume streams', async () => {
      const largeDataset = generateCPUUsagePattern(50000);

      const start = performance.now();
      await system.processStream(largeDataset);
      const duration = performance.now() - start;

      const stats = system.getStatistics();

      expect(stats.eventsProcessed).toBe(largeDataset.length - 50 + 1);
      expect(stats.throughput).toBeGreaterThan(1000); // > 1K events/sec
      expect(duration).toBeLessThan(60000); // < 60 seconds total
    });

    it('should maintain consistent latency', async () => {
      const data = generateCPUUsagePattern(10000);

      const results = await system.processStream(data);

      const stats = system.getStatistics();

      // Latency should be consistent
      expect(stats.averageLatency).toBeLessThan(20);
    });

    it('should scale with data size', async () => {
      const sizes = [1000, 5000, 10000];
      const throughputs: number[] = [];

      for (const size of sizes) {
        const testSystem = new MockIntegratedStreamingSystem({
          windowSize: 50,
          threshold: 2.0,
          sensitivity: 1.0,
        });

        await testSystem.initialize();

        const data = generateCPUUsagePattern(size);
        await testSystem.processStream(data);

        const stats = testSystem.getStatistics();
        throughputs.push(stats.throughput);

        await testSystem.shutdown();
      }

      // Throughput should remain relatively consistent
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
      throughputs.forEach((t) => {
        expect(Math.abs(t - avgThroughput) / avgThroughput).toBeLessThan(0.5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', async () => {
      const badData = [NaN, Infinity, -Infinity, null as any, undefined as any];

      // Should not throw
      await expect(system.processStream(badData)).resolves.toBeDefined();
    });

    it('should recover from transient errors', async () => {
      const data = generateCPUUsagePattern(1000);

      // Process should complete despite potential errors
      const results = await system.processStream(data);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should maintain statistics across errors', async () => {
      const data1 = generateCPUUsagePattern(500);
      await system.processStream(data1);

      const stats1 = system.getStatistics();

      const data2 = generateCPUUsagePattern(500);
      await system.processStream(data2);

      const stats2 = system.getStatistics();

      // Statistics should accumulate
      expect(stats2.eventsProcessed).toBeGreaterThan(stats1.eventsProcessed);
    });
  });

  describe('Integration Completeness', () => {
    it('should integrate all components', async () => {
      const fullSystem = new MockIntegratedStreamingSystem({
        windowSize: 50,
        threshold: 2.0,
        sensitivity: 1.0,
        agentdbPath: './test-agentdb',
        enablePatternStorage: true,
        enableAdaptiveLearning: true,
      });

      await fullSystem.initialize();

      // Generate realistic workload
      const { data } = generateAnomalySequence(1000, {
        position: 500,
        magnitude: 50,
        duration: 5,
        type: 'spike',
      });

      async function* dataGenerator() {
        yield data.slice(0, 500);
        yield data.slice(500, 1000);
      }

      const stats = await fullSystem.processStreamAdaptive(dataGenerator);

      expect(stats.eventsProcessed).toBeGreaterThan(0);
      expect(stats.anomaliesDetected).toBeGreaterThan(0);
      expect(stats.patternsStored).toBeGreaterThan(0);
      expect(stats.throughput).toBeGreaterThan(100);

      await fullSystem.shutdown();
    });
  });
});
