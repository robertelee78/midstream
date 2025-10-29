/**
 * Embedding Utilities for AgentDB Integration
 *
 * Provides embedding generation and manipulation utilities for threat patterns.
 * Supports both local and API-based embedding generation.
 */

import * as crypto from 'crypto';

/**
 * Embedding provider interface
 */
export interface EmbeddingProvider {
  /** Generate embeddings for text */
  embed(text: string): Promise<Float32Array>;

  /** Generate embeddings for multiple texts */
  embedBatch(texts: string[]): Promise<Float32Array[]>;

  /** Embedding dimension size */
  dimensions: number;
}

/**
 * Simple hash-based embedding generator (for testing/fallback)
 * Uses deterministic hashing to create 768-dimensional vectors
 */
export class HashEmbeddingProvider implements EmbeddingProvider {
  public readonly dimensions = 768;

  /**
   * Generate embedding from text hash
   */
  async embed(text: string): Promise<Float32Array> {
    const hash = crypto.createHash('sha512').update(text).digest();
    const embedding = new Float32Array(this.dimensions);

    // Fill embedding with normalized hash values
    for (let i = 0; i < this.dimensions; i++) {
      const byteIndex = i % hash.length;
      embedding[i] = (hash[byteIndex] / 255) * 2 - 1; // Normalize to [-1, 1]
    }

    // Normalize to unit vector
    return this.normalize(embedding);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map(text => this.embed(text)));
  }

  /**
   * Normalize vector to unit length
   */
  private normalize(vector: Float32Array): Float32Array {
    const magnitude = Math.sqrt(
      Array.from(vector).reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) return vector;

    return Float32Array.from(vector, val => val / magnitude);
  }
}

/**
 * OpenAI embeddings provider (text-embedding-3-small)
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly dimensions = 768;
  private apiKey: string;
  private model = 'text-embedding-3-small';
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided, embeddings will not work');
    }
  }

  /**
   * Generate embedding using OpenAI API
   */
  async embed(text: string): Promise<Float32Array> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: this.dimensions
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return new Float32Array(data.data[0].embedding);
  }

  /**
   * Generate embeddings for multiple texts (batched)
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // OpenAI supports batch embeddings
    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
        dimensions: this.dimensions
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    return data.data.map((item: any) => new Float32Array(item.embedding));
  }
}

/**
 * Embedding utility functions
 */
export class EmbeddingUtils {
  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  static euclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Normalize embedding to unit vector
   */
  static normalize(embedding: Float32Array): Float32Array {
    const magnitude = Math.sqrt(
      Array.from(embedding).reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) return embedding;

    return Float32Array.from(embedding, val => val / magnitude);
  }

  /**
   * Average multiple embeddings
   */
  static average(embeddings: Float32Array[]): Float32Array {
    if (embeddings.length === 0) {
      throw new Error('Cannot average empty array');
    }

    const dimensions = embeddings[0].length;
    const result = new Float32Array(dimensions);

    for (const embedding of embeddings) {
      if (embedding.length !== dimensions) {
        throw new Error('All embeddings must have same dimensions');
      }

      for (let i = 0; i < dimensions; i++) {
        result[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      result[i] /= embeddings.length;
    }

    return this.normalize(result);
  }
}

/**
 * Create embedding provider based on configuration
 */
export function createEmbeddingProvider(config?: {
  provider?: 'hash' | 'openai';
  apiKey?: string;
}): EmbeddingProvider {
  const provider = config?.provider || 'hash';

  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config?.apiKey);
    case 'hash':
    default:
      return new HashEmbeddingProvider();
  }
}
