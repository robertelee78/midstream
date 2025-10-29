"use strict";
/**
 * ThreatVector Schema for AgentDB
 *
 * Defines the structure of threat patterns stored in the vector database
 * with 768-dimensional embeddings for semantic similarity search.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BATCH_OPTIONS = exports.DEFAULT_HNSW_CONFIG = void 0;
/**
 * Default HNSW configuration optimized for speed
 */
exports.DEFAULT_HNSW_CONFIG = {
    M: 16, // Optimal for speed
    efConstruction: 200, // Good balance of quality and build speed
    ef: 100, // Search-time performance
    metric: 'cosine' // Best for semantic similarity
};
/**
 * Default batch insert options
 */
exports.DEFAULT_BATCH_OPTIONS = {
    batchSize: 1000,
    continueOnError: false
};
