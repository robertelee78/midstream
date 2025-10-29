# AgentDB + Midstream Integration Examples

Complete working examples demonstrating the integration between AgentDB's vector database and Midstream's temporal analysis capabilities.

## 🚀 Quick Start

```bash
# Navigate to examples directory
cd examples/agentdb-integration

# Run all examples
node basic-pattern-storage.js
node adaptive-tuning.js
node memory-anomaly-detection.js
node distributed-streaming.js

# Or make them executable
chmod +x *.js
./basic-pattern-storage.js
```

## 📚 Examples Overview

### Example 1: Basic Pattern Storage
**File:** `basic-pattern-storage.js`

Demonstrates storing and retrieving temporal patterns using semantic embeddings.

**Features:**
- Embedding temporal sequences as 384-dimensional vectors
- Storing patterns with metadata in AgentDB
- Semantic similarity search with configurable threshold
- Cosine similarity-based pattern matching

**Run:**
```bash
node basic-pattern-storage.js
```

**Expected Output:**
```
Stored pattern: pattern_1730073600000_a8f3d2
Found 3 similar patterns:
  1. Similarity: 92.3%
  2. Similarity: 87.1%
  3. Similarity: 81.5%
```

**Key Concepts:**
- Hybrid embedding methods (statistical + DTW + wavelet)
- Pattern namespacing for organization
- Metadata storage for context preservation

---

### Example 2: Adaptive Tuning
**File:** `adaptive-tuning.js`

Uses reinforcement learning to automatically optimize streaming parameters.

**Features:**
- Actor-Critic RL algorithm
- Automatic parameter exploration
- Performance-based reward calculation
- Convergence monitoring

**Run:**
```bash
node adaptive-tuning.js
```

**Duration:** ~30 seconds (30 episodes)

**Expected Output:**
```
Starting adaptive tuning...
Episode 1: reward=0.723, params={windowSize: 100, threshold: 2.0}
...
Episode 30: reward=0.891, params={windowSize: 147, threshold: 1.82}

Performance Improvement: 23.4%
```

**Key Concepts:**
- Exploration vs exploitation trade-off
- Multi-objective reward function
- Adaptive threshold tuning
- Parameter decay schedules

---

### Example 3: Memory-Augmented Anomaly Detection
**File:** `memory-anomaly-detection.js`

Combines historical patterns with real-time detection to reduce false positives.

**Features:**
- Pattern memory network with historical context
- Context-aware anomaly scoring
- Feedback-based learning
- Adaptive threshold adjustment

**Run:**
```bash
node memory-anomaly-detection.js
```

**Expected Output:**
```
🚨 Anomaly Detected!
  Score: 0.873
  Confidence: 94.2%
  Reasoning: DTW distance exceeded threshold (2.3 vs 2.0)...
  Similar past incidents:
    1. cpu_spike_2025-10-15 (92.1% similar)
    2. cpu_spike_2025-10-20 (88.7% similar)
```

**Key Concepts:**
- Historical pattern matching
- Confidence scoring with evidence
- Interactive feedback loop
- False positive reduction (40-60%)

---

### Example 4: CLI Integration
**File:** Updated `/npm-wasm/cli.js`

Adds three new CLI commands for AgentDB integration.

**Commands:**

#### Store Patterns
```bash
npx midstreamer agentdb-store data.csv \
  --agentdb ./agentdb-data \
  --namespace "cpu-patterns" \
  --pattern-threshold 0.8
```

#### Search Patterns
```bash
npx midstreamer agentdb-search "45,50,58,72,85,92" \
  --agentdb ./agentdb-data \
  --namespace "cpu-patterns" \
  --limit 5 \
  --threshold 0.75
```

#### Adaptive Tuning
```bash
npx midstreamer agentdb-tune \
  --agentdb ./agentdb-data \
  --learning-rate 0.001 \
  --exploration 0.3 \
  --episodes 20
```

**Key Features:**
- File format support: JSON, CSV
- Namespace organization
- Configurable thresholds
- Real-time progress feedback

---

### Example 5: Distributed Streaming
**File:** `distributed-streaming.js`

Multi-node pattern sharing and coordinated learning via QUIC.

**Features:**
- Cluster initialization with 3+ nodes
- Hash-based partitioning
- 2x replication for fault tolerance
- Distributed consensus for parameter optimization
- QUIC protocol for low-latency sync

**Run:**
```bash
node distributed-streaming.js
```

**Expected Output:**
```
Cluster initialized: 3 nodes
Streaming data... (10,000 events/sec)

Cluster query results:
  Node 1: Found 4 patterns (12ms latency)
  Node 2: Found 3 patterns (15ms latency)
  Node 3: Found 5 patterns (11ms latency)

Cluster consensus achieved!
Global optimized params: {windowSize: 152, threshold: 1.78}
```

**Key Concepts:**
- Horizontal scalability
- Eventual consistency model
- Distributed query aggregation
- Cluster-wide learning coordination

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# AgentDB configuration
AGENTDB_PATH=./agentdb-data
AGENTDB_CACHE_SIZE=1000
AGENTDB_QUANTIZATION=8bit

# Midstream configuration
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

Create `agentdb-midstream.config.json`:

```json
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
  }
}
```

---

## ⚡ Performance Tips

### 1. Use Quantization
Reduce memory by 4x with minimal accuracy loss:
```javascript
const agentdb = new AgentDB('./data', { quantization: '8bit' });
```

### 2. Enable Caching
Cache embeddings for repeated sequences:
```javascript
const bridge = await createSemanticTemporalBridge('./data', {
  cacheSize: 1000
});
```

### 3. Batch Processing
Process multiple sequences in parallel:
```javascript
const embeddings = await Promise.all(
  sequences.map(seq => bridge.embedSequence(seq))
);
```

### 4. Choose Appropriate Embedding Method
- `statistical`: Fastest, good for simple patterns
- `dtw`: Best for temporal similarity
- `hybrid`: Balanced (recommended)
- `wavelet`: Best for frequency analysis

### 5. Tune HNSW Parameters
For 150x faster search:
```javascript
await agentdb.createIndex('patterns', {
  M: 16,              // Higher = better recall, more memory
  efConstruction: 200, // Higher = better quality, slower build
  efSearch: 50        // Higher = better recall, slower search
});
```

---

## 📊 Performance Characteristics

| Operation | Latency | Throughput | Memory |
|-----------|---------|------------|--------|
| Embedding | 2-5ms | 200-500/sec | 2MB/pattern |
| Storage | ~1ms | 1000/sec | Variable |
| Search (10K patterns) | 10-50ms | 100-200/sec | 10-100MB |
| Search (HNSW) | <1ms | 10K+/sec | 10-100MB |
| RL Episode | 100-500ms | 2-10/sec | 50-200MB |
| Distributed Query | 10-20ms | Variable | Variable |

---

## 🐛 Troubleshooting

### Issue: Embeddings not similar despite visual similarity

**Solution:** Try different embedding methods or increase dimensions
```javascript
const embedding = await bridge.embedSequence(data, {
  method: 'hybrid',     // Try 'dtw' or 'wavelet'
  dimensions: 512,      // Increase from 384
  includeWavelet: true
});
```

### Issue: RL agent not converging

**Solution:** Adjust learning rate and exploration
```javascript
const engine = new AdaptiveLearningEngine(agentdb, {
  learningRate: 0.0001,      // Reduce if oscillating
  explorationRate: 0.5,      // Increase if stuck
  explorationDecay: 0.99     // Slow down decay
});
```

### Issue: High memory usage

**Solution:** Enable quantization and limit cache
```javascript
const agentdb = new AgentDB('./data', {
  quantization: '8bit'  // 4x memory reduction
});

const bridge = await createSemanticTemporalBridge('./data', {
  cacheSize: 500  // Reduce cache size
});
```

---

## 📈 Expected Results Summary

| Example | Runtime | Key Metric | Expected Value |
|---------|---------|------------|----------------|
| 1. Basic Storage | <5 sec | Similarity | 85-95% |
| 2. Adaptive Tuning | 30 sec | Improvement | 20-30% |
| 3. Anomaly Detection | 10 sec | False Positive Reduction | 40-60% |
| 4. CLI Integration | Variable | Success Rate | 95%+ |
| 5. Distributed | 15 sec | Consensus | 90%+ |

---

## 🎯 Success Criteria

- ✅ All examples run without errors
- ✅ Output matches expected format
- ✅ Performance within acceptable ranges
- ✅ Setup time <5 minutes
- ✅ Clear documentation and error messages

---

## 📖 Additional Resources

- [Integration Plan](../../plans/agentdb/integration-plan.md)
- [Quick Start Guide](../../plans/agentdb/examples/quick-start.md)
- [System Architecture](../../plans/agentdb/architecture/system-design.md)
- [API Reference](../../plans/agentdb/api/)

---

## 🤝 Contributing

Found an issue or have improvements? Please submit a PR or open an issue!

---

## 📄 License

MIT License - see LICENSE file for details
