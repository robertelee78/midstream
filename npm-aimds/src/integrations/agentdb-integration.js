/**
 * AgentDB Integration for Semantic Search
 * Enables vector-based similarity search for detection patterns
 */

import { AgentDB } from 'agentdb';

export class AgentDBIntegration {
  constructor(config = {}) {
    this.config = {
      dbPath: config.dbPath || './data/aimds-patterns.db',
      dimension: config.dimension || 384,
      ...config
    };

    this.db = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize AgentDB
      this.db = new AgentDB({
        path: this.config.dbPath,
        dimension: this.config.dimension
      });

      await this.db.connect();

      // Create collection for manipulation patterns
      await this.db.createCollection('manipulation_patterns', {
        dimension: this.config.dimension,
        metric: 'cosine'
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(`AgentDB initialization failed: ${error.message}`);
    }
  }

  /**
   * Store a detection pattern
   */
  async storePattern(pattern) {
    await this.ensureInitialized();

    const embedding = await this.generateEmbedding(pattern.text);

    await this.db.insert('manipulation_patterns', {
      id: pattern.id,
      vector: embedding,
      metadata: {
        type: pattern.type,
        severity: pattern.severity,
        description: pattern.description,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Search for similar patterns
   */
  async searchSimilarPatterns(text, options = {}) {
    await this.ensureInitialized();

    const embedding = await this.generateEmbedding(text);

    const results = await this.db.search('manipulation_patterns', {
      vector: embedding,
      limit: options.limit || 10,
      threshold: options.threshold || 0.7
    });

    return results.map(result => ({
      pattern: result.metadata,
      similarity: result.score,
      distance: result.distance
    }));
  }

  /**
   * Semantic similarity check
   */
  async checkSimilarity(text1, text2) {
    const [embedding1, embedding2] = await Promise.all([
      this.generateEmbedding(text1),
      this.generateEmbedding(text2)
    ]);

    return this.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Generate embedding from text
   */
  async generateEmbedding(text) {
    // In production, use a real embedding model
    // For now, create a simple hash-based embedding
    const normalized = text.toLowerCase();
    const embedding = new Array(this.config.dimension).fill(0);

    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = charCode % this.config.dimension;
      embedding[index] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Get pattern statistics
   */
  async getStats() {
    await this.ensureInitialized();

    const count = await this.db.count('manipulation_patterns');

    return {
      totalPatterns: count,
      dimension: this.config.dimension,
      dbPath: this.config.dbPath
    };
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
    }
  }
}

export default AgentDBIntegration;
