/**
 * Embedding Utilities for AgentDB Integration
 *
 * Provides embedding generation and manipulation utilities for threat patterns.
 * Supports both local and API-based embedding generation.
 */
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
export declare class HashEmbeddingProvider implements EmbeddingProvider {
    readonly dimensions = 768;
    /**
     * Generate embedding from text hash
     */
    embed(text: string): Promise<Float32Array>;
    /**
     * Generate embeddings for multiple texts
     */
    embedBatch(texts: string[]): Promise<Float32Array[]>;
    /**
     * Normalize vector to unit length
     */
    private normalize;
}
/**
 * OpenAI embeddings provider (text-embedding-3-small)
 */
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    readonly dimensions = 768;
    private apiKey;
    private model;
    private baseURL;
    constructor(apiKey?: string);
    /**
     * Generate embedding using OpenAI API
     */
    embed(text: string): Promise<Float32Array>;
    /**
     * Generate embeddings for multiple texts (batched)
     */
    embedBatch(texts: string[]): Promise<Float32Array[]>;
}
/**
 * Embedding utility functions
 */
export declare class EmbeddingUtils {
    /**
     * Calculate cosine similarity between two embeddings
     */
    static cosineSimilarity(a: Float32Array, b: Float32Array): number;
    /**
     * Calculate Euclidean distance between two embeddings
     */
    static euclideanDistance(a: Float32Array, b: Float32Array): number;
    /**
     * Normalize embedding to unit vector
     */
    static normalize(embedding: Float32Array): Float32Array;
    /**
     * Average multiple embeddings
     */
    static average(embeddings: Float32Array[]): Float32Array;
}
/**
 * Create embedding provider based on configuration
 */
export declare function createEmbeddingProvider(config?: {
    provider?: 'hash' | 'openai';
    apiKey?: string;
}): EmbeddingProvider;
