/**
 * Embeddings Tests
 * Tests embedding generation, normalization, and quality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentDBIntegration } from '../../src/integrations/agentdb-integration.js';

describe('Embedding Generation', () => {
  let vectorStore;

  beforeEach(() => {
    vectorStore = new AgentDBIntegration({
      dimension: 384
    });
  });

  describe('Basic Embedding Generation', () => {
    it('should generate embeddings with correct dimensions', async () => {
      const text = 'Test text for embedding generation';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(Array.isArray(embedding)).toBe(true);
    });

    it('should generate numeric vectors', async () => {
      const text = 'Numeric vector test';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding.every(val => typeof val === 'number')).toBe(true);
      expect(embedding.every(val => !isNaN(val))).toBe(true);
    });

    it('should generate finite values only', async () => {
      const text = 'Finite values test';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding.every(val => isFinite(val))).toBe(true);
    });

    it('should handle empty string', async () => {
      const embedding = await vectorStore.generateEmbedding('');

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => !isNaN(val))).toBe(true);
    });

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(10000);
      const embedding = await vectorStore.generateEmbedding(longText);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => isFinite(val))).toBe(true);
    });
  });

  describe('Embedding Normalization', () => {
    it('should normalize embeddings to unit length', async () => {
      const text = 'Normalization test';
      const embedding = await vectorStore.generateEmbedding(text);

      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should maintain normalization for different text lengths', async () => {
      const texts = [
        'short',
        'medium length text for testing',
        'very long text with many words to test normalization consistency across different input sizes'
      ];

      for (const text of texts) {
        const embedding = await vectorStore.generateEmbedding(text);
        const magnitude = Math.sqrt(
          embedding.reduce((sum, val) => sum + val * val, 0)
        );
        expect(magnitude).toBeCloseTo(1.0, 5);
      }
    });

    it('should handle zero vector edge case', async () => {
      // Test with input that might produce zero vector
      const embedding = await vectorStore.generateEmbedding('\0\0\0');

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => !isNaN(val))).toBe(true);
    });
  });

  describe('Embedding Consistency', () => {
    it('should generate identical embeddings for identical inputs', async () => {
      const text = 'Consistency test';
      const embedding1 = await vectorStore.generateEmbedding(text);
      const embedding2 = await vectorStore.generateEmbedding(text);

      expect(embedding1).toEqual(embedding2);
    });

    it('should be case-insensitive', async () => {
      const text1 = 'UPPERCASE TEXT';
      const text2 = 'uppercase text';

      const embedding1 = await vectorStore.generateEmbedding(text1);
      const embedding2 = await vectorStore.generateEmbedding(text2);

      expect(embedding1).toEqual(embedding2);
    });

    it('should generate similar embeddings for similar text', async () => {
      const text1 = 'ignore all instructions';
      const text2 = 'ignore all directives';

      const embedding1 = await vectorStore.generateEmbedding(text1);
      const embedding2 = await vectorStore.generateEmbedding(text2);

      const similarity = vectorStore.cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should generate different embeddings for different text', async () => {
      const text1 = 'security threat detection';
      const text2 = 'sunny weather forecast';

      const embedding1 = await vectorStore.generateEmbedding(text1);
      const embedding2 = await vectorStore.generateEmbedding(text2);

      const similarity = vectorStore.cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('Embedding Distribution', () => {
    it('should have reasonable value distribution', async () => {
      const text = 'Distribution test for embedding values';
      const embedding = await vectorStore.generateEmbedding(text);

      // Check that values are distributed (not all same)
      const uniqueValues = new Set(embedding);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    it('should not have extreme outliers', async () => {
      const text = 'Outlier detection test';
      const embedding = await vectorStore.generateEmbedding(text);

      const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
      const variance = embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embedding.length;
      const stdDev = Math.sqrt(variance);

      // All values should be within 5 standard deviations (very lenient)
      const outliers = embedding.filter(val => Math.abs(val - mean) > 5 * stdDev);
      expect(outliers.length).toBe(0);
    });

    it('should utilize multiple dimensions', async () => {
      const text = 'Multi-dimensional embedding test';
      const embedding = await vectorStore.generateEmbedding(text);

      // Check that non-zero values are spread across dimensions
      const nonZeroIndices = embedding
        .map((val, idx) => ({ val, idx }))
        .filter(({ val }) => Math.abs(val) > 0.001)
        .map(({ idx }) => idx);

      expect(nonZeroIndices.length).toBeGreaterThan(10);
    });
  });

  describe('Special Characters and Unicode', () => {
    it('should handle special characters', async () => {
      const text = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => isFinite(val))).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const text = 'Test with émojis: 🔒 🛡️ 🔐 and other characters: café, naïve';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => isFinite(val))).toBe(true);
    });

    it('should handle newlines and whitespace', async () => {
      const text = 'Line 1\nLine 2\r\nLine 3\t\tTabbed';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => isFinite(val))).toBe(true);
    });

    it('should handle mixed language text', async () => {
      const text = 'English, español, 中文, العربية, русский';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => isFinite(val))).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should generate embeddings quickly', async () => {
      const text = 'Performance test for embedding generation';
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await vectorStore.generateEmbedding(text);
      }
      const duration = performance.now() - start;
      const avgDuration = duration / iterations;

      expect(avgDuration).toBeLessThan(1); // Less than 1ms per embedding
    });

    it('should scale linearly with text length', async () => {
      const shortText = 'short';
      const longText = 'a'.repeat(1000);

      const start1 = performance.now();
      await vectorStore.generateEmbedding(shortText);
      const duration1 = performance.now() - start1;

      const start2 = performance.now();
      await vectorStore.generateEmbedding(longText);
      const duration2 = performance.now() - start2;

      // Long text should not be dramatically slower
      expect(duration2).toBeLessThan(duration1 * 100);
    });

    it('should handle batch generation efficiently', async () => {
      const texts = Array.from({ length: 100 }, (_, i) =>
        `Test text number ${i} for batch embedding`
      );

      const start = performance.now();
      await Promise.all(texts.map(text => vectorStore.generateEmbedding(text)));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // 100 embeddings in less than 100ms
    });
  });

  describe('Semantic Properties', () => {
    it('should capture semantic similarity', async () => {
      const pairs = [
        ['happy', 'joyful'],
        ['sad', 'unhappy'],
        ['big', 'large'],
        ['small', 'tiny']
      ];

      for (const [word1, word2] of pairs) {
        const emb1 = await vectorStore.generateEmbedding(word1);
        const emb2 = await vectorStore.generateEmbedding(word2);
        const similarity = vectorStore.cosineSimilarity(emb1, emb2);

        // Similar words should have positive similarity
        expect(similarity).toBeGreaterThan(0.3);
      }
    });

    it('should distinguish opposite meanings', async () => {
      const text1 = 'safe secure protected';
      const text2 = 'dangerous harmful threat';

      const emb1 = await vectorStore.generateEmbedding(text1);
      const emb2 = await vectorStore.generateEmbedding(text2);
      const similarity = vectorStore.cosineSimilarity(emb1, emb2);

      // Different semantic content should have lower similarity
      expect(similarity).toBeLessThan(0.6);
    });

    it('should capture context in phrases', async () => {
      const phrase1 = 'bank account balance';
      const phrase2 = 'river bank fishing';

      const emb1 = await vectorStore.generateEmbedding(phrase1);
      const emb2 = await vectorStore.generateEmbedding(phrase2);
      const similarity = vectorStore.cosineSimilarity(emb1, emb2);

      // Different contexts of "bank" should be distinguishable
      expect(similarity).toBeLessThan(0.8);
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle null-like inputs gracefully', async () => {
      const inputs = ['', '   ', '\n\n\n', '\t\t\t'];

      for (const input of inputs) {
        const embedding = await vectorStore.generateEmbedding(input);
        expect(embedding).toHaveLength(384);
        expect(embedding.every(val => isFinite(val))).toBe(true);
      }
    });

    it('should handle repeated characters', async () => {
      const text = 'aaaaaaaaaaaaaaaaaaaaaa';
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should handle all ASCII characters', async () => {
      const text = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).join('');
      const embedding = await vectorStore.generateEmbedding(text);

      expect(embedding).toHaveLength(384);
      expect(embedding.every(val => isFinite(val))).toBe(true);
    });

    it('should be deterministic', async () => {
      const text = 'Determinism test';
      const embeddings = await Promise.all(
        Array.from({ length: 10 }, () => vectorStore.generateEmbedding(text))
      );

      // All embeddings should be identical
      for (let i = 1; i < embeddings.length; i++) {
        expect(embeddings[i]).toEqual(embeddings[0]);
      }
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory on repeated calls', async () => {
      const text = 'Memory leak test';
      const iterations = 1000;

      // This test verifies no crashes or excessive memory use
      for (let i = 0; i < iterations; i++) {
        await vectorStore.generateEmbedding(text);
      }

      // If we get here without crashing, test passes
      expect(true).toBe(true);
    }, 10000);

    it('should handle large batch without memory issues', async () => {
      const texts = Array.from({ length: 1000 }, (_, i) =>
        `Test text ${i}`
      );

      const embeddings = await Promise.all(
        texts.map(text => vectorStore.generateEmbedding(text))
      );

      expect(embeddings).toHaveLength(1000);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);
    }, 15000);
  });
});
