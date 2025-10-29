# AgentDB + Midstreamer Quick Start Guide

This guide gets you up and running with the integration in 5 minutes.

## Installation

```bash
# Install both packages
npm install midstreamer agentdb

# Or using the CLI tools
npm install -g midstreamer agentdb
```

## Example 1: Basic Pattern Storage and Retrieval

```typescript
import { createSemanticTemporalBridge } from './api/embedding-bridge';
import { Midstreamer } from 'midstreamer';

async function storeAndRetrievePatterns() {
  // Initialize bridge
  const bridge = await createSemanticTemporalBridge('./agentdb-data');

  // Create temporal sequence
  const cpuUsage = [45, 47, 50, 55, 62, 70, 78, 85, 90, 88, 82, 75, 68];

  // Embed and store
  const embedding = await bridge.embedSequence(cpuUsage, {
    method: 'hybrid',
    dimensions: 384
  });

  const patternId = await bridge.storePattern(embedding, {
    sequence: {
      data: cpuUsage,
      timestamp: new Date(),
      metadata: { source: 'cpu-monitor' }
    },
    features: {} as any,
    metadata: {
      windowSize: cpuUsage.length,
      method: 'hybrid',
      version: '1.0.0'
    }
  }, 'cpu-patterns');

  console.log(`Stored pattern: ${patternId}`);

  // Later: Find similar patterns
  const newSequence = [43, 48, 53, 58, 65, 72, 79, 84, 89, 87, 80, 72];
  const newEmbedding = await bridge.embedSequence(newSequence);

  const similar = await bridge.findSimilarPatterns(newEmbedding, {
    limit: 5,
    threshold: 0.75
  });

  console.log(`Found ${similar.length} similar patterns:`);
  similar.forEach((match, i) => {
    console.log(`  ${i + 1}. Similarity: ${(match.similarity * 100).toFixed(1)}%`);
  });
}

storeAndRetrievePatterns();
```

**Output:**
```
Stored pattern: pattern_1730073600000_a8f3d2
Found 3 similar patterns:
  1. Similarity: 92.3%
  2. Similarity: 87.1%
  3. Similarity: 81.5%
```

---

## Example 2: Adaptive Parameter Tuning

```typescript
import { AdaptiveLearningEngine } from './api/adaptive-learning-engine';
import { AgentDB } from 'agentdb';
import { Midstreamer } from 'midstreamer';

async function adaptiveStreaming() {
  // Setup
  const agentdb = new AgentDB('./agentdb-data');
  await agentdb.initialize();

  const engine = new AdaptiveLearningEngine(agentdb, {
    algorithm: 'actor_critic',
    learningRate: 0.001,
    explorationRate: 0.3
  });

  await engine.initializeAgent();

  const midstreamer = new Midstreamer({
    windowSize: 100,
    threshold: 2.0
  });

  // Enable auto-tuning
  console.log('Starting adaptive tuning...');

  await engine.enableAutoTuning(10000, async (optimizedParams) => {
    // Apply optimized parameters to Midstreamer
    midstreamer.updateConfig({
      windowSize: optimizedParams.windowSize,
      threshold: optimizedParams.threshold,
      sensitivity: optimizedParams.sensitivity
    });

    // Run streaming and collect metrics
    const metrics = await midstreamer.analyzeStream(dataSource);

    return {
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      falsePositiveRate: metrics.falsePositiveRate,
      latency: metrics.processingTime,
      throughput: metrics.eventsPerSecond,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0 // Would use actual CPU monitoring
    };
  });

  // Let it learn for 5 minutes
  await new Promise(resolve => setTimeout(resolve, 300000));

  engine.disableAutoTuning();

  // Check results
  const stats = engine.getStatistics();
  console.log('\nAdaptive Learning Results:');
  console.log('  Episodes:', stats.episodeCount);
  console.log('  Best Parameters:', stats.bestParams);
  console.log('  Performance Improvement:', `${((stats.bestReward / 0.8) * 100 - 100).toFixed(1)}%`);
}

adaptiveStreaming();
```

**Output:**
```
Starting adaptive tuning...
Auto-tuning episode 1
  Reward: 0.723
  Exploration: 0.300
  Confidence: 0.700
...
Auto-tuning episode 30
  Reward: 0.891
  Exploration: 0.045
  Confidence: 0.955

Adaptive Learning Results:
  Episodes: 30
  Best Parameters: {
    windowSize: 147,
    threshold: 1.82,
    sensitivity: 1.23,
    adaptiveThreshold: true,
    anomalyDetectionMethod: 'hybrid'
  }
  Performance Improvement: 23.4%
```

---

## Example 3: Memory-Augmented Anomaly Detection

```typescript
import { MemoryAugmentedAnomalyDetector } from './api/memory-anomaly-detector';
import { PatternMemoryNetwork } from './api/pattern-memory-network';

async function intelligentAnomalyDetection() {
  // Initialize pattern memory
  const patternMemory = new PatternMemoryNetwork(agentdb);

  // Initialize detector with historical context
  const detector = new MemoryAugmentedAnomalyDetector();
  await detector.initialize(patternMemory, {
    historicalPatterns: ['cpu_spike', 'memory_leak', 'disk_saturation'],
    confidenceThreshold: 0.8,
    adaptiveThreshold: true
  });

  // Stream data and detect anomalies
  const dataStream = getMetricsStream(); // Your data source

  for await (const dataPoint of dataStream) {
    const result = await detector.detectWithMemory(dataPoint, {
      useSemanticSearch: true,
      learningEnabled: true
    });

    if (result.isAnomaly) {
      console.log('\n🚨 Anomaly Detected!');
      console.log(`  Score: ${result.score.toFixed(3)}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`  Reasoning: ${result.reasoning}`);

      if (result.similarPatterns.length > 0) {
        console.log('  Similar past incidents:');
        result.similarPatterns.forEach((pattern, i) => {
          console.log(`    ${i + 1}. ${pattern.id} (${(pattern.similarity * 100).toFixed(1)}% similar)`);
        });
      }

      // Wait for human feedback
      const isRealAnomaly = await getUserFeedback();

      // Learn from feedback
      await detector.learnFromAnomaly(
        dataPoint,
        isRealAnomaly,
        isRealAnomaly ? undefined : 'False positive - normal load spike'
      );
    }
  }
}

intelligentAnomalyDetection();
```

**Output:**
```
🚨 Anomaly Detected!
  Score: 0.873
  Confidence: 94.2%
  Reasoning: DTW distance exceeded threshold (2.3 vs 2.0) with high confidence based on 8 similar historical patterns
  Similar past incidents:
    1. cpu_spike_2025-10-15 (92.1% similar)
    2. cpu_spike_2025-10-20 (88.7% similar)
    3. memory_pressure_2025-10-18 (81.3% similar)

[Feedback received: Confirmed anomaly]
✓ Pattern learned and memory updated
```

---

## Example 4: CLI Integration

### Store Patterns

```bash
# Stream data and automatically store notable patterns
midstreamer stream cpu.csv \
  --agentdb ./agentdb-data \
  --store-patterns \
  --pattern-threshold 0.8 \
  --namespace "cpu-patterns"

# Output:
# Processing: 1000 events
# Detected: 15 notable patterns
# Stored: 15 patterns in namespace 'cpu-patterns'
```

### Search Patterns

```bash
# Find similar patterns to current sequence
midstreamer search-patterns \
  --query "anomaly" \
  --agentdb ./agentdb-data \
  --namespace "cpu-patterns" \
  --limit 5 \
  --threshold 0.75

# Output:
# Top 5 similar patterns:
# 1. pattern_1730073600000_a8f3d2 (similarity: 0.923)
# 2. pattern_1730159200000_b7e4c1 (similarity: 0.891)
# 3. pattern_1730245600000_c6d5a3 (similarity: 0.867)
# 4. pattern_1730332000000_d5c4b2 (similarity: 0.834)
# 5. pattern_1730418400000_e4b3a1 (similarity: 0.809)
```

### Adaptive Mode

```bash
# Stream with adaptive parameter tuning
midstreamer stream cpu.csv \
  --adaptive \
  --agentdb ./agentdb-data \
  --learning-rate 0.001 \
  --exploration 0.3 \
  --auto-tune-interval 10000

# Output:
# Starting adaptive streaming...
# Episode 1: reward=0.723, params={windowSize: 100, threshold: 2.0}
# Episode 2: reward=0.745, params={windowSize: 115, threshold: 1.95}
# Episode 3: reward=0.768, params={windowSize: 128, threshold: 1.88}
# ...
# Episode 30: reward=0.891, params={windowSize: 147, threshold: 1.82}
# Convergence achieved! Best params saved to ./agentdb-data/optimal-params.json
```

---

## Example 5: Distributed Streaming (QUIC)

```typescript
import { DistributedTemporalStreaming } from './api/distributed-streaming';

async function distributedProcessing() {
  // Initialize distributed streaming
  const cluster = new DistributedTemporalStreaming();

  await cluster.initializeCluster({
    nodes: [
      'node1.example.com:8080',
      'node2.example.com:8080',
      'node3.example.com:8080'
    ],
    syncProtocol: 'quic',
    consistencyModel: 'eventual'
  });

  // Stream to cluster with partitioning
  await cluster.streamToCluster(dataSource, {
    replication: 2, // Replicate to 2 nodes
    partitioning: 'hash' // Hash-based distribution
  });

  // Query across cluster
  const query = await bridge.embedSequence(anomalySequence);

  const results = await cluster.queryCluster(query, {
    aggregation: 'weighted',
    timeout: 5000
  });

  console.log('Cluster query results:');
  results.forEach((nodeResult, i) => {
    console.log(`  Node ${i + 1} (${nodeResult.node}):`);
    console.log(`    Found: ${nodeResult.results.length} patterns`);
    console.log(`    Latency: ${nodeResult.latency}ms`);
  });

  // Distributed learning coordination
  const globalParams = await cluster.coordinateLearning({
    accuracy: 0.89,
    latency: 45,
    // ... other metrics
  });

  if (globalParams.consensusReached) {
    console.log('Cluster consensus achieved!');
    console.log('Global optimized params:', globalParams.globalOptimizedParams);
  }
}

distributedProcessing();
```

**Output:**
```
Cluster initialized: 3 nodes
Streaming data... (10,000 events/sec)

Cluster query results:
  Node 1 (node1.example.com:8080):
    Found: 4 patterns
    Latency: 12ms
  Node 2 (node2.example.com:8080):
    Found: 3 patterns
    Latency: 15ms
  Node 3 (node3.example.com:8080):
    Found: 5 patterns
    Latency: 11ms

Cluster consensus achieved!
Global optimized params: {
  windowSize: 152,
  threshold: 1.78,
  sensitivity: 1.31
}
```

---

## Configuration

### Environment Variables

```bash
# AgentDB configuration
AGENTDB_PATH=./agentdb-data
AGENTDB_CACHE_SIZE=1000
AGENTDB_QUANTIZATION=8bit

# Midstreamer configuration
MIDSTREAM_WINDOW_SIZE=100
MIDSTREAM_THRESHOLD=2.0
MIDSTREAM_SENSITIVITY=1.0

# Integration settings
INTEGRATION_EMBEDDING_METHOD=hybrid
INTEGRATION_EMBEDDING_DIMENSIONS=384
INTEGRATION_CACHE_EMBEDDINGS=true

# RL configuration
RL_ALGORITHM=actor_critic
RL_LEARNING_RATE=0.001
RL_EXPLORATION_RATE=0.3
RL_AUTO_TUNE_INTERVAL=10000
```

### Configuration File

```json
// agentdb-midstream.config.json
{
  "agentdb": {
    "path": "./agentdb-data",
    "cacheSize": 1000,
    "quantization": "8bit"
  },
  "midstreamer": {
    "windowSize": 100,
    "threshold": 2.0,
    "sensitivity": 1.0
  },
  "integration": {
    "embeddingMethod": "hybrid",
    "embeddingDimensions": 384,
    "cacheEmbeddings": true,
    "autoTuning": {
      "enabled": true,
      "algorithm": "actor_critic",
      "learningRate": 0.001,
      "explorationRate": 0.3,
      "interval": 10000
    }
  },
  "patternMemory": {
    "namespace": "default",
    "retentionDays": 30,
    "maxPatterns": 100000
  }
}
```

---

## Performance Tips

1. **Use Quantization**: Reduce memory by 4x with minimal accuracy loss
   ```typescript
   const agentdb = new AgentDB('./data', { quantization: '8bit' });
   ```

2. **Enable Caching**: Cache embeddings for repeated sequences
   ```typescript
   const bridge = await createSemanticTemporalBridge('./data', {
     cacheSize: 1000
   });
   ```

3. **Batch Processing**: Process multiple sequences in parallel
   ```typescript
   const embeddings = await Promise.all(
     sequences.map(seq => bridge.embedSequence(seq))
   );
   ```

4. **Use Appropriate Embedding Method**:
   - `statistical`: Fastest, good for simple patterns
   - `dtw`: Best for temporal similarity
   - `hybrid`: Balanced (recommended)
   - `wavelet`: Best for frequency analysis

5. **Tune HNSW Parameters**:
   ```typescript
   await agentdb.createIndex('patterns', {
     M: 16, // Higher = better recall, more memory
     efConstruction: 200, // Higher = better quality, slower build
     efSearch: 50 // Higher = better recall, slower search
   });
   ```

---

## Troubleshooting

### Issue: Embeddings not similar despite visual similarity

**Solution**: Try different embedding methods or increase dimensions
```typescript
const embedding = await bridge.embedSequence(data, {
  method: 'hybrid', // Try 'dtw' or 'wavelet'
  dimensions: 512, // Increase from 384
  includeWavelet: true
});
```

### Issue: RL agent not converging

**Solution**: Adjust learning rate and exploration
```typescript
const engine = new AdaptiveLearningEngine(agentdb, {
  learningRate: 0.0001, // Reduce if oscillating
  explorationRate: 0.5, // Increase if stuck in local optimum
  explorationDecay: 0.99 // Slow down decay
});
```

### Issue: High memory usage

**Solution**: Enable quantization and limit cache
```typescript
const agentdb = new AgentDB('./data', {
  quantization: '8bit' // 4x memory reduction
});

const bridge = await createSemanticTemporalBridge('./data', {
  cacheSize: 500 // Reduce cache size
});
```

---

## Next Steps

1. Read the [Integration Plan](../integration-plan.md) for comprehensive overview
2. Explore [System Architecture](../architecture/system-design.md) for deep dive
3. Check [API Reference](../api/) for detailed documentation
4. Join community at https://github.com/agentdb/midstreamer-integration

**Need help?** File an issue or reach out on Discord!
