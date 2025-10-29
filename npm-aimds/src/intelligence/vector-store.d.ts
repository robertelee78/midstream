/**
 * ThreatVectorStore - AgentDB Vector Store Implementation
 *
 * Provides high-performance vector storage and similarity search for threat patterns
 * using AgentDB with HNSW indexing (150x faster than traditional methods).
 *
 * Performance targets:
 * - Store 1,000 vectors in <1s
 * - Search 1,000 vectors in <100ms total (<0.1ms each)
 * - Memory usage <50MB for 10K vectors
 */
import type { ThreatVector, HNSWConfig, VectorSearchQuery, VectorSearchResult, BatchInsertOptions } from './schemas';
/**
 * ThreatVectorStore configuration
 */
export interface VectorStoreConfig {
    /** Database file path */
    dbPath?: string;
    /** HNSW index configuration */
    hnsw?: Partial<HNSWConfig>;
    /** Enable automatic indexing */
    autoIndex?: boolean;
    /** Enable query logging */
    logQueries?: boolean;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    /** Total vectors stored */
    totalVectors: number;
    /** Average search latency (ms) */
    avgSearchLatency: number;
    /** Total searches performed */
    totalSearches: number;
    /** Memory usage (bytes) */
    memoryUsage: number;
    /** Index build time (ms) */
    indexBuildTime: number;
}
/**
 * ThreatVectorStore - Main class for vector operations
 */
export declare class ThreatVectorStore {
    private db;
    private config;
    private metrics;
    private logger?;
    constructor(config?: VectorStoreConfig);
    /**
     * Initialize the vector store
     */
    initialize(): Promise<void>;
    /**
     * Build HNSW index on threat vectors
     */
    buildIndex(): Promise<void>;
    /**
     * Store a threat vector
     */
    storeThreat(threat: ThreatVector): Promise<void>;
    /**
     * Batch insert threat vectors
     */
    batchInsert(threats: ThreatVector[], options?: Partial<BatchInsertOptions>): Promise<{
        successful: number;
        failed: number;
    }>;
    /**
     * Search for similar threat vectors
     * Target: <0.1ms per search
     */
    searchSimilar(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
    /**
     * Get threat vector by ID
     */
    getThreat(id: string): Promise<ThreatVector | null>;
    /**
     * Delete threat vector by ID
     */
    deleteThreat(id: string): Promise<boolean>;
    /**
     * Get performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Update search metrics
     */
    private updateSearchMetrics;
    /**
     * Close the database connection
     */
    close(): Promise<void>;
    /**
     * Set logger instance
     */
    setLogger(logger: any): void;
}
/**
 * Create and initialize a ThreatVectorStore
 */
export declare function createVectorStore(config?: VectorStoreConfig): Promise<ThreatVectorStore>;
