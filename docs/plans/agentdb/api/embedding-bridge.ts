/**
 * Semantic Temporal Bridge
 * Converts temporal sequences to semantic vector embeddings
 *
 * Integration: Midstreamer → AgentDB
 */

import { DTWEngine } from '@midstreamer/core';
import { AgentDB } from 'agentdb';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface TemporalSequence {
  data: number[];
  timestamp: Date;
  metadata?: {
    source?: string;
    sampleRate?: number;
    unit?: string;
  };
}

export interface TemporalEmbedding {
  embedding: number[]; // 384-dimensional vector
  sequence: TemporalSequence;
  features: TemporalFeatures;
  metadata: {
    windowSize: number;
    dtwDistance?: number;
    method: EmbeddingMethod;
    version: string;
  };
}

export interface TemporalFeatures {
  statistical: StatisticalFeatures;
  frequency: FrequencyFeatures;
  dtw: DTWFeatures;
  wavelet?: WaveletFeatures;
}

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

export interface FrequencyFeatures {
  fftCoefficients: number[]; // Top 32 coefficients
  dominantFrequencies: number[];
  spectralEntropy: number;
  spectralCentroid: number;
  spectralRolloff: number;
}

export interface DTWFeatures {
  distanceToTemplates: number[];
  warpingPathLength: number;
  alignmentScore: number;
  templateSimilarities: number[];
}

export interface WaveletFeatures {
  coefficients: number[];
  energyDistribution: number[];
  scales: number[];
}

export type EmbeddingMethod = 'dtw' | 'statistical' | 'hybrid' | 'wavelet' | 'learned';

export interface EmbeddingOptions {
  method?: EmbeddingMethod;
  dimensions?: number;
  includeWavelet?: boolean;
  normalizeFeatures?: boolean;
  templates?: number[][]; // Reference templates for DTW
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  timeRange?: [Date, Date];
  filters?: {
    domain?: string;
    tags?: string[];
    minSimilarity?: number;
  };
}

export interface PatternMatch {
  id: string;
  similarity: number;
  pattern: TemporalEmbedding;
  distance: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Semantic Temporal Bridge Implementation
// ============================================================================

export class SemanticTemporalBridge {
  private agentdb: AgentDB;
  private dtwEngine: DTWEngine;
  private embeddingCache: Map<string, number[]>;
  private templates: number[][];

  constructor(
    agentdb: AgentDB,
    dtwEngine: DTWEngine,
    options?: {
      cacheSize?: number;
      defaultTemplates?: number[][];
    }
  ) {
    this.agentdb = agentdb;
    this.dtwEngine = dtwEngine;
    this.embeddingCache = new Map();
    this.templates = options?.defaultTemplates || [];

    // LRU cache for embeddings
    if (options?.cacheSize) {
      this.setupLRUCache(options.cacheSize);
    }
  }

  // ==========================================================================
  // Core Embedding Methods
  // ==========================================================================

  /**
   * Convert temporal sequence to vector embedding
   */
  async embedSequence(
    sequence: number[] | TemporalSequence,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const {
      method = 'hybrid',
      dimensions = 384,
      includeWavelet = false,
      normalizeFeatures = true,
      templates = this.templates
    } = options;

    // Normalize input
    const seq = Array.isArray(sequence)
      ? { data: sequence, timestamp: new Date() }
      : sequence;

    // Check cache
    const cacheKey = this.getCacheKey(seq.data, method);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    // Extract features based on method
    let features: number[];

    switch (method) {
      case 'statistical':
        features = this.extractStatisticalFeatures(seq.data);
        break;

      case 'dtw':
        features = await this.extractDTWFeatures(seq.data, templates);
        break;

      case 'wavelet':
        features = this.extractWaveletFeatures(seq.data);
        break;

      case 'hybrid':
        const statFeatures = this.extractStatisticalFeatures(seq.data);
        const freqFeatures = this.extractFrequencyFeatures(seq.data);
        const dtwFeatures = await this.extractDTWFeatures(seq.data, templates);
        features = [...statFeatures, ...freqFeatures, ...dtwFeatures];

        if (includeWavelet) {
          const waveletFeatures = this.extractWaveletFeatures(seq.data);
          features.push(...waveletFeatures);
        }
        break;

      case 'learned':
        // TODO: Implement learned embedding (neural network)
        throw new Error('Learned embeddings not yet implemented');

      default:
        throw new Error(`Unknown embedding method: ${method}`);
    }

    // Normalize and resize to target dimensions
    if (normalizeFeatures) {
      features = this.l2Normalize(features);
    }

    const embedding = this.resizeEmbedding(features, dimensions);

    // Cache result
    this.embeddingCache.set(cacheKey, embedding);

    return embedding;
  }

  /**
   * Store temporal pattern with metadata
   */
  async storePattern(
    embedding: number[],
    metadata: Omit<TemporalEmbedding, 'embedding'>,
    namespace: string = 'temporal_patterns'
  ): Promise<string> {
    const patternId = this.generatePatternId(metadata);

    await this.agentdb.add(namespace, {
      id: patternId,
      vector: embedding,
      metadata: {
        timestamp: metadata.sequence.timestamp.toISOString(),
        windowSize: metadata.metadata.windowSize,
        method: metadata.metadata.method,
        version: metadata.metadata.version,
        features: metadata.features,
        sequenceMetadata: metadata.sequence.metadata,
      }
    });

    return patternId;
  }

  /**
   * Find similar temporal patterns
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

    // Extract embedding if TemporalEmbedding provided
    const queryEmbedding = Array.isArray(query)
      ? query
      : query.embedding;

    // Build search filters
    const searchFilters: any = {};

    if (timeRange) {
      searchFilters.timestamp = {
        $gte: timeRange[0].toISOString(),
        $lte: timeRange[1].toISOString()
      };
    }

    if (filters?.domain) {
      searchFilters['sequenceMetadata.source'] = filters.domain;
    }

    if (filters?.tags) {
      searchFilters.tags = { $in: filters.tags };
    }

    // Perform vector search
    const results = await this.agentdb.search('temporal_patterns', {
      vector: queryEmbedding,
      limit,
      filter: Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
      minSimilarity: filters?.minSimilarity || threshold
    });

    // Transform results
    return results.map((result: any) => ({
      id: result.id,
      similarity: result.similarity,
      distance: 1 - result.similarity, // Cosine distance
      pattern: {
        embedding: result.vector,
        sequence: {
          data: [], // Not stored, would need separate storage
          timestamp: new Date(result.metadata.timestamp),
          metadata: result.metadata.sequenceMetadata
        },
        features: result.metadata.features,
        metadata: {
          windowSize: result.metadata.windowSize,
          method: result.metadata.method,
          version: result.metadata.version
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
   */
  private extractStatisticalFeatures(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;

    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    const skewness = data.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0) / n;
    const kurtosis = data.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) / n;

    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;
    const median = sorted[Math.floor(n / 2)];
    const q25 = sorted[Math.floor(n * 0.25)];
    const q75 = sorted[Math.floor(n * 0.75)];
    const iqr = q75 - q25;

    return [
      mean, std, variance, skewness, kurtosis,
      min, max, range, median, q25, q75, iqr
    ];
  }

  /**
   * Extract frequency domain features via FFT (32 dimensions)
   */
  private extractFrequencyFeatures(data: number[]): number[] {
    // Simplified FFT (in production, use a proper FFT library)
    const n = data.length;
    const fftSize = Math.pow(2, Math.ceil(Math.log2(n)));

    // Pad to power of 2
    const padded = [...data, ...new Array(fftSize - n).fill(0)];

    // Compute FFT (placeholder - use actual FFT library)
    const fft = this.simpleDFT(padded);
    const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));

    // Take top 32 coefficients (normalized)
    const topCoefficients = magnitudes.slice(0, 32);
    const maxMagnitude = Math.max(...topCoefficients);
    const normalized = topCoefficients.map(m => m / maxMagnitude);

    // Additional spectral features
    const spectralCentroid = this.computeSpectralCentroid(magnitudes);
    const spectralEntropy = this.computeSpectralEntropy(magnitudes);
    const spectralRolloff = this.computeSpectralRolloff(magnitudes);

    return [
      ...normalized,
      spectralCentroid,
      spectralEntropy,
      spectralRolloff
    ];
  }

  /**
   * Extract DTW-based features (variable dimensions based on templates)
   */
  private async extractDTWFeatures(
    data: number[],
    templates: number[][]
  ): Promise<number[]> {
    if (templates.length === 0) {
      // If no templates, use self-similarity features
      return this.extractSelfSimilarityFeatures(data);
    }

    const features: number[] = [];

    for (const template of templates) {
      const result = await this.dtwEngine.compute(data, template);

      // DTW distance (normalized by sequence length)
      const normalizedDistance = result.distance / Math.max(data.length, template.length);
      features.push(normalizedDistance);

      // Warping path length (normalized)
      const warpingPathLength = result.path.length / Math.max(data.length, template.length);
      features.push(warpingPathLength);

      // Alignment score (1 - normalized distance)
      const alignmentScore = 1 / (1 + normalizedDistance);
      features.push(alignmentScore);
    }

    return features;
  }

  /**
   * Extract wavelet features (64 dimensions)
   */
  private extractWaveletFeatures(data: number[]): number[] {
    // Simplified wavelet transform (in production, use proper wavelet library)
    const scales = [1, 2, 4, 8, 16, 32];
    const features: number[] = [];

    for (const scale of scales) {
      const waveletCoeffs = this.simpleWaveletTransform(data, scale);

      // Take representative coefficients
      const subsample = this.subsampleArray(waveletCoeffs, 10);
      features.push(...subsample);

      // Energy at this scale
      const energy = waveletCoeffs.reduce((a, b) => a + b * b, 0);
      features.push(energy);
    }

    return features;
  }

  /**
   * Self-similarity features (when no templates available)
   */
  private extractSelfSimilarityFeatures(data: number[]): number[] {
    const features: number[] = [];

    // Autocorrelation at different lags
    const lags = [1, 5, 10, 20, 50];
    for (const lag of lags) {
      const autocorr = this.autocorrelation(data, lag);
      features.push(autocorr);
    }

    // Trend strength
    const trend = this.computeTrend(data);
    features.push(trend);

    // Seasonality strength
    const seasonality = this.computeSeasonality(data);
    features.push(seasonality);

    return features;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * L2 normalization
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
      // Dimensionality reduction via PCA or truncation
      return features.slice(0, targetDim);
    } else {
      // Pad with zeros
      return [...features, ...new Array(targetDim - features.length).fill(0)];
    }
  }

  /**
   * Generate pattern ID
   */
  private generatePatternId(metadata: Omit<TemporalEmbedding, 'embedding'>): string {
    const timestamp = metadata.sequence.timestamp.getTime();
    const hash = this.hashSequence(metadata.sequence.data);
    return `pattern_${timestamp}_${hash}`;
  }

  /**
   * Hash sequence for cache key
   */
  private hashSequence(data: number[]): string {
    // Simple hash (in production, use proper hash function)
    const str = data.slice(0, 10).map(n => n.toFixed(2)).join(',');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache key
   */
  private getCacheKey(data: number[], method: EmbeddingMethod): string {
    return `${method}_${this.hashSequence(data)}`;
  }

  /**
   * Setup LRU cache
   */
  private setupLRUCache(maxSize: number): void {
    // Simple LRU implementation
    const originalSet = this.embeddingCache.set.bind(this.embeddingCache);
    this.embeddingCache.set = (key: string, value: number[]) => {
      if (this.embeddingCache.size >= maxSize) {
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }
      return originalSet(key, value);
    };
  }

  // ==========================================================================
  // Signal Processing Helpers (Simplified Implementations)
  // ==========================================================================

  /**
   * Simplified DFT (use FFT library in production)
   */
  private simpleDFT(data: number[]): Array<{real: number, imag: number}> {
    const n = data.length;
    const result: Array<{real: number, imag: number}> = [];

    for (let k = 0; k < n; k++) {
      let real = 0;
      let imag = 0;

      for (let t = 0; t < n; t++) {
        const angle = 2 * Math.PI * k * t / n;
        real += data[t] * Math.cos(angle);
        imag -= data[t] * Math.sin(angle);
      }

      result.push({ real, imag });
    }

    return result;
  }

  /**
   * Spectral centroid
   */
  private computeSpectralCentroid(magnitudes: number[]): number {
    const sum = magnitudes.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const weightedSum = magnitudes.reduce((a, b, i) => a + b * i, 0);
    return weightedSum / sum;
  }

  /**
   * Spectral entropy
   */
  private computeSpectralEntropy(magnitudes: number[]): number {
    const sum = magnitudes.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;

    const probs = magnitudes.map(m => m / sum);
    return -probs.reduce((a, p) => a + (p > 0 ? p * Math.log2(p) : 0), 0);
  }

  /**
   * Spectral rolloff (95% energy)
   */
  private computeSpectralRolloff(magnitudes: number[]): number {
    const totalEnergy = magnitudes.reduce((a, b) => a + b * b, 0);
    const threshold = 0.95 * totalEnergy;

    let cumulativeEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i] * magnitudes[i];
      if (cumulativeEnergy >= threshold) {
        return i / magnitudes.length;
      }
    }

    return 1.0;
  }

  /**
   * Simple wavelet transform (Haar wavelet)
   */
  private simpleWaveletTransform(data: number[], scale: number): number[] {
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
   * Subsample array
   */
  private subsampleArray(arr: number[], targetSize: number): number[] {
    if (arr.length <= targetSize) return arr;

    const step = arr.length / targetSize;
    const result: number[] = [];

    for (let i = 0; i < targetSize; i++) {
      const idx = Math.floor(i * step);
      result.push(arr[idx]);
    }

    return result;
  }

  /**
   * Autocorrelation at given lag
   */
  private autocorrelation(data: number[], lag: number): number {
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n - lag; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }

    for (let i = 0; i < n; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Compute trend strength (linear regression slope)
   */
  private computeTrend(data: number[]): number {
    const n = data.length;
    const x = Array.from({length: n}, (_, i) => i);
    const meanX = (n - 1) / 2;
    const meanY = data.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (data[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Compute seasonality strength (simplified)
   */
  private computeSeasonality(data: number[]): number {
    // Check for periodic patterns via autocorrelation
    const maxLag = Math.min(100, Math.floor(data.length / 2));
    let maxAutocorr = 0;

    for (let lag = 2; lag < maxLag; lag++) {
      const autocorr = Math.abs(this.autocorrelation(data, lag));
      if (autocorr > maxAutocorr) {
        maxAutocorr = autocorr;
      }
    }

    return maxAutocorr;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create SemanticTemporalBridge with default configuration
 */
export async function createSemanticTemporalBridge(
  agentdbPath: string,
  options?: {
    cacheSize?: number;
    defaultTemplates?: number[][];
  }
): Promise<SemanticTemporalBridge> {
  const agentdb = new AgentDB(agentdbPath);
  await agentdb.initialize();

  const dtwEngine = new DTWEngine({
    windowSize: 100,
    useOptimizedPath: true
  });

  return new SemanticTemporalBridge(agentdb, dtwEngine, options);
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Embed and store temporal pattern
 */
export async function exampleEmbedAndStore() {
  const bridge = await createSemanticTemporalBridge('./agentdb-data');

  // Temporal sequence (e.g., CPU utilization over time)
  const sequence = {
    data: [45, 47, 50, 52, 55, 58, 62, 68, 75, 82, 89, 92, 90, 85, 78],
    timestamp: new Date(),
    metadata: {
      source: 'cpu-utilization',
      sampleRate: 1000,
      unit: 'percent'
    }
  };

  // Generate embedding
  const embedding = await bridge.embedSequence(sequence, {
    method: 'hybrid',
    dimensions: 384,
    normalizeFeatures: true
  });

  // Store pattern
  const patternId = await bridge.storePattern(embedding, {
    sequence,
    features: {} as any, // Extracted internally
    metadata: {
      windowSize: sequence.data.length,
      method: 'hybrid',
      version: '1.0.0'
    }
  });

  console.log(`Pattern stored with ID: ${patternId}`);

  // Find similar patterns
  const similar = await bridge.findSimilarPatterns(embedding, {
    limit: 5,
    threshold: 0.8
  });

  console.log(`Found ${similar.length} similar patterns`);
  similar.forEach((match, i) => {
    console.log(`  ${i + 1}. Similarity: ${match.similarity.toFixed(3)}`);
  });
}
