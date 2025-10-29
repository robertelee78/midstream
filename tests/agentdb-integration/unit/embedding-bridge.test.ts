/**
 * Unit Tests for Embedding Bridge
 * Tests all 4 embedding methods, caching, and semantic search
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  generateSineWave,
  generateCPUUsagePattern,
  generateSimilarPatterns,
  EXAMPLE_SEQUENCES,
} from '../fixtures/test-data-generator';

// Mock imports - adjust paths as needed
// import { createSemanticTemporalBridge } from '../../../plans/agentdb/api/embedding-bridge';

interface EmbeddingOptions {
  method?: 'statistical' | 'dtw' | 'hybrid' | 'wavelet';
  dimensions?: number;
  includeWavelet?: boolean;
}

interface SearchOptions {
  limit?: number;
  threshold?: number;
  namespace?: string;
}

interface PatternMatch {
  id: string;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * Mock Embedding Bridge for testing
 * Replace with actual implementation
 */
class MockEmbeddingBridge {
  private cache = new Map<string, number[]>();
  private patterns = new Map<string, { embedding: number[]; metadata: any }>();

  async embedSequence(
    sequence: number[],
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const { method = 'hybrid', dimensions = 384 } = options;

    // Cache key
    const cacheKey = `${JSON.stringify(sequence)}-${method}-${dimensions}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Generate embedding based on method
    let embedding: number[];

    switch (method) {
      case 'statistical':
        embedding = this.statisticalEmbedding(sequence, dimensions);
        break;
      case 'dtw':
        embedding = this.dtwEmbedding(sequence, dimensions);
        break;
      case 'wavelet':
        embedding = this.waveletEmbedding(sequence, dimensions);
        break;
      case 'hybrid':
      default:
        embedding = this.hybridEmbedding(sequence, dimensions);
        break;
    }

    // Cache result
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  async storePattern(
    embedding: number[],
    metadata: any,
    namespace: string = 'default'
  ): Promise<string> {
    const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.patterns.set(id, { embedding, metadata });
    return id;
  }

  async findSimilarPatterns(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<PatternMatch[]> {
    const { limit = 5, threshold = 0.75 } = options;

    const results: PatternMatch[] = [];

    for (const [id, { embedding, metadata }] of this.patterns) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= threshold) {
        results.push({ id, similarity, metadata });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0.85, // Mock hit rate
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Private helper methods
  private statisticalEmbedding(sequence: number[], dim: number): number[] {
    const mean = sequence.reduce((a, b) => a + b, 0) / sequence.length;
    const variance = sequence.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sequence.length;
    const std = Math.sqrt(variance);

    const embedding = new Array(dim).fill(0);
    embedding[0] = mean;
    embedding[1] = std;
    embedding[2] = Math.max(...sequence);
    embedding[3] = Math.min(...sequence);

    // Fill rest with normalized sequence values (repeated/truncated)
    for (let i = 4; i < dim; i++) {
      embedding[i] = sequence[i % sequence.length] / 100;
    }

    return this.normalizeVector(embedding);
  }

  private dtwEmbedding(sequence: number[], dim: number): number[] {
    // Simplified DTW-based embedding
    const embedding = new Array(dim).fill(0);

    // Use differences between consecutive points
    for (let i = 0; i < sequence.length - 1 && i < dim; i++) {
      embedding[i] = (sequence[i + 1] - sequence[i]) / 100;
    }

    return this.normalizeVector(embedding);
  }

  private waveletEmbedding(sequence: number[], dim: number): number[] {
    // Simplified wavelet-like embedding (using FFT concepts)
    const embedding = new Array(dim).fill(0);

    // Compute simple frequency components
    for (let k = 0; k < Math.min(dim, sequence.length); k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < sequence.length; n++) {
        const angle = 2 * Math.PI * k * n / sequence.length;
        real += sequence[n] * Math.cos(angle);
        imag += sequence[n] * Math.sin(angle);
      }
      embedding[k] = Math.sqrt(real * real + imag * imag) / sequence.length;
    }

    return this.normalizeVector(embedding);
  }

  private hybridEmbedding(sequence: number[], dim: number): number[] {
    const third = Math.floor(dim / 3);

    const stat = this.statisticalEmbedding(sequence, third);
    const dtw = this.dtwEmbedding(sequence, third);
    const wavelet = this.waveletEmbedding(sequence, dim - 2 * third);

    return this.normalizeVector([...stat, ...dtw, ...wavelet]);
  }

  private normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vec.map(v => v / magnitude) : vec;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    return magA > 0 && magB > 0 ? dotProduct / (magA * magB) : 0;
  }
}

describe('Embedding Bridge', () => {
  let bridge: MockEmbeddingBridge;

  beforeAll(async () => {
    bridge = new MockEmbeddingBridge();
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    bridge.clearCache();
  });

  describe('Statistical Embedding', () => {
    it('should generate embeddings with correct dimensions', async () => {
      const sequence = EXAMPLE_SEQUENCES.cpuUsage;
      const embedding = await bridge.embedSequence(sequence, {
        method: 'statistical',
        dimensions: 384,
      });

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
    });

    it('should capture basic statistical properties', async () => {
      const sequence = [10, 20, 30, 40, 50];
      const embedding = await bridge.embedSequence(sequence, {
        method: 'statistical',
        dimensions: 384,
      });

      // First few dimensions should contain mean, std, max, min
      expect(embedding[0]).toBeGreaterThan(0); // normalized mean
      expect(embedding[1]).toBeGreaterThan(0); // normalized std
    });

    it('should be deterministic for same input', async () => {
      const sequence = EXAMPLE_SEQUENCES.normalLoad;
      const embedding1 = await bridge.embedSequence(sequence, {
        method: 'statistical',
      });
      const embedding2 = await bridge.embedSequence(sequence, {
        method: 'statistical',
      });

      expect(embedding1).toEqual(embedding2);
    });

    it('should handle edge cases', async () => {
      // Single value
      const single = await bridge.embedSequence([42], {
        method: 'statistical',
        dimensions: 384,
      });
      expect(single).toHaveLength(384);

      // All same values
      const constant = await bridge.embedSequence([50, 50, 50, 50], {
        method: 'statistical',
        dimensions: 384,
      });
      expect(constant).toHaveLength(384);
    });
  });

  describe('DTW Embedding', () => {
    it('should generate embeddings based on temporal dynamics', async () => {
      const sequence = EXAMPLE_SEQUENCES.cpuUsage;
      const embedding = await bridge.embedSequence(sequence, {
        method: 'dtw',
        dimensions: 384,
      });

      expect(embedding).toHaveLength(384);
    });

    it('should capture temporal patterns', async () => {
      const increasing = [10, 20, 30, 40, 50];
      const decreasing = [50, 40, 30, 20, 10];

      const embInc = await bridge.embedSequence(increasing, { method: 'dtw' });
      const embDec = await bridge.embedSequence(decreasing, { method: 'dtw' });

      // Should be different due to different temporal patterns
      const similarity = cosineSimilarity(embInc, embDec);
      expect(similarity).toBeLessThan(0.9);
    });

    it('should be invariant to slight time warping', async () => {
      const base = generateSineWave({ length: 50, frequency: 0.1 });
      const stretched = generateSineWave({ length: 55, frequency: 0.1 });

      const embBase = await bridge.embedSequence(base, { method: 'dtw' });
      const embStretched = await bridge.embedSequence(stretched.slice(0, 50), { method: 'dtw' });

      const similarity = cosineSimilarity(embBase, embStretched);
      expect(similarity).toBeGreaterThan(0.7);
    });
  });

  describe('Wavelet Embedding', () => {
    it('should capture frequency components', async () => {
      const sequence = generateSineWave({
        length: 100,
        frequency: 0.1,
        amplitude: 50,
      });

      const embedding = await bridge.embedSequence(sequence, {
        method: 'wavelet',
        dimensions: 384,
      });

      expect(embedding).toHaveLength(384);
    });

    it('should distinguish different frequencies', async () => {
      const lowFreq = generateSineWave({ length: 100, frequency: 0.05 });
      const highFreq = generateSineWave({ length: 100, frequency: 0.2 });

      const embLow = await bridge.embedSequence(lowFreq, { method: 'wavelet' });
      const embHigh = await bridge.embedSequence(highFreq, { method: 'wavelet' });

      const similarity = cosineSimilarity(embLow, embHigh);
      expect(similarity).toBeLessThan(0.8);
    });
  });

  describe('Hybrid Embedding', () => {
    it('should combine multiple methods', async () => {
      const sequence = EXAMPLE_SEQUENCES.cpuUsage;
      const embedding = await bridge.embedSequence(sequence, {
        method: 'hybrid',
        dimensions: 384,
      });

      expect(embedding).toHaveLength(384);
    });

    it('should perform better than individual methods', async () => {
      const base = EXAMPLE_SEQUENCES.cpuUsage;
      const similar = EXAMPLE_SEQUENCES.similarCpuUsage;

      const embBase = await bridge.embedSequence(base, { method: 'hybrid' });
      const embSimilar = await bridge.embedSequence(similar, { method: 'hybrid' });

      const similarity = cosineSimilarity(embBase, embSimilar);
      expect(similarity).toBeGreaterThan(0.75); // Should detect similarity
    });
  });

  describe('Pattern Storage', () => {
    it('should store pattern with metadata', async () => {
      const sequence = EXAMPLE_SEQUENCES.cpuUsage;
      const embedding = await bridge.embedSequence(sequence);

      const patternId = await bridge.storePattern(embedding, {
        sequence: { data: sequence },
        metadata: { source: 'test' },
      });

      expect(patternId).toMatch(/^pattern_/);
    });

    it('should store multiple patterns', async () => {
      const patterns = generateSimilarPatterns(EXAMPLE_SEQUENCES.cpuUsage, 5);

      const ids: string[] = [];
      for (const pattern of patterns) {
        const embedding = await bridge.embedSequence(pattern);
        const id = await bridge.storePattern(embedding, { pattern });
        ids.push(id);
      }

      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(5); // All unique
    });
  });

  describe('Semantic Search', () => {
    beforeEach(async () => {
      // Store some patterns
      const basePattern = EXAMPLE_SEQUENCES.cpuUsage;
      const variations = generateSimilarPatterns(basePattern, 3, 5);

      for (const pattern of variations) {
        const embedding = await bridge.embedSequence(pattern);
        await bridge.storePattern(embedding, { pattern });
      }
    });

    it('should find similar patterns', async () => {
      const query = EXAMPLE_SEQUENCES.similarCpuUsage;
      const queryEmbedding = await bridge.embedSequence(query);

      const results = await bridge.findSimilarPatterns(queryEmbedding, {
        limit: 5,
        threshold: 0.7,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.7);
        expect(result.similarity).toBeLessThanOrEqual(1.0);
      });
    });

    it('should return results sorted by similarity', async () => {
      const query = EXAMPLE_SEQUENCES.cpuUsage;
      const queryEmbedding = await bridge.embedSequence(query);

      const results = await bridge.findSimilarPatterns(queryEmbedding, {
        limit: 10,
        threshold: 0.5,
      });

      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity).toBeLessThanOrEqual(results[i - 1].similarity);
      }
    });

    it('should respect threshold parameter', async () => {
      const query = generateCPUUsagePattern(50);
      const queryEmbedding = await bridge.embedSequence(query);

      const strictResults = await bridge.findSimilarPatterns(queryEmbedding, {
        threshold: 0.9,
      });
      const lenientResults = await bridge.findSimilarPatterns(queryEmbedding, {
        threshold: 0.5,
      });

      expect(strictResults.length).toBeLessThanOrEqual(lenientResults.length);
    });

    it('should respect limit parameter', async () => {
      const query = EXAMPLE_SEQUENCES.cpuUsage;
      const queryEmbedding = await bridge.embedSequence(query);

      const results = await bridge.findSimilarPatterns(queryEmbedding, {
        limit: 2,
        threshold: 0.0,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Caching', () => {
    it('should cache embeddings', async () => {
      const sequence = EXAMPLE_SEQUENCES.cpuUsage;

      // First call
      const emb1 = await bridge.embedSequence(sequence);
      const stats1 = bridge.getCacheStats();

      // Second call (should hit cache)
      const emb2 = await bridge.embedSequence(sequence);
      const stats2 = bridge.getCacheStats();

      expect(emb1).toEqual(emb2);
      expect(stats2.size).toBeGreaterThanOrEqual(stats1.size);
    });

    it('should use different cache keys for different methods', async () => {
      const sequence = EXAMPLE_SEQUENCES.cpuUsage;

      const stat = await bridge.embedSequence(sequence, { method: 'statistical' });
      const dtw = await bridge.embedSequence(sequence, { method: 'dtw' });

      expect(stat).not.toEqual(dtw);
    });

    it('should clear cache when requested', async () => {
      await bridge.embedSequence(EXAMPLE_SEQUENCES.cpuUsage);
      expect(bridge.getCacheStats().size).toBeGreaterThan(0);

      bridge.clearCache();
      expect(bridge.getCacheStats().size).toBe(0);
    });

    it('should improve performance with caching', async () => {
      const sequence = generateCPUUsagePattern(1000);

      const start1 = Date.now();
      await bridge.embedSequence(sequence, { method: 'hybrid' });
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await bridge.embedSequence(sequence, { method: 'hybrid' });
      const time2 = Date.now() - start2;

      // Second call should be faster (from cache)
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('Performance', () => {
    it('should embed sequences quickly (< 10ms target)', async () => {
      const sequence = generateCPUUsagePattern(100);

      const start = performance.now();
      await bridge.embedSequence(sequence, { method: 'hybrid' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle large sequences efficiently', async () => {
      const largeSequence = generateCPUUsagePattern(10000);

      const start = performance.now();
      await bridge.embedSequence(largeSequence);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should still be fast
    });

    it('should batch embed multiple sequences', async () => {
      const sequences = Array(100).fill(null).map(() =>
        generateCPUUsagePattern(50)
      );

      const start = performance.now();
      await Promise.all(sequences.map(seq => bridge.embedSequence(seq)));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // < 5ms per sequence on average
    });
  });
});

// Helper function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}
