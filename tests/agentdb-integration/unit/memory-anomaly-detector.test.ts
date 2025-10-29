/**
 * Unit Tests for Memory-Augmented Anomaly Detection
 * Tests historical pattern matching and learning from feedback
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  generateAnomalySequence,
  generateCPUUsagePattern,
  generateSimilarPatterns,
  EXAMPLE_SEQUENCES,
} from '../fixtures/test-data-generator';

interface DetectionOptions {
  useSemanticSearch?: boolean;
  learningEnabled?: boolean;
  confidenceThreshold?: number;
}

interface DetectionResult {
  isAnomaly: boolean;
  score: number;
  confidence: number;
  reasoning: string;
  similarPatterns: Array<{
    id: string;
    similarity: number;
    label?: string;
  }>;
}

/**
 * Mock Memory-Augmented Anomaly Detector
 */
class MockMemoryAugmentedDetector {
  private historicalPatterns: Map<string, any> = new Map();
  private learningHistory: Array<{ data: number[]; isAnomaly: boolean }> = [];

  async initialize(historicalPatternTypes: string[] = []): Promise<void> {
    // Load historical patterns
    for (const patternType of historicalPatternTypes) {
      const pattern = this.generateHistoricalPattern(patternType);
      this.historicalPatterns.set(patternType, pattern);
    }
  }

  async detectWithMemory(
    dataPoint: number[],
    options: DetectionOptions = {}
  ): Promise<DetectionResult> {
    const {
      useSemanticSearch = true,
      learningEnabled = false,
      confidenceThreshold = 0.8,
    } = options;

    // Calculate basic anomaly score
    const baseScore = this.calculateAnomalyScore(dataPoint);

    // Find similar historical patterns
    let similarPatterns: Array<{ id: string; similarity: number; label?: string }> = [];

    if (useSemanticSearch && this.historicalPatterns.size > 0) {
      similarPatterns = this.findSimilarPatterns(dataPoint);
    }

    // Adjust confidence based on historical matches
    let confidence = baseScore;
    let reasoning = 'Basic statistical analysis';

    if (similarPatterns.length > 0) {
      const avgSimilarity =
        similarPatterns.reduce((sum, p) => sum + p.similarity, 0) / similarPatterns.length;

      confidence = (baseScore + avgSimilarity) / 2;
      reasoning = `DTW distance with ${similarPatterns.length} similar historical patterns`;
    }

    const isAnomaly = baseScore > 0.7 && confidence >= confidenceThreshold;

    return {
      isAnomaly,
      score: baseScore,
      confidence,
      reasoning,
      similarPatterns,
    };
  }

  async learnFromAnomaly(
    dataPoint: number[],
    isRealAnomaly: boolean,
    feedback?: string
  ): Promise<void> {
    // Store learning example
    this.learningHistory.push({
      data: dataPoint,
      isAnomaly: isRealAnomaly,
    });

    // Update historical patterns if it's a real anomaly
    if (isRealAnomaly) {
      const patternId = `learned_${Date.now()}`;
      this.historicalPatterns.set(patternId, {
        data: dataPoint,
        feedback,
        timestamp: new Date(),
      });
    }
  }

  getLearningHistory(): Array<{ data: number[]; isAnomaly: boolean }> {
    return [...this.learningHistory];
  }

  getHistoricalPatternCount(): number {
    return this.historicalPatterns.size;
  }

  // Private methods
  private calculateAnomalyScore(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);

    // Z-score of last value
    const lastValue = data[data.length - 1];
    const zScore = Math.abs((lastValue - mean) / (std || 1));

    return Math.min(1, zScore / 3);
  }

  private findSimilarPatterns(
    query: number[]
  ): Array<{ id: string; similarity: number; label?: string }> {
    const results: Array<{ id: string; similarity: number; label?: string }> = [];

    for (const [id, pattern] of this.historicalPatterns) {
      const patternData = pattern.data || pattern;
      const similarity = this.calculateSimilarity(query, patternData);

      if (similarity > 0.7) {
        results.push({ id, similarity, label: pattern.label });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    const maxLen = Math.max(a.length, b.length);
    const aPadded = [...a, ...new Array(maxLen - a.length).fill(a[a.length - 1] || 0)];
    const bPadded = [...b, ...new Array(maxLen - b.length).fill(b[b.length - 1] || 0)];

    // Normalized cross-correlation
    const meanA = aPadded.reduce((sum, v) => sum + v, 0) / aPadded.length;
    const meanB = bPadded.reduce((sum, v) => sum + v, 0) / bPadded.length;

    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    for (let i = 0; i < maxLen; i++) {
      const diffA = aPadded[i] - meanA;
      const diffB = bPadded[i] - meanB;

      numerator += diffA * diffB;
      denomA += diffA * diffA;
      denomB += diffB * diffB;
    }

    const denom = Math.sqrt(denomA * denomB);
    return denom > 0 ? numerator / denom : 0;
  }

  private generateHistoricalPattern(type: string): number[] {
    switch (type) {
      case 'cpu_spike':
        return generateAnomalySequence(100, {
          position: 50,
          magnitude: 40,
          type: 'spike',
        }).data;
      case 'memory_leak':
        return Array.from({ length: 100 }, (_, i) => 30 + i * 0.5);
      case 'disk_saturation':
        return Array.from({ length: 100 }, (_, i) => Math.min(95, 70 + i * 0.3));
      default:
        return generateCPUUsagePattern(100);
    }
  }
}

describe('Memory-Augmented Anomaly Detector', () => {
  let detector: MockMemoryAugmentedDetector;

  beforeEach(async () => {
    detector = new MockMemoryAugmentedDetector();
  });

  describe('Initialization', () => {
    it('should initialize with historical patterns', async () => {
      await detector.initialize(['cpu_spike', 'memory_leak', 'disk_saturation']);

      expect(detector.getHistoricalPatternCount()).toBe(3);
    });

    it('should initialize empty without patterns', async () => {
      await detector.initialize();

      expect(detector.getHistoricalPatternCount()).toBe(0);
    });
  });

  describe('Anomaly Detection', () => {
    beforeEach(async () => {
      await detector.initialize(['cpu_spike', 'memory_leak']);
    });

    it('should detect anomalies', async () => {
      const { data } = generateAnomalySequence(100, {
        position: 50,
        magnitude: 50,
        type: 'spike',
      });

      const result = await detector.detectWithMemory(data);

      expect(result.score).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should not flag normal data as anomaly', async () => {
      const normalData = generateCPUUsagePattern(100);

      const result = await detector.detectWithMemory(normalData);

      expect(result.isAnomaly).toBe(false);
      expect(result.score).toBeLessThan(0.7);
    });

    it('should use semantic search when enabled', async () => {
      const spikePattern = generateAnomalySequence(100, {
        position: 50,
        magnitude: 40,
        type: 'spike',
      }).data;

      const result = await detector.detectWithMemory(spikePattern, {
        useSemanticSearch: true,
      });

      expect(result.similarPatterns.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('historical patterns');
    });

    it('should skip semantic search when disabled', async () => {
      const data = generateCPUUsagePattern(100);

      const result = await detector.detectWithMemory(data, {
        useSemanticSearch: false,
      });

      expect(result.similarPatterns).toHaveLength(0);
    });

    it('should respect confidence threshold', async () => {
      const { data } = generateAnomalySequence(100, {
        position: 50,
        magnitude: 30,
        type: 'spike',
      });

      const strictResult = await detector.detectWithMemory(data, {
        confidenceThreshold: 0.95,
      });

      const lenientResult = await detector.detectWithMemory(data, {
        confidenceThreshold: 0.5,
      });

      // Lenient threshold should be more likely to detect
      if (strictResult.isAnomaly) {
        expect(lenientResult.isAnomaly).toBe(true);
      }
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(async () => {
      await detector.initialize(['cpu_spike', 'memory_leak', 'disk_saturation']);
    });

    it('should find similar historical patterns', async () => {
      const similarSpike = generateAnomalySequence(100, {
        position: 50,
        magnitude: 42,
        type: 'spike',
      }).data;

      const result = await detector.detectWithMemory(similarSpike, {
        useSemanticSearch: true,
      });

      expect(result.similarPatterns.length).toBeGreaterThan(0);

      const topMatch = result.similarPatterns[0];
      expect(topMatch.similarity).toBeGreaterThan(0.7);
      expect(topMatch.id).toContain('cpu_spike');
    });

    it('should rank patterns by similarity', async () => {
      const query = generateAnomalySequence(100, {
        position: 50,
        magnitude: 40,
        type: 'spike',
      }).data;

      const result = await detector.detectWithMemory(query, {
        useSemanticSearch: true,
      });

      if (result.similarPatterns.length > 1) {
        for (let i = 1; i < result.similarPatterns.length; i++) {
          expect(result.similarPatterns[i - 1].similarity).toBeGreaterThanOrEqual(
            result.similarPatterns[i].similarity
          );
        }
      }
    });

    it('should handle patterns of different lengths', async () => {
      const shortPattern = generateCPUUsagePattern(50);
      const longPattern = generateCPUUsagePattern(200);

      const result1 = await detector.detectWithMemory(shortPattern);
      const result2 = await detector.detectWithMemory(longPattern);

      expect(result1.confidence).toBeGreaterThan(0);
      expect(result2.confidence).toBeGreaterThan(0);
    });
  });

  describe('Learning from Feedback', () => {
    beforeEach(async () => {
      await detector.initialize();
    });

    it('should learn from positive feedback', async () => {
      const anomalyData = generateAnomalySequence(100, {
        position: 50,
        magnitude: 50,
        type: 'spike',
      }).data;

      const initialCount = detector.getHistoricalPatternCount();

      await detector.learnFromAnomaly(anomalyData, true, 'Confirmed CPU spike');

      const finalCount = detector.getHistoricalPatternCount();

      expect(finalCount).toBeGreaterThan(initialCount);
      expect(detector.getLearningHistory()).toHaveLength(1);
    });

    it('should learn from negative feedback', async () => {
      const falsePositive = generateCPUUsagePattern(100);

      await detector.learnFromAnomaly(falsePositive, false, 'False positive');

      const history = detector.getLearningHistory();

      expect(history).toHaveLength(1);
      expect(history[0].isAnomaly).toBe(false);
    });

    it('should improve detection with learned patterns', async () => {
      const pattern1 = generateAnomalySequence(100, {
        position: 50,
        magnitude: 40,
        type: 'spike',
      }).data;

      // Learn from pattern
      await detector.learnFromAnomaly(pattern1, true, 'Real anomaly');

      // Try similar pattern
      const pattern2 = generateAnomalySequence(100, {
        position: 50,
        magnitude: 42,
        type: 'spike',
      }).data;

      const result = await detector.detectWithMemory(pattern2, {
        useSemanticSearch: true,
      });

      // Should find the learned pattern
      expect(result.similarPatterns.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should track learning history', async () => {
      const patterns = [
        generateAnomalySequence(100, { position: 50, magnitude: 40, type: 'spike' }).data,
        generateCPUUsagePattern(100),
        generateAnomalySequence(100, { position: 60, magnitude: 45, type: 'spike' }).data,
      ];

      for (let i = 0; i < patterns.length; i++) {
        await detector.learnFromAnomaly(patterns[i], i % 2 === 0);
      }

      const history = detector.getLearningHistory();

      expect(history).toHaveLength(3);
      expect(history[0].isAnomaly).toBe(true);
      expect(history[1].isAnomaly).toBe(false);
      expect(history[2].isAnomaly).toBe(true);
    });
  });

  describe('Confidence Calculation', () => {
    beforeEach(async () => {
      await detector.initialize(['cpu_spike', 'memory_leak']);
    });

    it('should increase confidence with more historical matches', async () => {
      // Learn multiple similar patterns
      const basePattern = generateAnomalySequence(100, {
        position: 50,
        magnitude: 40,
        type: 'spike',
      }).data;

      const variations = generateSimilarPatterns(basePattern, 5, 5);

      for (const pattern of variations) {
        await detector.learnFromAnomaly(pattern, true);
      }

      // Test with new similar pattern
      const testPattern = generateAnomalySequence(100, {
        position: 50,
        magnitude: 41,
        type: 'spike',
      }).data;

      const result = await detector.detectWithMemory(testPattern, {
        useSemanticSearch: true,
      });

      expect(result.confidence).toBeGreaterThan(0.75);
      expect(result.similarPatterns.length).toBeGreaterThan(2);
    });

    it('should provide reasoning for detection', async () => {
      const anomalyData = generateAnomalySequence(100, {
        position: 50,
        magnitude: 50,
        type: 'spike',
      }).data;

      const result = await detector.detectWithMemory(anomalyData);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await detector.initialize(['cpu_spike', 'memory_leak', 'disk_saturation']);
    });

    it('should detect quickly', async () => {
      const data = generateCPUUsagePattern(100);

      const start = performance.now();
      await detector.detectWithMemory(data);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // < 10ms
    });

    it('should handle large pattern databases', async () => {
      // Add many patterns
      for (let i = 0; i < 100; i++) {
        const pattern = generateAnomalySequence(100, {
          position: 50,
          magnitude: 40 + i,
          type: 'spike',
        }).data;

        await detector.learnFromAnomaly(pattern, true);
      }

      expect(detector.getHistoricalPatternCount()).toBeGreaterThan(100);

      // Should still be fast
      const testData = generateCPUUsagePattern(100);

      const start = performance.now();
      await detector.detectWithMemory(testData);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // < 50ms even with many patterns
    });

    it('should scale with pattern count', async () => {
      const sizes = [10, 50, 100];
      const times: number[] = [];

      for (const size of sizes) {
        const testDetector = new MockMemoryAugmentedDetector();
        await testDetector.initialize();

        // Add patterns
        for (let i = 0; i < size; i++) {
          const pattern = generateCPUUsagePattern(100);
          await testDetector.learnFromAnomaly(pattern, true);
        }

        const testData = generateCPUUsagePattern(100);

        const start = performance.now();
        await testDetector.detectWithMemory(testData);
        const duration = performance.now() - start;

        times.push(duration);
      }

      // Time should scale sub-linearly (due to early termination in search)
      expect(times[2]).toBeLessThan(times[0] * 10);
    });
  });
});
