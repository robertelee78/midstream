/**
 * Threat Vector Store
 *
 * High-performance vector storage for threat patterns using AgentDB
 * Integrates with ReasoningBank for learned pattern storage and retrieval
 */

const { spawn } = require('child_process');
const { nanoid } = require('nanoid');

class ThreatVectorStore {
  constructor(options = {}) {
    this.dbPath = options.dbPath || './threat-vectors.db';
    this.dimension = options.dimension || 768;
    this.preset = options.preset || 'medium';
    this.similarityMetric = options.similarityMetric || 'cosine';
    this.cacheSize = options.cacheSize || 1000;

    // Cache for frequently accessed patterns
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;

    // Metrics
    this.metrics = {
      patternsStored: 0,
      queriesExecuted: 0,
      avgQueryTime: 0,
      cacheHitRate: 0
    };

    this.initialized = false;
  }

  /**
   * Initialize vector store
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.execAgentDB([
        'init',
        this.dbPath,
        '--dimension', this.dimension.toString(),
        '--preset', this.preset
      ]);

      this.initialized = true;
      console.log(`✅ ThreatVectorStore initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize ThreatVectorStore:', error.message);
      throw error;
    }
  }

  /**
   * Store threat pattern as vector
   *
   * @param {object} pattern - Threat pattern to store
   * @returns {Promise<string>} Pattern ID
   */
  async storePattern(pattern) {
    await this.initialize();

    const patternId = pattern.id || `pattern-${nanoid(8)}`;

    try {
      // Store pattern using AgentDB
      await this.execAgentDB([
        'store-pattern',
        '--type', pattern.type || 'threat',
        '--domain', pattern.domain || 'detection',
        '--pattern', JSON.stringify(pattern),
        '--confidence', (pattern.confidence || 0.8).toString()
      ]);

      // Update cache
      this.cache.set(patternId, pattern);
      if (this.cache.size > this.cacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      this.metrics.patternsStored++;

      console.log(`✅ Stored threat pattern: ${patternId}`);

      return patternId;
    } catch (error) {
      console.error('❌ Failed to store pattern:', error.message);
      throw error;
    }
  }

  /**
   * Query similar threat patterns using vector similarity
   *
   * @param {string} query - Query string or description
   * @param {object} options - Query options
   * @returns {Promise<Array>} Similar patterns
   */
  async querySimilarPatterns(query, options = {}) {
    await this.initialize();

    const startTime = Date.now();
    const k = options.k || 10;
    const minConfidence = options.minConfidence || 0.7;
    const domain = options.domain || null;

    try {
      // Execute vector search query
      const result = await this.execAgentDB([
        'query',
        '--query', query,
        domain ? '--domain' : '',
        domain || '',
        '--k', k.toString(),
        '--min-confidence', minConfidence.toString(),
        '--format', 'json',
        '--synthesize-context'
      ].filter(Boolean));

      const patterns = this.parseQueryResult(result);

      // Update metrics
      this.metrics.queriesExecuted++;
      const queryTime = Date.now() - startTime;
      this.updateAverageQueryTime(queryTime);

      console.log(`🔍 Found ${patterns.length} similar patterns (${queryTime}ms)`);

      return patterns;
    } catch (error) {
      console.error('❌ Failed to query patterns:', error.message);
      return [];
    }
  }

  /**
   * Store coordination pattern from ReasoningBank
   *
   * @param {object} coordinationPattern - Pattern from ReasoningBank distillation
   * @returns {Promise<string>} Pattern ID
   */
  async storeCoordinationPattern(coordinationPattern) {
    const pattern = {
      id: `coord-${nanoid(8)}`,
      type: 'coordination',
      domain: 'agent-coordination',
      cause: coordinationPattern.cause,
      effect: coordinationPattern.effect,
      uplift: coordinationPattern.uplift,
      confidence: coordinationPattern.confidence,
      timestamp: Date.now(),
      metadata: coordinationPattern.metadata || {}
    };

    return await this.storePattern(pattern);
  }

  /**
   * Store reflexion pattern from learning episodes
   *
   * @param {object} episode - Episode from ReflexionEngine
   * @param {object} reflection - Reflection analysis
   * @returns {Promise<string>} Pattern ID
   */
  async storeReflexionPattern(episode, reflection) {
    const pattern = {
      id: `reflex-${nanoid(8)}`,
      type: 'reflexion',
      domain: 'threat-detection',
      episodeId: episode.id,
      method: episode.detection.method,
      outcome: episode.outcome,
      analysis: reflection.analysis,
      critique: reflection.critique,
      insights: reflection.insights,
      recommendations: reflection.recommendations,
      confidence: this.calculatePatternConfidence(episode, reflection),
      timestamp: Date.now()
    };

    return await this.storePattern(pattern);
  }

  /**
   * Retrieve pattern by ID with caching
   *
   * @param {string} patternId - Pattern identifier
   * @returns {Promise<object>} Pattern data
   */
  async getPattern(patternId) {
    // Check cache first
    if (this.cache.has(patternId)) {
      this.cacheHits++;
      this.updateCacheHitRate();
      return this.cache.get(patternId);
    }

    this.cacheMisses++;
    this.updateCacheHitRate();

    // Query from database
    const patterns = await this.querySimilarPatterns(patternId, { k: 1 });
    return patterns.length > 0 ? patterns[0] : null;
  }

  /**
   * Get threat patterns by domain
   *
   * @param {string} domain - Pattern domain
   * @param {number} limit - Maximum patterns to return
   * @returns {Promise<Array>} Patterns in domain
   */
  async getPatternsByDomain(domain, limit = 20) {
    return await this.querySimilarPatterns('', {
      domain,
      k: limit,
      minConfidence: 0.5
    });
  }

  /**
   * Search threat patterns with filters
   *
   * @param {string} searchQuery - Search query
   * @param {object} filters - MongoDB-style filters
   * @returns {Promise<Array>} Matching patterns
   */
  async searchPatterns(searchQuery, filters = {}) {
    await this.initialize();

    try {
      const result = await this.execAgentDB([
        'query',
        '--query', searchQuery,
        '--k', '50',
        '--format', 'json',
        '--synthesize-context',
        '--filters', JSON.stringify(filters)
      ]);

      return this.parseQueryResult(result);
    } catch (error) {
      console.error('❌ Failed to search patterns:', error.message);
      return [];
    }
  }

  /**
   * Export patterns to file
   *
   * @param {string} outputFile - Output file path
   * @param {boolean} compress - Compress output
   * @returns {Promise<void>}
   */
  async exportPatterns(outputFile, compress = false) {
    await this.initialize();

    try {
      await this.execAgentDB([
        'export',
        this.dbPath,
        outputFile,
        compress ? '--compress' : ''
      ].filter(Boolean));

      console.log(`✅ Exported patterns to ${outputFile}`);
    } catch (error) {
      console.error('❌ Failed to export patterns:', error.message);
      throw error;
    }
  }

  /**
   * Import patterns from file
   *
   * @param {string} inputFile - Input file path
   * @param {boolean} decompress - Decompress input
   * @returns {Promise<void>}
   */
  async importPatterns(inputFile, decompress = false) {
    await this.initialize();

    try {
      await this.execAgentDB([
        'import',
        inputFile,
        this.dbPath,
        decompress ? '--decompress' : ''
      ].filter(Boolean));

      console.log(`✅ Imported patterns from ${inputFile}`);
    } catch (error) {
      console.error('❌ Failed to import patterns:', error.message);
      throw error;
    }
  }

  /**
   * Get database statistics
   *
   * @returns {Promise<object>} Database stats
   */
  async getStats() {
    await this.initialize();

    try {
      const statsOutput = await this.execAgentDB(['stats', this.dbPath]);
      return {
        ...this.metrics,
        cacheSize: this.cache.size,
        cacheHitRate: this.metrics.cacheHitRate.toFixed(3),
        dbStats: statsOutput
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error.message);
      return this.metrics;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.metrics.cacheHitRate = 0;
    console.log('🗑️  Cache cleared');
  }

  /**
   * Helper: Calculate pattern confidence from episode
   */
  calculatePatternConfidence(episode, reflection) {
    const outcomeScore = episode.outcome.f1Score || 0;
    const analysisScore = reflection.analysis.severity === 'critical' ? 0.5 :
                         reflection.analysis.severity === 'high' ? 0.7 : 0.9;

    return (outcomeScore * 0.6 + analysisScore * 0.4);
  }

  /**
   * Helper: Parse query result
   */
  parseQueryResult(result) {
    try {
      const data = typeof result === 'string' ? JSON.parse(result) : result;

      if (Array.isArray(data)) {
        return data;
      } else if (data.episodes) {
        return data.episodes;
      } else if (data.patterns) {
        return data.patterns;
      }

      return [];
    } catch (error) {
      console.warn('⚠️  Failed to parse query result:', error.message);
      return [];
    }
  }

  /**
   * Helper: Update average query time
   */
  updateAverageQueryTime(queryTime) {
    const total = this.metrics.queriesExecuted;
    this.metrics.avgQueryTime = (
      (this.metrics.avgQueryTime * (total - 1) + queryTime) / total
    );
  }

  /**
   * Helper: Update cache hit rate
   */
  updateCacheHitRate() {
    const totalAccess = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = totalAccess > 0 ? this.cacheHits / totalAccess : 0;
  }

  /**
   * Helper: Execute AgentDB CLI command
   */
  execAgentDB(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn('npx', ['agentdb', ...args], {
        env: { ...process.env, AGENTDB_PATH: this.dbPath }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `AgentDB command failed with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = ThreatVectorStore;
