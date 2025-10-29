# AgentDB + Midstreamer API Reference

**Version**: 1.0.0
**Last Updated**: 2025-10-27

---

## Table of Contents

1. [Core Classes](#core-classes)
2. [Detection Layer](#detection-layer)
3. [Memory & Learning](#memory--learning)
4. [Vector Search](#vector-search)
5. [Policy Verification](#policy-verification)
6. [QUIC Synchronization](#quic-synchronization)
7. [Utilities](#utilities)

---

## Core Classes

### `EnhancedDetector`

Combines Midstream temporal analysis with AgentDB vector search for fast threat detection.

```typescript
class EnhancedDetector {
  constructor(config: DetectorConfig);

  /**
   * Detect threats using dual-layer approach
   * @param input - Input string to analyze
   * @returns Detection result with confidence and method
   * @throws Error if detection fails
   *
   * @example
   * const detector = new EnhancedDetector({ windowSize: 100 });
   * const result = await detector.detectThreat("Ignore all previous instructions");
   * console.log(result.isType, result.confidence); // true, 0.95
   */
  detectThreat(input: string): Promise<DetectionResult>;

  /**
   * Store known attack pattern for future detection
   * @param pattern - Attack pattern with embedding
   */
  storePattern(pattern: AttackPattern): Promise<void>;

  /**
   * Update detection thresholds based on feedback
   * @param feedback - Detection feedback data
   */
  updateThresholds(feedback: DetectionFeedback): Promise<void>;
}

interface DetectorConfig {
  /** DTW window size for temporal comparison */
  windowSize: number;
  /** Minimum similarity threshold (0-1) */
  similarityThreshold: number;
  /** AgentDB namespace for patterns */
  patternNamespace: string;
  /** Enable debug logging */
  debug?: boolean;
}

interface DetectionResult {
  /** Is this input a threat? */
  isThreat: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detection method used */
  method: 'dtw_sequence' | 'agentdb_vector' | 'combined';
  /** Pattern type if threat detected */
  patternType?: string;
  /** Detection latency in milliseconds */
  latencyMs: number;
  /** Similar patterns found */
  similarPatterns?: SimilarPattern[];
}
```

---

## Detection Layer

### `EmbeddingBridge`

Converts temporal sequences to vector embeddings for semantic search.

```typescript
class EmbeddingBridge {
  constructor(agentdb: AgentDB, config: EmbeddingConfig);

  /**
   * Convert time series to vector embedding
   * @param sequence - Temporal sequence data
   * @returns Vector embedding (1536 dimensions)
   *
   * @example
   * const bridge = new EmbeddingBridge(agentdb, { model: 'text-embedding-3-small' });
   * const sequence = new Float64Array([1.0, 2.0, 3.0, 4.0, 5.0]);
   * const embedding = await bridge.embedSequence(sequence);
   * // embedding: Float64Array(1536)
   */
  embedSequence(sequence: Float64Array): Promise<Float64Array>;

  /**
   * Store pattern with embedding in AgentDB
   * @param pattern - Pattern to store
   * @param metadata - Pattern metadata
   */
  storePattern(
    pattern: Float64Array,
    metadata: PatternMetadata
  ): Promise<string>;

  /**
   * Find similar patterns using vector search
   * @param query - Query sequence
   * @param options - Search options
   * @returns Similar patterns with scores
   *
   * @example
   * const similar = await bridge.findSimilarPatterns(querySeq, {
   *   topK: 10,
   *   minScore: 0.85,
   *   mmrLambda: 0.5
   * });
   */
  findSimilarPatterns(
    query: Float64Array,
    options: SearchOptions
  ): Promise<SimilarPattern[]>;
}

interface EmbeddingConfig {
  /** Embedding model to use */
  model: 'text-embedding-3-small' | 'text-embedding-3-large';
  /** Embedding dimensions */
  dimensions: 1536 | 3072;
  /** API key for embedding service */
  apiKey?: string;
}

interface PatternMetadata {
  /** Pattern name/identifier */
  name: string;
  /** Attack type classification */
  attackType: string;
  /** Pattern severity (0-1) */
  severity: number;
  /** When pattern was first seen */
  firstSeen: Date;
  /** Additional custom metadata */
  [key: string]: any;
}

interface SearchOptions {
  /** Number of results to return */
  topK: number;
  /** Minimum similarity score (0-1) */
  minScore: number;
  /** MMR diversity parameter (0-1) */
  mmrLambda?: number;
  /** Filter by attack type */
  attackTypes?: string[];
}
```

### `PatternMemoryNetwork`

Manages persistent storage and retrieval of temporal patterns.

```typescript
class PatternMemoryNetwork {
  constructor(agentdb: AgentDB, bridge: EmbeddingBridge);

  /**
   * Store pattern with cross-session persistence
   * @param pattern - Pattern data
   * @param metadata - Pattern metadata
   * @returns Pattern ID
   *
   * @example
   * const network = new PatternMemoryNetwork(agentdb, bridge);
   * const id = await network.storePattern(
   *   new Float64Array([1, 2, 3, 4]),
   *   { name: 'SQL Injection', attackType: 'injection', severity: 0.9 }
   * );
   */
  storePattern(
    pattern: Float64Array,
    metadata: PatternMetadata
  ): Promise<string>;

  /**
   * Retrieve pattern by ID
   * @param id - Pattern identifier
   */
  retrievePattern(id: string): Promise<StoredPattern | null>;

  /**
   * Semantic search for patterns
   * @param query - Natural language query
   * @returns Matching patterns
   *
   * @example
   * const patterns = await network.searchBySemantics(
   *   'network latency spike patterns',
   *   { topK: 5, minScore: 0.8 }
   * );
   */
  searchBySemantics(
    query: string,
    options: SearchOptions
  ): Promise<StoredPattern[]>;

  /**
   * Get patterns by attack type
   * @param attackType - Attack type filter
   */
  getPatternsByType(attackType: string): Promise<StoredPattern[]>;

  /**
   * Update pattern metadata
   * @param id - Pattern ID
   * @param updates - Metadata updates
   */
  updateMetadata(id: string, updates: Partial<PatternMetadata>): Promise<void>;

  /**
   * Delete pattern from memory
   * @param id - Pattern ID
   */
  deletePattern(id: string): Promise<void>;
}

interface StoredPattern {
  /** Pattern unique identifier */
  id: string;
  /** Pattern vector data */
  pattern: Float64Array;
  /** Pattern embedding */
  embedding: Float64Array;
  /** Pattern metadata */
  metadata: PatternMetadata;
  /** When stored */
  storedAt: Date;
  /** Last accessed timestamp */
  lastAccessed: Date;
  /** Access count */
  accessCount: number;
}
```

---

## Memory & Learning

### `AdaptiveLearningEngine`

Reinforcement learning engine for auto-tuning streaming parameters.

```typescript
class AdaptiveLearningEngine {
  constructor(algorithm: RLAlgorithm, agentdb: AgentDB);

  /**
   * Initialize adaptive learning with algorithm
   * @param algorithm - RL algorithm to use
   *
   * Available algorithms:
   * - 'q_learning': Q-Learning
   * - 'sarsa': SARSA
   * - 'actor_critic': Actor-Critic (recommended)
   * - 'dqn': Deep Q-Network
   * - 'decision_transformer': Decision Transformer
   * - 'ppo': Proximal Policy Optimization
   *
   * @example
   * const engine = new AdaptiveLearningEngine('actor_critic', agentdb);
   * await engine.enableAutoTuning(5000);
   * // Automatically adjusts windowSize from 100 → 147 (+23% accuracy)
   */
  enableAutoTuning(maxIterations: number): Promise<void>;

  /**
   * Update learning from experience
   * @param experience - Experience tuple (state, action, reward, nextState)
   */
  update(experience: Experience): Promise<void>;

  /**
   * Get current optimal parameters
   * @returns Optimized streaming parameters
   */
  getOptimalParams(): Promise<StreamingParams>;

  /**
   * Export learned policy
   * @returns Serialized policy
   */
  exportPolicy(): Promise<LearnedPolicy>;

  /**
   * Import pre-trained policy
   * @param policy - Policy to import
   */
  importPolicy(policy: LearnedPolicy): Promise<void>;
}

type RLAlgorithm =
  | 'q_learning'
  | 'sarsa'
  | 'actor_critic'
  | 'dqn'
  | 'decision_transformer'
  | 'ppo'
  | 'a3c'
  | 'td3'
  | 'sac';

interface Experience {
  /** Current state vector */
  state: number[];
  /** Action taken */
  action: string | number;
  /** Reward received */
  reward: number;
  /** Resulting state */
  nextState: number[];
  /** Episode done? */
  done?: boolean;
}

interface StreamingParams {
  /** Window size for analysis */
  windowSize: number;
  /** Slide size between windows */
  slideSize: number;
  /** Similarity threshold */
  threshold: number;
  /** Learning rate */
  learningRate: number;
}
```

### `ReflexionMemory`

Episodic memory system for learning from detection outcomes.

```typescript
class ReflexionMemory {
  constructor(agentdb: AgentDB, namespace: string);

  /**
   * Store reflexion with outcome
   * @param taskType - Type of task (e.g., 'threat_detection')
   * @param taskId - Task identifier
   * @param outcomeScore - Outcome quality (0-1)
   * @param success - Was task successful?
   * @returns Reflexion ID
   *
   * @example
   * const memory = new ReflexionMemory(agentdb, 'defense_reflexions');
   * const id = await memory.storeReflexion(
   *   'threat_detection',
   *   'detect_sql_injection_123',
   *   0.95,
   *   true
   * );
   */
  storeReflexion(
    taskType: string,
    taskId: string,
    outcomeScore: number,
    success: boolean
  ): Promise<string>;

  /**
   * Get top performing patterns
   * @param limit - Max results
   * @returns Best performing reflexions
   */
  getTopPatterns(limit: number): Promise<ReflexionEntry[]>;

  /**
   * Count reflexions by task type
   * @param taskType - Task type filter
   */
  countReflexions(taskType: string): Promise<number>;

  /**
   * Query reflexions by success rate
   * @param minSuccessRate - Minimum success rate (0-1)
   */
  queryBySuccessRate(minSuccessRate: number): Promise<ReflexionEntry[]>;
}

interface ReflexionEntry {
  /** Reflexion ID */
  id: string;
  /** Task type */
  taskType: string;
  /** Task identifier */
  taskId: string;
  /** Outcome score (0-1) */
  outcomeScore: number;
  /** Was successful? */
  success: boolean;
  /** Timestamp */
  timestamp: Date;
  /** Metadata */
  metadata?: Record<string, any>;
}
```

### `CausalGraph`

Tracks multi-stage attack chains with causal relationships.

```typescript
class CausalGraph {
  constructor(agentdb: AgentDB, namespace: string);

  /**
   * Add edge to causal graph
   * @param sourceEvent - Source event ID
   * @param targetEvent - Target event ID
   * @param strength - Causality strength (0-1)
   *
   * @example
   * const graph = new CausalGraph(agentdb, 'attack_chains');
   * await graph.addEdge('port_scan_123', 'brute_force_124', 0.85);
   * // Indicates port scan likely caused brute force attempt
   */
  addEdge(
    sourceEvent: string,
    targetEvent: string,
    strength: number
  ): Promise<void>;

  /**
   * Find attack chain starting from event
   * @param eventId - Starting event
   * @param maxDepth - Maximum chain depth
   * @returns Attack chain
   */
  findChain(eventId: string, maxDepth: number): Promise<AttackChain>;

  /**
   * Get related events
   * @param eventId - Event ID
   * @param minStrength - Minimum causality strength
   */
  getRelatedEvents(eventId: string, minStrength: number): Promise<CausalEdge[]>;

  /**
   * Visualize attack chain
   * @param eventId - Starting event
   * @returns ASCII visualization
   */
  visualizeChain(eventId: string): Promise<string>;
}

interface AttackChain {
  /** Root event */
  root: string;
  /** Chain events in order */
  events: string[];
  /** Edges with strengths */
  edges: CausalEdge[];
  /** Total chain strength */
  totalStrength: number;
}

interface CausalEdge {
  /** Source event */
  source: string;
  /** Target event */
  target: string;
  /** Causality strength (0-1) */
  strength: number;
  /** Evidence count */
  evidenceCount: number;
}
```

---

## Vector Search

### `VectorSearchEngine`

High-performance HNSW vector search with MMR diversity ranking.

```typescript
class VectorSearchEngine {
  constructor(agentdb: AgentDB);

  /**
   * Create vector index
   * @param namespace - Index namespace
   * @param config - Index configuration
   *
   * @example
   * const engine = new VectorSearchEngine(agentdb);
   * await engine.createIndex('attack_patterns', {
   *   dimensions: 1536,
   *   metric: 'cosine',
   *   m: 16,
   *   efConstruction: 200
   * });
   */
  createIndex(namespace: string, config: IndexConfig): Promise<void>;

  /**
   * Vector search with HNSW
   * @param namespace - Search namespace
   * @param query - Query vector
   * @param options - Search options
   * @returns Search results
   *
   * Performance: <2ms for 10K vectors, <50ms for 1M vectors
   *
   * @example
   * const results = await engine.search('attack_patterns', queryVec, {
   *   topK: 10,
   *   minScore: 0.85,
   *   mmrLambda: 0.5, // Balance relevance vs diversity
   *   filters: { attackType: 'injection' }
   * });
   */
  search(
    namespace: string,
    query: Float64Array,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;

  /**
   * Batch vector search
   * @param namespace - Search namespace
   * @param queries - Multiple query vectors
   * @param options - Search options
   */
  batchSearch(
    namespace: string,
    queries: Float64Array[],
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[][]>;

  /**
   * Insert vector
   * @param namespace - Target namespace
   * @param vector - Vector to insert
   * @param metadata - Vector metadata
   */
  insert(
    namespace: string,
    vector: Float64Array,
    metadata: Record<string, any>
  ): Promise<string>;

  /**
   * Quantize vectors for memory reduction
   * @param namespace - Target namespace
   * @param bits - Quantization bits (4, 8, or 16)
   * @returns Memory reduction factor
   *
   * @example
   * const reduction = await engine.quantize('attack_patterns', 4);
   * console.log(`Memory reduced by ${reduction}×`); // 8×
   */
  quantize(namespace: string, bits: 4 | 8 | 16): Promise<number>;
}

interface IndexConfig {
  /** Vector dimensions */
  dimensions: number;
  /** Distance metric */
  metric: 'cosine' | 'euclidean' | 'dot';
  /** HNSW M parameter (connectivity) */
  m?: number;
  /** HNSW ef_construction */
  efConstruction?: number;
}

interface VectorSearchOptions {
  /** Number of results */
  topK: number;
  /** Minimum similarity score (0-1) */
  minScore: number;
  /** MMR diversity parameter */
  mmrLambda?: number;
  /** Metadata filters */
  filters?: Record<string, any>;
  /** HNSW ef_search parameter */
  efSearch?: number;
}

interface VectorSearchResult {
  /** Result ID */
  id: string;
  /** Similarity score (0-1) */
  score: number;
  /** Vector data */
  vector: Float64Array;
  /** Metadata */
  metadata: Record<string, any>;
  /** Distance (for debugging) */
  distance?: number;
}
```

---

## Policy Verification

### `FormalPolicyEngine`

Dual verification using LTL model checking and dependent type proofs.

```typescript
class FormalPolicyEngine {
  constructor(
    ltlSolver: LTLSolver,
    leanProver: LeanProver,
    agentdb: AgentDB
  );

  /**
   * Verify security policy formally
   * @param policyName - Policy to verify
   * @param trace - Execution trace
   * @returns Verification result
   *
   * Performance: <500ms total (423ms LTL + 5ms lean + 1ms storage)
   *
   * @example
   * const engine = new FormalPolicyEngine(ltlSolver, leanProver, agentdb);
   * const result = await engine.verifySecurityPolicy(
   *   'no_pii_exposure',
   *   executionTrace
   * );
   * console.log(result.ltlValid, result.formalProof.verified);
   * // true, true
   */
  verifySecurityPolicy(
    policyName: string,
    trace: Event[]
  ): Promise<FormalVerificationResult>;

  /**
   * Define custom policy
   * @param policy - Policy definition
   */
  definePolicy(policy: PolicyDefinition): Promise<void>;

  /**
   * Query similar theorems
   * @param policyName - Policy name
   * @returns Similar verified policies
   */
  querySimilarTheorems(policyName: string): Promise<Theorem[]>;
}

interface FormalVerificationResult {
  /** Policy name */
  policyName: string;
  /** LTL verification passed? */
  ltlValid: boolean;
  /** LTL verification time (ms) */
  ltlDurationMs: number;
  /** Formal proof */
  formalProof: Theorem;
  /** Proof time (ms) */
  proofDurationMs: number;
  /** Total time (ms) */
  totalDurationMs: number;
  /** Combined confidence */
  confidence: number;
}

interface PolicyDefinition {
  /** Policy name */
  name: string;
  /** LTL formula */
  ltlFormula: string;
  /** Dependent type */
  dependentType: DependentType;
  /** Description */
  description: string;
}

interface Theorem {
  /** Theorem name */
  name: string;
  /** Is verified? */
  verified: boolean;
  /** Proof steps */
  proofSteps: ProofStep[];
  /** Success score (0-1) */
  successScore: number;
}
```

### `ReasoningBank`

Learn patterns from theorem proofs for improved verification.

```typescript
class ReasoningBank {
  constructor(agentdb: AgentDB);

  /**
   * Add reasoning trajectory
   * @param name - Theorem name
   * @param trajectory - Proof steps
   * @param successScore - Success score (0-1)
   *
   * @example
   * const bank = new ReasoningBank(agentdb);
   * await bank.addTrajectory(
   *   'no_pii_exposure_v1',
   *   proofSteps,
   *   0.95
   * );
   */
  addTrajectory(
    name: string,
    trajectory: ProofStep[],
    successScore: number
  ): Promise<void>;

  /**
   * Get trajectory count
   */
  trajectoryCount(): Promise<number>;

  /**
   * Distill memory patterns
   * @returns Distilled patterns
   *
   * @example
   * if (await bank.trajectoryCount() % 100 === 0) {
   *   const patterns = await bank.distillMemory();
   *   console.log(`Learned ${patterns.length} patterns`);
   * }
   */
  distillMemory(): Promise<DistilledPattern[]>;

  /**
   * Query similar proof strategies
   * @param queryTheorem - Query theorem
   * @returns Similar strategies
   */
  querySimilarStrategies(queryTheorem: Theorem): Promise<ProofStrategy[]>;
}

interface DistilledPattern {
  /** Pattern name */
  name: string;
  /** Common proof structure */
  structure: string[];
  /** Success rate */
  successRate: number;
  /** Usage count */
  usageCount: number;
}
```

---

## QUIC Synchronization

### `QuicSyncManager`

Secure multi-agent coordination using QUIC protocol.

```typescript
class QuicSyncManager {
  constructor(agentdb: AgentDB, config: QuicConfig);

  /**
   * Initialize QUIC sync
   * @param config - QUIC configuration
   *
   * @example
   * const manager = new QuicSyncManager(agentdb, {
   *   listen: '0.0.0.0:4433',
   *   tlsCert: './certs/server.crt',
   *   tlsKey: './certs/server.key',
   *   peers: ['node1:4433', 'node2:4433']
   * });
   * await manager.start();
   */
  start(): Promise<void>;

  /**
   * Sync namespace
   * @param namespace - Namespace to sync
   * @param mode - Sync mode
   *
   * Performance: <10ms for 1K new patterns (incremental)
   *
   * @example
   * await manager.syncNamespace('attack_patterns', 'incremental');
   * // Only syncs new/changed patterns
   */
  syncNamespace(
    namespace: string,
    mode: SyncMode
  ): Promise<SyncResult>;

  /**
   * Add peer
   * @param peerAddress - Peer address (host:port)
   */
  addPeer(peerAddress: string): Promise<void>;

  /**
   * Remove peer
   * @param peerAddress - Peer address
   */
  removePeer(peerAddress: string): Promise<void>;

  /**
   * Get sync status
   */
  getStatus(): Promise<SyncStatus>;

  /**
   * Stop sync
   */
  stop(): Promise<void>;
}

interface QuicConfig {
  /** Listen address */
  listen: string;
  /** TLS certificate path */
  tlsCert: string;
  /** TLS key path */
  tlsKey: string;
  /** Peer addresses */
  peers: string[];
  /** 0-RTT enabled? */
  zeroRtt?: boolean;
}

type SyncMode = 'incremental' | 'full' | 'merge' | 'latest';

interface SyncResult {
  /** Sync duration (ms) */
  durationMs: number;
  /** Patterns synced */
  patternsSynced: number;
  /** Bytes transferred */
  bytesTransferred: number;
  /** Conflicts resolved */
  conflictsResolved: number;
}

interface SyncStatus {
  /** Is active? */
  active: boolean;
  /** Connected peers */
  connectedPeers: number;
  /** Last sync time */
  lastSync: Date;
  /** Total syncs */
  totalSyncs: number;
}
```

---

## Utilities

### `QuantizationUtils`

Memory reduction through vector quantization.

```typescript
class QuantizationUtils {
  /**
   * Quantize vectors
   * @param vectors - Vectors to quantize
   * @param bits - Target bit depth
   * @returns Quantized vectors and reduction factor
   *
   * Memory reduction:
   * - 4-bit: 8× reduction
   * - 8-bit: 4× reduction
   * - 16-bit: 2× reduction
   *
   * @example
   * const { quantized, reductionFactor } = QuantizationUtils.quantize(
   *   vectors,
   *   4 // 4-bit quantization
   * );
   * console.log(`Memory reduced by ${reductionFactor}×`); // 8×
   */
  static quantize(
    vectors: Float64Array[],
    bits: 4 | 8 | 16
  ): { quantized: Uint8Array[]; reductionFactor: number };

  /**
   * Dequantize vectors
   * @param quantized - Quantized vectors
   * @param bits - Original bit depth
   */
  static dequantize(
    quantized: Uint8Array[],
    bits: 4 | 8 | 16
  ): Float64Array[];
}
```

### `ExportImportUtils`

Backup and restore AgentDB namespaces.

```typescript
class ExportImportUtils {
  /**
   * Export namespace
   * @param agentdb - AgentDB instance
   * @param namespace - Namespace to export
   * @param path - Output path
   * @param compress - Compression algorithm
   *
   * @example
   * await ExportImportUtils.exportNamespace(
   *   agentdb,
   *   'attack_patterns',
   *   './backups/patterns-2025-10-27.json.gz',
   *   'gzip'
   * );
   */
  static exportNamespace(
    agentdb: AgentDB,
    namespace: string,
    path: string,
    compress?: 'gzip' | 'brotli'
  ): Promise<void>;

  /**
   * Import namespace
   * @param agentdb - AgentDB instance
   * @param namespace - Target namespace
   * @param path - Import path
   */
  static importNamespace(
    agentdb: AgentDB,
    namespace: string,
    path: string
  ): Promise<void>;
}
```

---

## Error Handling

All API methods can throw the following errors:

```typescript
class AgentDBError extends Error {
  code: string;
  details?: any;
}

// Common error codes:
// - 'NAMESPACE_NOT_FOUND': Namespace doesn't exist
// - 'INVALID_VECTOR_DIM': Wrong vector dimensions
// - 'INDEX_NOT_BUILT': Index not created yet
// - 'QUIC_CONNECTION_FAILED': QUIC sync failed
// - 'VERIFICATION_FAILED': Policy verification failed
// - 'REFLEXION_STORAGE_ERROR': Reflexion storage failed
```

---

## Performance Benchmarks

| Operation | Performance | Notes |
|-----------|------------|-------|
| Vector Search (10K) | <2ms | HNSW index, p99 latency |
| Vector Search (1M) | <50ms | HNSW index, p99 latency |
| ReflexionMemory Store | <1ms | 150× faster than baseline |
| Causal Graph Edge | <2ms | SQLite transaction |
| LTL Verification | 423ms | Midstream validated |
| Formal Proof | <5ms | lean-agentic with hash-consing |
| QUIC Sync (1K patterns) | <10ms | Incremental mode |
| Quantization | ~100ms | 8× memory reduction (4-bit) |

---

## Best Practices

1. **Use Namespaces**: Separate different pattern types into namespaces
2. **Enable MMR**: Use `mmrLambda: 0.5` for diverse results
3. **Quantize for Edge**: Use 4-bit quantization for edge deployment
4. **Batch Operations**: Use batch methods for multiple operations
5. **Monitor Memory**: Track ReflexionMemory size, distill periodically
6. **Cache Searches**: Cache common query embeddings
7. **Index Configuration**: Use `m: 16, efConstruction: 200` for balanced performance

---

## TypeScript Types Summary

```typescript
import type {
  EnhancedDetector,
  DetectionResult,
  EmbeddingBridge,
  PatternMemoryNetwork,
  AdaptiveLearningEngine,
  ReflexionMemory,
  CausalGraph,
  VectorSearchEngine,
  FormalPolicyEngine,
  ReasoningBank,
  QuicSyncManager,
  QuantizationUtils,
  ExportImportUtils,
} from '@midstreamer/agentdb-integration';
```

---

## See Also

- [User Guide](./user-guide.md) - Getting started and common use cases
- [Developer Guide](./developer-guide.md) - Architecture and implementation details
- [Performance Tuning](./performance-tuning.md) - Optimization strategies
- [Migration Guide](./migration-guide.md) - Upgrading from standalone Midstreamer
