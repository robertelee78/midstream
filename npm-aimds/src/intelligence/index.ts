/**
 * AI Defence Intelligence Module
 *
 * Week 1: AgentDB Foundation
 * - ThreatVectorStore: High-performance vector storage with HNSW indexing
 * - Embeddings: Multiple embedding providers (hash, OpenAI)
 * - Schemas: TypeScript types and interfaces
 *
 * Performance targets:
 * - 750K req/s throughput
 * - <0.1ms search latency
 * - 150x faster than traditional methods
 */

// Core exports
export * from './schemas';
export * from './vector-store';
export * from './embeddings';

// Re-export main classes for convenience
export { ThreatVectorStore, createVectorStore } from './vector-store';
export {
  HashEmbeddingProvider,
  OpenAIEmbeddingProvider,
  EmbeddingUtils,
  createEmbeddingProvider
} from './embeddings';
export type {
  ThreatVector,
  ThreatMetadata,
  HNSWConfig,
  VectorSearchQuery,
  VectorSearchResult
} from './schemas';
