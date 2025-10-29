# AgentDB + Midstreamer Performance Tuning Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-27

---

## Table of Contents

1. [Performance Overview](#performance-overview)
2. [RL Tuning Tips](#rl-tuning-tips)
3. [Memory Optimization](#memory-optimization)
4. [Throughput Maximization](#throughput-maximization)
5. [Query Optimization](#query-optimization)
6. [Profiling and Monitoring](#profiling-and-monitoring)
7. [Production Best Practices](#production-best-practices)

---

## Performance Overview

### Baseline Performance (Validated)

| Component | Latency | Throughput | Memory |
|-----------|---------|-----------|--------|
| **Midstream DTW** | 7.8ms | 128 req/s | 50MB |
| **AgentDB Vector Search** | <2ms | 500 req/s | 71MB (10K patterns) |
| **ReflexionMemory** | <1ms | 1000 ops/s | 20MB |
| **Formal Proof** | <5ms | 200 proofs/s | 30MB |
| **Combined Fast Path** | <10ms | 100 req/s | 150MB |

### Performance Targets

- **Fast Path**: <10ms (95th percentile)
- **Deep Path**: <100ms (95th percentile)
- **Verification**: <500ms (95th percentile)
- **Memory Usage**: <500MB (typical workload)
- **Throughput**: >100 req/s (sustained)

---

## RL Tuning Tips

### 1. Algorithm Selection

Choose the right RL algorithm for your use case:

```javascript
const { AdaptiveLearningEngine } = require('midstreamer/agentdb');

// Recommendation matrix:
// - Simple problems: Q-Learning or SARSA
// - Complex problems: Actor-Critic or PPO
// - Sequential decisions: Decision Transformer
// - High-dimensional: DQN or A3C

// For detection parameter tuning (recommended):
const learner = new AdaptiveLearningEngine('actor_critic', agentdb);
```

**Algorithm Comparison**:

| Algorithm | Training Speed | Sample Efficiency | Best For |
|-----------|---------------|------------------|----------|
| Q-Learning | Fast | Low | Simple discrete actions |
| SARSA | Fast | Low | On-policy learning |
| Actor-Critic | Medium | High | Continuous parameters ⭐ |
| DQN | Medium | Medium | High-dimensional states |
| Decision Transformer | Slow | Very High | Sequence modeling |
| PPO | Medium | High | Stable training |

### 2. Hyperparameter Tuning

**Learning Rate**:

```javascript
// Too high: Unstable learning
// Too low: Slow convergence
// Sweet spot: 0.0001 - 0.001

const learner = new AdaptiveLearningEngine('actor_critic', agentdb);
learner.setLearningRate(0.001); // Good starting point

// Adaptive learning rate schedule
learner.setLearningRateSchedule({
  type: 'exponential_decay',
  initial: 0.001,
  decay: 0.95,
  decaySteps: 1000
});
```

**Discount Factor (γ)**:

```javascript
// Controls future reward importance
// γ=0: Only immediate rewards
// γ=1: All future rewards equally
// γ=0.95-0.99: Typical range

learner.setDiscount(0.95); // Recommended
```

**Exploration vs Exploitation (ε-greedy)**:

```javascript
// Epsilon-greedy exploration
learner.setEpsilon({
  initial: 1.0,    // 100% exploration initially
  final: 0.01,     // 1% exploration finally
  decay: 0.995     // Decay rate per episode
});

// Or use softmax exploration
learner.setExplorationStrategy('softmax', {
  temperature: 1.0,
  temperatureDecay: 0.99
});
```

### 3. Training Strategy

**Warm-up Phase**:

```javascript
// Start with high exploration
await learner.warmup({
  episodes: 1000,
  explorationRate: 1.0
});

// Then enable auto-tuning
await learner.enableAutoTuning(5000);
```

**Experience Replay**:

```javascript
// Store experiences for better sample efficiency
learner.enableExperienceReplay({
  bufferSize: 10000,
  batchSize: 64,
  prioritized: true, // Prioritize important experiences
  alpha: 0.6         // Prioritization exponent
});
```

**Target Network (for DQN)**:

```javascript
// Stabilize learning with target network
learner.enableTargetNetwork({
  updateFrequency: 100,  // Update every 100 steps
  tau: 0.001             // Soft update coefficient
});
```

### 4. Reward Shaping

**Composite Reward Function**:

```javascript
function calculateReward(detection) {
  // Components:
  // 1. Accuracy (0-1)
  const accuracy = detection.truePositives / detection.totalPositives;

  // 2. False positive penalty (0-1)
  const fpPenalty = detection.falsePositives / detection.totalNegatives;

  // 3. Latency penalty (0-1)
  const latencyPenalty = Math.min(detection.latencyMs / 100, 1.0);

  // Weighted combination
  return (
    0.5 * accuracy +
    0.3 * (1 - fpPenalty) +
    0.2 * (1 - latencyPenalty)
  );
}

learner.setRewardFunction(calculateReward);
```

**Progressive Rewards**:

```javascript
// Early training: Focus on accuracy
if (learner.episodeCount < 1000) {
  reward = accuracy;
}
// Mid training: Add false positive penalty
else if (learner.episodeCount < 3000) {
  reward = 0.7 * accuracy + 0.3 * (1 - fpPenalty);
}
// Late training: Full composite reward
else {
  reward = 0.5 * accuracy + 0.3 * (1 - fpPenalty) + 0.2 * (1 - latencyPenalty);
}
```

### 5. Monitoring Learning Progress

```javascript
// Track learning metrics
learner.on('episode_complete', (metrics) => {
  console.log(`Episode ${metrics.episode}:`);
  console.log(`  Reward: ${metrics.reward.toFixed(3)}`);
  console.log(`  Epsilon: ${metrics.epsilon.toFixed(3)}`);
  console.log(`  Loss: ${metrics.loss.toFixed(3)}`);

  // Detect convergence
  if (metrics.rewardStd < 0.01) {
    console.log('✅ Learning converged!');
  }
});

// Visualize learning curve
const history = await learner.getTrainingHistory();
plotLearningCurve(history);
```

---

## Memory Optimization

### 1. Quantization

**4-bit Quantization** (8× reduction):

```javascript
const { VectorSearchEngine } = require('midstreamer/agentdb');

const engine = new VectorSearchEngine(agentdb);

// Before: 1536 dims × 4 bytes × 10K = 61MB
// After: 1536 dims × 0.5 bytes × 10K = 7.6MB (8× smaller)

await engine.quantize('attack_patterns', 4);

// Performance: ~98% accuracy, ~5% slower search
```

**8-bit Quantization** (4× reduction):

```javascript
// Better accuracy vs 4-bit, still good compression
await engine.quantize('attack_patterns', 8);

// Performance: ~99.5% accuracy, ~2% slower search
```

**Quantization Trade-offs**:

| Bits | Reduction | Accuracy | Search Speed | Recommended For |
|------|-----------|----------|--------------|----------------|
| 4 | 8× | 98% | -5% | Edge devices, large datasets |
| 8 | 4× | 99.5% | -2% | Production (balanced) ⭐ |
| 16 | 2× | 99.9% | -1% | High accuracy requirements |
| 32 | 1× | 100% | 0% | Development/baseline |

### 2. SQLite Optimization

**Write-Ahead Logging (WAL)**:

```javascript
const agentdb = new AgentDB('./defense.db', {
  journalMode: 'WAL', // Enable WAL for better concurrency
  synchronous: 'NORMAL', // Balance safety and performance
  cacheSize: 10000, // 10,000 pages (~40MB cache)
  mmapSize: 268435456 // 256MB memory-mapped I/O
});

// Performance gains:
// - 2-3× faster writes
// - Concurrent readers
// - Better crash recovery
```

**Cache Configuration**:

```javascript
// Tune cache size based on working set
const workingSetMB = 100; // Estimate
const pageSize = 4096; // SQLite default
const cachePages = (workingSetMB * 1024 * 1024) / pageSize;

const agentdb = new AgentDB('./defense.db', {
  cacheSize: cachePages // ~25,000 for 100MB
});

// Monitor cache hit rate
const stats = await agentdb.getStats();
console.log(`Cache hit rate: ${stats.cacheHitRate * 100}%`);
// Target: >95% hit rate
```

### 3. Memory-Mapped I/O

**Enable mmap for large databases**:

```javascript
// Recommendation: Set to 1/2 of available RAM
const availableRAM = 4 * 1024 * 1024 * 1024; // 4GB
const mmapSize = availableRAM / 2; // 2GB

const agentdb = new AgentDB('./defense.db', {
  mmapSize: mmapSize
});

// Benefits:
// - Faster reads (OS page cache)
// - Lower memory pressure
// - Better for read-heavy workloads
```

### 4. Pattern Pruning

**Remove old/unused patterns**:

```javascript
const { PatternMemoryNetwork } = require('midstreamer/agentdb');

const network = new PatternMemoryNetwork(agentdb, bridge);

// Remove patterns not accessed in 90 days
await network.prunePatterns({
  lastAccessedBefore: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  minAccessCount: 1
});

// Remove low-severity patterns
await network.prunePatterns({
  severityBelow: 0.5
});
```

### 5. Embedding Cache

**Cache embeddings to avoid regeneration**:

```javascript
const { EmbeddingBridge } = require('midstreamer/agentdb');

const bridge = new EmbeddingBridge(agentdb, {
  apiKey: process.env.OPENAI_API_KEY,
  enableCache: true,
  cacheSize: 1000, // Cache 1000 most recent embeddings
  cacheTTL: 3600 // 1 hour TTL
});

// Performance: 50ms → <1ms for cached embeddings
```

---

## Throughput Maximization

### 1. Batch Operations

**Batch Vector Search**:

```javascript
// Single query (slow)
const results1 = await engine.search('patterns', query1);
const results2 = await engine.search('patterns', query2);
const results3 = await engine.search('patterns', query3);
// Total: ~6ms (3 × 2ms)

// Batch query (fast)
const batchResults = await engine.batchSearch('patterns', [query1, query2, query3]);
// Total: ~3ms (amortized overhead)

// Speedup: 2×
```

**Batch Inserts**:

```javascript
// Single insert (slow)
for (const pattern of patterns) {
  await agentdb.insert({ namespace: 'patterns', vector: pattern.vector });
}
// Total: 100 patterns × 2ms = 200ms

// Batch insert (fast)
await agentdb.batchInsert({
  namespace: 'patterns',
  vectors: patterns.map(p => p.vector),
  metadata: patterns.map(p => p.metadata)
});
// Total: 100 patterns in ~50ms

// Speedup: 4×
```

### 2. Connection Pooling

**Multiple concurrent operations**:

```javascript
const { AgentDBPool } = require('agentdb');

const pool = new AgentDBPool({
  minConnections: 2,
  maxConnections: 10,
  database: './defense.db'
});

// Concurrent operations
await Promise.all([
  pool.execute(db => db.vectorSearch(query1)),
  pool.execute(db => db.vectorSearch(query2)),
  pool.execute(db => db.vectorSearch(query3)),
  pool.execute(db => db.insert(pattern1))
]);

// Throughput: 100 req/s → 400 req/s (4× improvement)
```

### 3. Async/Await Optimization

**Avoid sequential awaits**:

```javascript
// Slow (sequential)
const embedding = await bridge.generateEmbedding(input);
const searchResults = await engine.search('patterns', embedding);
const reflexion = await reflexionMemory.storeReflexion(/* ... */);
// Total: 5ms + 2ms + 1ms = 8ms

// Fast (parallel)
const [embedding, searchResults] = await Promise.all([
  bridge.generateEmbedding(input),
  engine.search('patterns', cachedEmbedding)
]);
const reflexion = await reflexionMemory.storeReflexion(/* ... */);
// Total: max(5ms, 2ms) + 1ms = 6ms

// Speedup: 1.33×
```

### 4. Worker Threads

**CPU-intensive operations in workers**:

```javascript
const { Worker } = require('worker_threads');

// main.js
const detectionWorker = new Worker('./detection-worker.js');

detectionWorker.postMessage({ input: userInput });

detectionWorker.on('message', (result) => {
  console.log('Detection result:', result);
});

// detection-worker.js
const { parentPort } = require('worker_threads');
const { EnhancedDetector } = require('midstreamer/agentdb');

const detector = new EnhancedDetector({ agentdb });

parentPort.on('message', async ({ input }) => {
  const result = await detector.detectThreat(input);
  parentPort.postMessage(result);
});

// Throughput: 100 req/s → 300 req/s (3× with 4 workers)
```

### 5. Caching Strategy

**Multi-level caching**:

```javascript
// L1: In-memory LRU cache (fastest)
const LRU = require('lru-cache');
const cache = new LRU({
  max: 1000,
  ttl: 60000 // 1 minute
});

async function detectWithCache(input) {
  // Check L1 cache
  const cacheKey = hashInput(input);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey); // <1ms
  }

  // Check L2 cache (AgentDB)
  const cached = await agentdb.getCached(cacheKey);
  if (cached) {
    cache.set(cacheKey, cached);
    return cached; // ~2ms
  }

  // Compute and cache
  const result = await detector.detectThreat(input);
  await agentdb.setCached(cacheKey, result);
  cache.set(cacheKey, result);

  return result; // ~10ms
}

// Cache hit rate: 70-80% → 5× average speedup
```

---

## Query Optimization

### 1. HNSW Index Tuning

**M parameter** (connectivity):

```javascript
// Low M (e.g., 8):
// - Faster search
// - Lower accuracy
// - Smaller index

// High M (e.g., 32):
// - Slower search
// - Higher accuracy
// - Larger index

// Recommended: M=16 (balanced)
await agentdb.createIndex('patterns', {
  type: 'hnsw',
  m: 16,
  efConstruction: 200
});
```

**ef_construction** (index build quality):

```javascript
// Low ef_construction (e.g., 100):
// - Faster index build
// - Lower quality index

// High ef_construction (e.g., 400):
// - Slower index build
// - Higher quality index

// Recommended: 200 (production), 100 (development)
await agentdb.createIndex('patterns', {
  type: 'hnsw',
  m: 16,
  efConstruction: 200 // Takes ~2× longer to build, but 10% better search
});
```

**ef_search** (search quality):

```javascript
// Low ef_search (e.g., 20):
// - Faster search (~1ms)
// - Lower recall

// High ef_search (e.g., 100):
// - Slower search (~5ms)
// - Higher recall

// Dynamic adjustment based on confidence
async function adaptiveSearch(query, minConfidence) {
  let efSearch = 20; // Start low

  while (efSearch <= 100) {
    const results = await engine.search('patterns', query, {
      topK: 10,
      efSearch
    });

    if (results[0].score >= minConfidence) {
      return results; // Found good match
    }

    efSearch += 20; // Increase search quality
  }

  return results; // Return best effort
}
```

### 2. Metadata Filtering

**Pre-filter before vector search**:

```javascript
// Slow: Search all patterns, then filter
const allResults = await engine.search('patterns', query, { topK: 100 });
const filtered = allResults.filter(r => r.metadata.severity > 0.8);

// Fast: Filter during search
const filteredResults = await engine.search('patterns', query, {
  topK: 10,
  filters: {
    severity: { $gt: 0.8 },
    attackType: 'sql_injection'
  }
});

// Speedup: 5×
```

### 3. Result Limiting

**Only retrieve what you need**:

```javascript
// Retrieve top 10 (fast)
const top10 = await engine.search('patterns', query, { topK: 10 });
// ~2ms

// Retrieve top 100 (slower)
const top100 = await engine.search('patterns', query, { topK: 100 });
// ~5ms

// Retrieve top 1000 (slow)
const top1000 = await engine.search('patterns', query, { topK: 1000 });
// ~15ms
```

---

## Profiling and Monitoring

### 1. Built-in Profiling

```javascript
const { EnhancedDetector } = require('midstreamer/agentdb');

const detector = new EnhancedDetector({
  agentdb,
  enableProfiling: true
});

detector.on('detection_complete', (profile) => {
  console.log('Profiling results:');
  console.log(`  Total: ${profile.totalMs}ms`);
  console.log(`  DTW: ${profile.dtwMs}ms`);
  console.log(`  Embedding: ${profile.embeddingMs}ms`);
  console.log(`  Vector search: ${profile.vectorSearchMs}ms`);
  console.log(`  Reflexion: ${profile.reflexionMs}ms`);
});
```

### 2. Performance Metrics

```javascript
const { performance, PerformanceObserver } = require('perf_hooks');

const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  });
});
obs.observe({ entryTypes: ['measure'] });

// Measure operations
performance.mark('detection-start');
await detector.detectThreat(input);
performance.mark('detection-end');
performance.measure('detection', 'detection-start', 'detection-end');
```

### 3. Custom Metrics

```javascript
const { Counter, Histogram } = require('prom-client');

// Prometheus metrics
const detectionDuration = new Histogram({
  name: 'detection_duration_ms',
  help: 'Detection latency in milliseconds',
  labelNames: ['method', 'threat_type'],
  buckets: [1, 2, 5, 10, 20, 50, 100, 200, 500]
});

const detectionTotal = new Counter({
  name: 'detections_total',
  help: 'Total number of detections',
  labelNames: ['is_threat', 'method']
});

// Instrument detection
async function detectWithMetrics(input) {
  const start = Date.now();

  const result = await detector.detectThreat(input);

  const duration = Date.now() - start;
  detectionDuration.observe({ method: result.method }, duration);
  detectionTotal.inc({ is_threat: result.isThreat, method: result.method });

  return result;
}
```

---

## Production Best Practices

### 1. Resource Limits

```javascript
// Limit concurrent operations
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  maxConcurrent: 10, // Max 10 concurrent detections
  minTime: 10 // Min 10ms between operations
});

const rateLimitedDetect = limiter.wrap(async (input) => {
  return await detector.detectThreat(input);
});
```

### 2. Circuit Breaker

```javascript
const CircuitBreaker = require('opossum');

const breaker = new CircuitBreaker(async (input) => {
  return await detector.detectThreat(input);
}, {
  timeout: 5000, // 5s timeout
  errorThresholdPercentage: 50, // Open after 50% errors
  resetTimeout: 30000 // Try again after 30s
});

breaker.on('open', () => {
  console.warn('⚠️ Circuit breaker opened - too many failures');
});
```

### 3. Graceful Degradation

```javascript
async function detectWithFallback(input) {
  try {
    // Try enhanced detection
    return await detector.detectThreat(input);
  } catch (error) {
    console.warn('Enhanced detection failed, using DTW fallback', error);

    // Fallback to DTW-only
    return await detectWithDTW(input);
  }
}
```

### 4. Health Checks

```javascript
async function healthCheck() {
  const checks = {
    agentdb: false,
    detector: false,
    embedding: false,
    quicSync: false
  };

  try {
    // Check AgentDB
    await agentdb.query('SELECT 1');
    checks.agentdb = true;

    // Check detector
    const testResult = await detector.detectThreat('test');
    checks.detector = testResult !== null;

    // Check embedding
    const testEmbedding = await bridge.generateEmbedding('test');
    checks.embedding = testEmbedding.length === 1536;

    // Check QUIC sync (if enabled)
    if (syncManager) {
      const status = await syncManager.getStatus();
      checks.quicSync = status.active;
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }

  return {
    healthy: Object.values(checks).every(v => v),
    checks
  };
}

// Periodic health checks
setInterval(async () => {
  const health = await healthCheck();
  if (!health.healthy) {
    console.error('⚠️ System unhealthy:', health.checks);
  }
}, 60000); // Every minute
```

### 5. Logging Best Practices

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log performance metrics
logger.info('Detection completed', {
  latencyMs: result.latencyMs,
  method: result.method,
  isThreat: result.isThreat,
  confidence: result.confidence
});

// Log anomalies
if (result.latencyMs > 50) {
  logger.warn('Slow detection', {
    latencyMs: result.latencyMs,
    input: input.substring(0, 100) // First 100 chars
  });
}
```

---

## Performance Checklist

### Before Production

- [ ] Run benchmarks on production-like data
- [ ] Profile slow operations
- [ ] Optimize HNSW parameters
- [ ] Enable quantization (8-bit recommended)
- [ ] Configure SQLite WAL mode
- [ ] Set up connection pooling
- [ ] Implement caching strategy
- [ ] Add performance monitoring
- [ ] Test circuit breaker
- [ ] Document tuning parameters

### During Operation

- [ ] Monitor p50, p95, p99 latencies
- [ ] Track memory usage trends
- [ ] Check cache hit rates (>95%)
- [ ] Monitor RL training progress
- [ ] Analyze slow query logs
- [ ] Review error rates
- [ ] Validate accuracy metrics
- [ ] Check QUIC sync health (if enabled)

### Optimization Targets

| Metric | Development | Production | High Performance |
|--------|------------|-----------|-----------------|
| Fast Path (p95) | <15ms | <10ms | <5ms |
| Deep Path (p95) | <200ms | <100ms | <50ms |
| Memory Usage | <500MB | <300MB | <200MB |
| Throughput | 50 req/s | 100 req/s | 200+ req/s |
| Cache Hit Rate | >80% | >90% | >95% |

---

## See Also

- [API Reference](./api-reference.md) - Complete API documentation
- [User Guide](./user-guide.md) - Getting started guide
- [Developer Guide](./developer-guide.md) - Architecture details
- [Migration Guide](./migration-guide.md) - Upgrade instructions
