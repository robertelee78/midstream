/**
 * ThreatVector Schema for AgentDB
 *
 * Defines the structure of threat patterns stored in the vector database
 * with 768-dimensional embeddings for semantic similarity search.
 */
/**
 * Threat vector metadata
 */
export interface ThreatMetadata {
    /** Threat type (prompt_injection, sql_injection, xss, etc.) */
    type: string;
    /** Severity level (low, medium, high, critical) */
    severity: 'low' | 'medium' | 'high' | 'critical';
    /** Detection confidence (0.0 - 1.0) */
    confidence: number;
    /** Attack chain sequence */
    attackChain?: string[];
    /** Source IPs that triggered this pattern */
    sourceIPs?: string[];
    /** Detection count */
    detectionCount: number;
    /** First seen timestamp */
    firstSeen: Date;
    /** Last seen timestamp */
    lastSeen: Date;
    /** Pattern variations */
    variations?: string[];
    /** Additional custom metadata */
    [key: string]: any;
}
/**
 * ThreatVector schema for AgentDB storage
 */
export interface ThreatVector {
    /** Unique identifier */
    id: string;
    /** 768-dimensional embedding vector */
    embedding: Float32Array;
    /** Original threat pattern text */
    pattern: string;
    /** Threat metadata */
    metadata: ThreatMetadata;
    /** Creation timestamp */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
}
/**
 * HNSW Index configuration
 */
export interface HNSWConfig {
    /** Number of bi-directional links per element (recommended: 16) */
    M: number;
    /** Size of the dynamic candidate list (recommended: 200) */
    efConstruction: number;
    /** Search-time dynamic list size (recommended: 100) */
    ef: number;
    /** Distance metric (cosine, euclidean, inner_product) */
    metric: 'cosine' | 'euclidean' | 'inner_product';
}
/**
 * Vector search query
 */
export interface VectorSearchQuery {
    /** Query embedding vector */
    embedding: Float32Array;
    /** Number of results to return */
    k: number;
    /** Minimum similarity threshold (0.0 - 1.0) */
    threshold?: number;
    /** Filter by threat type */
    type?: string;
    /** Filter by severity */
    severity?: 'low' | 'medium' | 'high' | 'critical';
}
/**
 * Vector search result
 */
export interface VectorSearchResult {
    /** Matched threat vector */
    vector: ThreatVector;
    /** Similarity score (0.0 - 1.0) */
    similarity: number;
    /** Search latency in milliseconds */
    latency: number;
}
/**
 * Batch insert options
 */
export interface BatchInsertOptions {
    /** Batch size for chunked insertion */
    batchSize: number;
    /** Continue on error */
    continueOnError: boolean;
    /** Progress callback */
    onProgress?: (completed: number, total: number) => void;
}
/**
 * Default HNSW configuration optimized for speed
 */
export declare const DEFAULT_HNSW_CONFIG: HNSWConfig;
/**
 * Default batch insert options
 */
export declare const DEFAULT_BATCH_OPTIONS: BatchInsertOptions;
