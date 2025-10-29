/**
 * Embedding Bridge for AgentDB + Midstreamer Integration
 * Converts temporal sequences to semantic vector embeddings
 *
 * Performance Targets:
 * - Embedding generation: <10ms
 * - Storage latency: <10ms async
 * - Search recall@10: >0.95
 *
 * Integration Points:
 * - Midstreamer DTW: npm-wasm/pkg-node/TemporalCompare
 * - AgentDB: Vector storage with HNSW indexing
 *
 * @module embedding-bridge
 * @version 1.0.0
 */

// Real midstreamer package imports (published to npm)
import type { TemporalCompare, TemporalMetrics } from 'midstreamer/pkg-node/midstream_wasm';

// ============================================================================
// Type Definitions & Interfaces
// ============================================================================

/**
 * Temporal sequence data structure
 */
export interface TemporalSequence {
  data: number[];
  timestamp: Date;
  metadata?: {
    source?: string;
    sampleRate?: number;
    unit?: string;
    domain?: string;
    tags?: string[];
  };
}

/**
 * Complete temporal embedding with features
 */
export interface TemporalEmbedding {
  embedding: number[];
  sequence: TemporalSequence;
  features: TemporalFeatures;
  metadata: {
    windowSize: number;
    dtwDistance?: number;
    method: EmbeddingMethod;
    version: string;
    generationTime?: number; // milliseconds
  };
}

/**
 * All extracted temporal features
 */
export interface TemporalFeatures {
  statistical: StatisticalFeatures;
  frequency: FrequencyFeatures;
  dtw?: DTWFeatures;
  wavelet?: WaveletFeatures;
}

/**
 * Statistical features (12 dimensions)
 */
export interface StatisticalFeatures {
  mean: number;
  std: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  range: number;
  median: number;
  q25: number;
  q75: number;
  iqr: number;
}

/**
 * Frequency domain features (35 dimensions)
 */
export interface FrequencyFeatures {
  fftCoefficients: number[]; // 32 coefficients
  spectralEntropy: number;
  spectralCentroid: number;
  spectralRolloff: number;
}

/**
 * DTW-based features (3N dimensions where N = template count)
 */
export interface DTWFeatures {
  distanceToTemplates: number[];
  warpingPathLengths: number[];
  alignmentScores: number[];
}

/**
 * Wavelet features (64 dimensions)
 */
export interface WaveletFeatures {
  coefficients: number[];
  energyDistribution: number[];
  scales: number[];
}

/**
 * Embedding method types
 */
export type EmbeddingMethod =
  | 'statistical'    // Statistical features only (12 dim)
  | 'frequency'      // Frequency features only (35 dim)
  | 'dtw'            // DTW features only (3N dim)
  | 'wavelet'        // Wavelet features only (64 dim)
  | 'hybrid'         // All features combined (114+ dim)
  | 'learned';       // Neural network embedding (future)

/**
 * Embedding generation options
 */
export interface EmbeddingOptions {
  method?: EmbeddingMethod;
  dimensions?: number;
  includeWavelet?: boolean;
  normalizeFeatures?: boolean;
  templates?: number[][];
  useCaching?: boolean;
}

/**
 * Search options for pattern matching
 */
export interface SearchOptions {
  limit?: number;
  threshold?: number;
  timeRange?: [Date, Date];
  filters?: {
    domain?: string;
    tags?: string[];
    minSimilarity?: number;
    source?: string;
  };
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  id: string;
  similarity: number;
  distance: number;
  pattern: TemporalEmbedding;
  metadata?: Record<string, any>;
}

/**
 * AgentDB interface (minimal required subset)
 */
export interface IAgentDB {
  add(namespace: string, data: {
    id: string;
    vector: number[];
    metadata: Record<string, any>;
  }): Promise<void>;

  search(namespace: string, options: {
    vector: number[];
    limit: number;
    filter?: Record<string, any>;
    minSimilarity?: number;
  }): Promise<Array<{
    id: string;
    similarity: number;
    vector: number[];
    metadata: Record<string, any>;
  }>>;
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

/**
 * Simple LRU cache for embedding results
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// Embedding Bridge Implementation
// ============================================================================

/**
 * Semantic Temporal Bridge
 * Converts temporal sequences to vector embeddings for AgentDB storage
 */
export class EmbeddingBridge {
  private agentdb: IAgentDB;
  private temporalCompare: TemporalCompare;
  private embeddingCache: LRUCache<string, number[]>;
  private templates: number[][];
  private namespace: string;

  constructor(
    agentdb: IAgentDB,
    temporalCompare: TemporalCompare,
    options?: {
      cacheSize?: number;
      defaultTemplates?: number[][];
      namespace?: string;
    }
  ) {
    this.agentdb = agentdb;
    this.temporalCompare = temporalCompare;
    this.embeddingCache = new LRUCache(options?.cacheSize || 1000);
    this.templates = options?.defaultTemplates || [];
    this.namespace = options?.namespace || 'temporal_patterns';
  }

  // ==========================================================================
  // Core Embedding Methods
  // ==========================================================================

  /**
   * Convert temporal sequence to vector embedding
   * Target: <10ms generation time
   */
  async embedSequence(
    sequence: number[] | TemporalSequence,
    options: EmbeddingOptions = {}
  ): Promise<TemporalEmbedding> {
    const startTime = performance.now();

    const {
      method = 'hybrid',
      dimensions = 384,
      includeWavelet = false,
      normalizeFeatures = true,
      templates = this.templates,
      useCaching = true
    } = options;

    // Normalize input
    const seq = Array.isArray(sequence)
      ? { data: sequence, timestamp: new Date() }
      : sequence;

    // Check cache
    const cacheKey = this.getCacheKey(seq.data, method, includeWavelet);
    if (useCaching && this.embeddingCache.has(cacheKey)) {
      const cachedEmbedding = this.embeddingCache.get(cacheKey)!;
      return {
        embedding: cachedEmbedding,
        sequence: seq,
        features: {} as TemporalFeatures, // Not stored in cache
        metadata: {
          windowSize: seq.data.length,
          method,
          version: '1.0.0',
          generationTime: performance.now() - startTime
        }
      };
    }

    // Extract features based on method
    let features: TemporalFeatures;
    let embedding: number[];

    switch (method) {
      case 'statistical':
        features = {
          statistical: this.extractStatisticalFeatures(seq.data),
          frequency: this.createEmptyFrequencyFeatures()
        };
        embedding = Object.values(features.statistical);
        break;

      case 'frequency':
        features = {
          statistical: this.createEmptyStatisticalFeatures(),
          frequency: this.extractFrequencyFeatures(seq.data)
        };
        embedding = [
          ...features.frequency.fftCoefficients,
          features.frequency.spectralEntropy,
          features.frequency.spectralCentroid,
          features.frequency.spectralRolloff
        ];
        break;

      case 'dtw':
        const dtwFeatures = this.extractDTWFeatures(seq.data, templates);
        features = {
          statistical: this.createEmptyStatisticalFeatures(),
          frequency: this.createEmptyFrequencyFeatures(),
          dtw: dtwFeatures
        };
        embedding = [
          ...dtwFeatures.distanceToTemplates,
          ...dtwFeatures.warpingPathLengths,
          ...dtwFeatures.alignmentScores
        ];
        break;

      case 'wavelet':
        const waveletFeatures = this.extractWaveletFeatures(seq.data);
        features = {
          statistical: this.createEmptyStatisticalFeatures(),
          frequency: this.createEmptyFrequencyFeatures(),
          wavelet: waveletFeatures
        };
        embedding = waveletFeatures.coefficients;
        break;

      case 'hybrid':
        const statFeatures = this.extractStatisticalFeatures(seq.data);
        const freqFeatures = this.extractFrequencyFeatures(seq.data);

        features = {
          statistical: statFeatures,
          frequency: freqFeatures
        };

        embedding = [
          ...Object.values(statFeatures),
          ...freqFeatures.fftCoefficients,
          freqFeatures.spectralEntropy,
          freqFeatures.spectralCentroid,
          freqFeatures.spectralRolloff
        ];

        // Add DTW features if templates available
        if (templates.length > 0) {
          const dtwFeats = this.extractDTWFeatures(seq.data, templates);
          features.dtw = dtwFeats;
          embedding.push(
            ...dtwFeats.distanceToTemplates,
            ...dtwFeats.warpingPathLengths,
            ...dtwFeats.alignmentScores
          );
        }

        // Add wavelet features if requested
        if (includeWavelet) {
          const waveletFeats = this.extractWaveletFeatures(seq.data);
          features.wavelet = waveletFeats;
          embedding.push(...waveletFeats.coefficients);
        }
        break;

      case 'learned':
        throw new Error('Learned embeddings not yet implemented');

      default:
        throw new Error(`Unknown embedding method: ${method}`);
    }

    // Normalize features
    if (normalizeFeatures) {
      embedding = this.l2Normalize(embedding);
    }

    // Resize to target dimensions
    embedding = this.resizeEmbedding(embedding, dimensions);

    // Cache result
    if (useCaching) {
      this.embeddingCache.set(cacheKey, embedding);
    }

    const generationTime = performance.now() - startTime;

    return {
      embedding,
      sequence: seq,
      features,
      metadata: {
        windowSize: seq.data.length,
        method,
        version: '1.0.0',
        generationTime
      }
    };
  }

  /**
   * Store temporal pattern in AgentDB
   * Target: <10ms async storage
   */
  async storePattern(
    embedding: TemporalEmbedding | number[],
    metadata?: Partial<TemporalEmbedding>,
    namespace?: string
  ): Promise<string> {
    const ns = namespace || this.namespace;

    // Handle both embedding array and full TemporalEmbedding
    const embedVec = Array.isArray(embedding) ? embedding : embedding.embedding;
    const fullMetadata = Array.isArray(embedding) ? metadata : embedding;

    if (!fullMetadata) {
      throw new Error('Metadata required when storing embedding array');
    }

    const patternId = this.generatePatternId(fullMetadata as TemporalEmbedding);

    await this.agentdb.add(ns, {
      id: patternId,
      vector: embedVec,
      metadata: {
        timestamp: fullMetadata.sequence?.timestamp.toISOString(),
        windowSize: fullMetadata.metadata?.windowSize,
        method: fullMetadata.metadata?.method,
        version: fullMetadata.metadata?.version || '1.0.0',
        features: fullMetadata.features,
        sequenceMetadata: fullMetadata.sequence?.metadata,
        generationTime: fullMetadata.metadata?.generationTime
      }
    });

    return patternId;
  }

  /**
   * Find similar temporal patterns using HNSW search
   * Target: >0.95 recall@10
   */
  async findSimilarPatterns(
    query: number[] | TemporalEmbedding,
    options: SearchOptions = {}
  ): Promise<PatternMatch[]> {
    const {
      limit = 10,
      threshold = 0.7,
      timeRange,
      filters
    } = options;

    // Extract query vector
    const queryVector = Array.isArray(query) ? query : query.embedding;

    // Build search filters
    const searchFilters: Record<string, any> = {};

    if (timeRange) {
      searchFilters.timestamp = {
        $gte: timeRange[0].toISOString(),
        $lte: timeRange[1].toISOString()
      };
    }

    if (filters?.domain) {
      searchFilters['sequenceMetadata.domain'] = filters.domain;
    }

    if (filters?.source) {
      searchFilters['sequenceMetadata.source'] = filters.source;
    }

    if (filters?.tags && filters.tags.length > 0) {
      searchFilters['sequenceMetadata.tags'] = { $in: filters.tags };
    }

    // Perform HNSW vector search
    const results = await this.agentdb.search(this.namespace, {
      vector: queryVector,
      limit,
      filter: Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
      minSimilarity: filters?.minSimilarity || threshold
    });

    // Transform results to PatternMatch
    return results.map(result => ({
      id: result.id,
      similarity: result.similarity,
      distance: 1 - result.similarity,
      pattern: {
        embedding: result.vector,
        sequence: {
          data: [], // Raw data not stored
          timestamp: new Date(result.metadata.timestamp),
          metadata: result.metadata.sequenceMetadata
        },
        features: result.metadata.features,
        metadata: {
          windowSize: result.metadata.windowSize,
          method: result.metadata.method,
          version: result.metadata.version,
          generationTime: result.metadata.generationTime
        }
      },
      metadata: result.metadata
    }));
  }

  // ==========================================================================
  // Feature Extraction Methods
  // ==========================================================================

  /**
   * Extract statistical features (12 dimensions)
   * Mean, std, variance, skewness, kurtosis, min, max, range, median, q25, q75, iqr
   */
  private extractStatisticalFeatures(data: number[]): StatisticalFeatures {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);

    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    const skewness = std === 0 ? 0 :
      data.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0) / n;

    const kurtosis = std === 0 ? 0 :
      data.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) / n;

    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;
    const median = sorted[Math.floor(n / 2)];
    const q25 = sorted[Math.floor(n * 0.25)];
    const q75 = sorted[Math.floor(n * 0.75)];
    const iqr = q75 - q25;

    return {
      mean,
      std,
      variance,
      skewness,
      kurtosis,
      min,
      max,
      range,
      median,
      q25,
      q75,
      iqr
    };
  }

  /**
   * Extract frequency features via FFT (35 dimensions)
   * 32 FFT coefficients + spectral entropy + centroid + rolloff
   */
  private extractFrequencyFeatures(data: number[]): FrequencyFeatures {
    const n = data.length;
    const fftSize = Math.pow(2, Math.ceil(Math.log2(n)));

    // Pad to power of 2
    const padded = [...data, ...new Array(fftSize - n).fill(0)];

    // Compute DFT (simplified, real FFT library recommended for production)
    const fft = this.computeDFT(padded);
    const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));

    // Take top 32 coefficients (normalized)
    const topCoefficients = magnitudes.slice(0, 32);
    const maxMagnitude = Math.max(...topCoefficients, 1e-10);
    const fftCoefficients = topCoefficients.map(m => m / maxMagnitude);

    // Spectral features
    const spectralEntropy = this.computeSpectralEntropy(magnitudes);
    const spectralCentroid = this.computeSpectralCentroid(magnitudes);
    const spectralRolloff = this.computeSpectralRolloff(magnitudes, 0.95);

    return {
      fftCoefficients,
      spectralEntropy,
      spectralCentroid,
      spectralRolloff
    };
  }

  /**
   * Extract DTW-based features (3N dimensions where N = template count)
   * For each template: normalized distance + warping path length + alignment score
   */
  private extractDTWFeatures(data: number[], templates: number[][]): DTWFeatures {
    if (templates.length === 0) {
      // Return self-similarity features
      return {
        distanceToTemplates: [0],
        warpingPathLengths: [1],
        alignmentScores: [1]
      };
    }

    const distanceToTemplates: number[] = [];
    const warpingPathLengths: number[] = [];
    const alignmentScores: number[] = [];

    const seq1 = new Float64Array(data);

    for (const template of templates) {
      const seq2 = new Float64Array(template);

      // Compute DTW using Midstreamer
      const distance = this.temporalCompare.dtw(seq1, seq2);

      // Normalize by sequence length
      const normalizedDistance = distance / Math.max(data.length, template.length);
      distanceToTemplates.push(normalizedDistance);

      // Estimate warping path length (normalized)
      // In a full implementation, extract from DTW result
      const estimatedPathLength = Math.abs(data.length - template.length) /
        Math.max(data.length, template.length);
      warpingPathLengths.push(estimatedPathLength);

      // Alignment score (inverse of normalized distance)
      const alignmentScore = 1 / (1 + normalizedDistance);
      alignmentScores.push(alignmentScore);
    }

    return {
      distanceToTemplates,
      warpingPathLengths,
      alignmentScores
    };
  }

  /**
   * Extract wavelet features (64 dimensions)
   * Simplified Haar wavelet transform at multiple scales
   */
  private extractWaveletFeatures(data: number[]): WaveletFeatures {
    const scales = [1, 2, 4, 8, 16, 32];
    const coefficients: number[] = [];
    const energyDistribution: number[] = [];

    for (const scale of scales) {
      const waveletCoeffs = this.haarWaveletTransform(data, scale);

      // Subsample coefficients (10 per scale)
      const subsample = this.subsampleArray(waveletCoeffs, 10);
      coefficients.push(...subsample);

      // Energy at this scale
      const energy = waveletCoeffs.reduce((a, b) => a + b * b, 0);
      energyDistribution.push(energy);
    }

    // Pad to 64 dimensions if needed
    while (coefficients.length < 64) {
      coefficients.push(0);
    }

    return {
      coefficients: coefficients.slice(0, 64),
      energyDistribution,
      scales
    };
  }

  // ==========================================================================
  // Signal Processing Utilities
  // ==========================================================================

  /**
   * Compute Discrete Fourier Transform (simplified)
   * Production: Use fft.js or similar library
   */
  private computeDFT(data: number[]): Array<{ real: number; imag: number }> {
    const n = data.length;
    const result: Array<{ real: number; imag: number }> = [];

    for (let k = 0; k < n; k++) {
      let real = 0;
      let imag = 0;

      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += data[t] * Math.cos(angle);
        imag -= data[t] * Math.sin(angle);
      }

      result.push({ real, imag });
    }

    return result;
  }

  /**
   * Compute spectral centroid (center of mass of spectrum)
   */
  private computeSpectralCentroid(magnitudes: number[]): number {
    const sum = magnitudes.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const weightedSum = magnitudes.reduce((a, b, i) => a + b * i, 0);
    return weightedSum / sum / magnitudes.length; // Normalized
  }

  /**
   * Compute spectral entropy (measure of spectral complexity)
   */
  private computeSpectralEntropy(magnitudes: number[]): number {
    const sum = magnitudes.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const probs = magnitudes.map(m => m / sum);
    const entropy = -probs.reduce((a, p) => {
      return a + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);

    // Normalize to [0, 1]
    const maxEntropy = Math.log2(magnitudes.length);
    return maxEntropy === 0 ? 0 : entropy / maxEntropy;
  }

  /**
   * Compute spectral rolloff (frequency below which X% of energy is contained)
   */
  private computeSpectralRolloff(magnitudes: number[], threshold: number = 0.95): number {
    const totalEnergy = magnitudes.reduce((a, b) => a + b * b, 0);
    const targetEnergy = threshold * totalEnergy;

    let cumulativeEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i] * magnitudes[i];
      if (cumulativeEnergy >= targetEnergy) {
        return i / magnitudes.length; // Normalized
      }
    }

    return 1.0;
  }

  /**
   * Haar wavelet transform at given scale
   */
  private haarWaveletTransform(data: number[], scale: number): number[] {
    const coeffs: number[] = [];

    for (let i = 0; i < data.length - scale; i += scale) {
      const window = data.slice(i, i + scale);
      const avg = window.reduce((a, b) => a + b, 0) / scale;
      const diff = window.reduce((a, b) => a + Math.abs(b - avg), 0) / scale;
      coeffs.push(diff);
    }

    return coeffs;
  }

  /**
   * Subsample array to target size
   */
  private subsampleArray(arr: number[], targetSize: number): number[] {
    if (arr.length <= targetSize) {
      return [...arr];
    }

    const step = arr.length / targetSize;
    const result: number[] = [];

    for (let i = 0; i < targetSize; i++) {
      const idx = Math.floor(i * step);
      result.push(arr[idx]);
    }

    return result;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * L2 normalization (unit vector)
   */
  private l2Normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0));
    return norm === 0 ? vector : vector.map(v => v / norm);
  }

  /**
   * Resize embedding to target dimensions
   */
  private resizeEmbedding(features: number[], targetDim: number): number[] {
    if (features.length === targetDim) {
      return features;
    }

    if (features.length > targetDim) {
      // Truncate to target dimensions
      return features.slice(0, targetDim);
    } else {
      // Pad with zeros
      return [...features, ...new Array(targetDim - features.length).fill(0)];
    }
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(embedding: TemporalEmbedding): string {
    const timestamp = embedding.sequence.timestamp.getTime();
    const hash = this.hashSequence(embedding.sequence.data);
    return `pattern_${timestamp}_${hash}`;
  }

  /**
   * Hash sequence data for cache key
   */
  private hashSequence(data: number[]): string {
    // Simple hash using first 10 values
    const sample = data.slice(0, Math.min(10, data.length));
    const str = sample.map(n => n.toFixed(2)).join(',');

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache key for embedding
   */
  private getCacheKey(data: number[], method: EmbeddingMethod, includeWavelet: boolean): string {
    const hash = this.hashSequence(data);
    return `${method}_${includeWavelet ? 'w' : 'nw'}_${hash}`;
  }

  /**
   * Create empty statistical features
   */
  private createEmptyStatisticalFeatures(): StatisticalFeatures {
    return {
      mean: 0, std: 0, variance: 0, skewness: 0, kurtosis: 0,
      min: 0, max: 0, range: 0, median: 0, q25: 0, q75: 0, iqr: 0
    };
  }

  /**
   * Create empty frequency features
   */
  private createEmptyFrequencyFeatures(): FrequencyFeatures {
    return {
      fftCoefficients: new Array(32).fill(0),
      spectralEntropy: 0,
      spectralCentroid: 0,
      spectralRolloff: 0
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.embeddingCache.size,
      maxSize: 1000 // From LRUCache default
    };
  }

  /**
   * Set default templates for DTW features
   */
  setTemplates(templates: number[][]): void {
    this.templates = templates;
  }

  /**
   * Get current templates
   */
  getTemplates(): number[][] {
    return this.templates;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create EmbeddingBridge with default configuration
 *
 * @param agentdb - AgentDB instance
 * @param temporalCompare - TemporalCompare instance from Midstreamer
 * @param options - Optional configuration
 */
export function createEmbeddingBridge(
  agentdb: IAgentDB,
  temporalCompare: TemporalCompare,
  options?: {
    cacheSize?: number;
    defaultTemplates?: number[][];
    namespace?: string;
  }
): EmbeddingBridge {
  return new EmbeddingBridge(agentdb, temporalCompare, options);
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example 1: Basic embedding and storage
 *
 * ```typescript
 * import { TemporalCompare } from '../npm-wasm/pkg-node/midstream_wasm';
 * import { createEmbeddingBridge } from './embedding-bridge';
 *
 * // Initialize components
 * const agentdb = new AgentDB('./data/vectors');
 * const temporalCompare = new TemporalCompare(100);
 * const bridge = createEmbeddingBridge(agentdb, temporalCompare);
 *
 * // Create temporal sequence (e.g., CPU utilization)
 * const sequence = {
 *   data: [45, 47, 50, 52, 55, 58, 62, 68, 75, 82, 89, 92, 90, 85, 78],
 *   timestamp: new Date(),
 *   metadata: {
 *     source: 'cpu-monitor',
 *     domain: 'system-metrics',
 *     sampleRate: 1000,
 *     unit: 'percent',
 *     tags: ['performance', 'cpu']
 *   }
 * };
 *
 * // Generate embedding (hybrid method)
 * const embedding = await bridge.embedSequence(sequence, {
 *   method: 'hybrid',
 *   dimensions: 384,
 *   normalizeFeatures: true
 * });
 *
 * console.log(`Embedding generated in ${embedding.metadata.generationTime}ms`);
 * console.log(`Dimensions: ${embedding.embedding.length}`);
 * console.log(`Statistical features:`, embedding.features.statistical);
 *
 * // Store pattern
 * const patternId = await bridge.storePattern(embedding);
 * console.log(`Pattern stored: ${patternId}`);
 * ```
 */

/**
 * Example 2: Semantic search for similar patterns
 *
 * ```typescript
 * // Query sequence
 * const querySequence = [43, 45, 48, 50, 53, 56, 60, 65, 72, 80, 87, 90, 88, 83, 76];
 *
 * // Generate query embedding
 * const queryEmbedding = await bridge.embedSequence(querySequence, {
 *   method: 'hybrid',
 *   dimensions: 384
 * });
 *
 * // Search for similar patterns
 * const matches = await bridge.findSimilarPatterns(queryEmbedding, {
 *   limit: 10,
 *   threshold: 0.8,
 *   filters: {
 *     domain: 'system-metrics',
 *     tags: ['cpu'],
 *     minSimilarity: 0.7
 *   }
 * });
 *
 * console.log(`Found ${matches.length} similar patterns:`);
 * matches.forEach((match, i) => {
 *   console.log(`${i + 1}. Similarity: ${match.similarity.toFixed(3)}`);
 *   console.log(`   Distance: ${match.distance.toFixed(3)}`);
 *   console.log(`   Source: ${match.pattern.sequence.metadata?.source}`);
 *   console.log(`   Timestamp: ${match.pattern.sequence.timestamp}`);
 * });
 * ```
 */

/**
 * Example 3: Using DTW templates for domain-specific patterns
 *
 * ```typescript
 * // Define reference templates for common patterns
 * const templates = [
 *   [40, 50, 60, 70, 80, 90, 80, 70, 60, 50], // Spike pattern
 *   [50, 50, 50, 50, 50, 50, 50, 50, 50, 50], // Stable pattern
 *   [30, 35, 40, 45, 50, 55, 60, 65, 70, 75]  // Linear growth
 * ];
 *
 * bridge.setTemplates(templates);
 *
 * // Embed with DTW features
 * const embedding = await bridge.embedSequence(sequence, {
 *   method: 'dtw',
 *   dimensions: 384,
 *   templates
 * });
 *
 * console.log('DTW features:', embedding.features.dtw);
 * ```
 */

/**
 * Example 4: Time-range filtering and multi-tag search
 *
 * ```typescript
 * // Search patterns from last 24 hours with multiple tags
 * const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
 * const now = new Date();
 *
 * const recentMatches = await bridge.findSimilarPatterns(queryEmbedding, {
 *   limit: 20,
 *   threshold: 0.75,
 *   timeRange: [oneDayAgo, now],
 *   filters: {
 *     domain: 'system-metrics',
 *     tags: ['cpu', 'performance', 'production'],
 *     source: 'cpu-monitor',
 *     minSimilarity: 0.8
 *   }
 * });
 *
 * console.log(`Found ${recentMatches.length} recent patterns`);
 * ```
 */

/**
 * Example 5: Performance monitoring and caching
 *
 * ```typescript
 * // Generate embeddings with caching
 * const times: number[] = [];
 *
 * for (let i = 0; i < 100; i++) {
 *   const result = await bridge.embedSequence(sequence, {
 *     method: 'hybrid',
 *     useCaching: true
 *   });
 *   times.push(result.metadata.generationTime!);
 * }
 *
 * const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
 * console.log(`Average embedding time: ${avgTime.toFixed(2)}ms`);
 * console.log(`First call: ${times[0].toFixed(2)}ms`);
 * console.log(`Cached calls: ${times.slice(1, 10).map(t => t.toFixed(2))}ms`);
 *
 * // Check cache stats
 * const stats = bridge.getCacheStats();
 * console.log(`Cache size: ${stats.size} / ${stats.maxSize}`);
 *
 * // Clear cache if needed
 * bridge.clearCache();
 * ```
 */

/**
 * Example 6: Batch processing with different methods
 *
 * ```typescript
 * const sequences = [
 *   [10, 20, 30, 40, 50],
 *   [15, 25, 35, 45, 55],
 *   [12, 22, 32, 42, 52]
 * ];
 *
 * const methods: EmbeddingMethod[] = ['statistical', 'frequency', 'hybrid'];
 *
 * for (const method of methods) {
 *   console.log(`\nMethod: ${method}`);
 *
 *   for (const seq of sequences) {
 *     const embedding = await bridge.embedSequence(seq, {
 *       method,
 *       dimensions: 128
 *     });
 *
 *     console.log(`  Dimensions: ${embedding.embedding.length}`);
 *     console.log(`  Generation time: ${embedding.metadata.generationTime}ms`);
 *   }
 * }
 * ```
 */
