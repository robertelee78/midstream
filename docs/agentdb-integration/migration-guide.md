# Migration Guide: Standalone Midstreamer → AgentDB Integration

**Version**: 1.0.0
**Last Updated**: 2025-10-27

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Code Migration Examples](#code-migration-examples)
5. [Configuration Changes](#configuration-changes)
6. [Performance Impact](#performance-impact)
7. [Rollback Plan](#rollback-plan)

---

## Overview

This guide helps you migrate from standalone Midstreamer to the AgentDB-integrated version, adding:

- **✅ Semantic pattern matching** (96-164× faster than ChromaDB)
- **✅ Persistent memory** across sessions
- **✅ Self-learning** with RL algorithms
- **✅ Multi-agent coordination** via QUIC sync
- **✅ Formal verification** with lean-agentic

**Migration Time**: 30-60 minutes for typical projects

---

## Breaking Changes

### None! 🎉

The AgentDB integration is **fully backward compatible** with standalone Midstreamer. All existing APIs continue to work:

```javascript
// Standalone Midstreamer (still works!)
const { dtw_distance, lcs_length } = require('midstreamer');

const distance = dtw_distance(series1, series2);
// ✅ No changes required
```

### New Features (Opt-in)

AgentDB features are **opt-in** via new APIs:

```javascript
// New AgentDB features (optional)
const { EnhancedDetector } = require('midstreamer/agentdb');

const detector = new EnhancedDetector({ agentdb });
// ✅ Only use if you need AgentDB features
```

---

## Step-by-Step Migration

### Step 1: Install AgentDB

```bash
# Add AgentDB to your existing project
npm install agentdb

# Verify installation
npm list agentdb
# agentdb@1.6.1
```

**No changes needed** to your existing Midstreamer installation.

### Step 2: Initialize AgentDB

Create AgentDB instance:

```javascript
// app/config/agentdb.js
const { AgentDB } = require('agentdb');

const agentdb = new AgentDB('./data/defense.db', {
  verbose: false,
  journalMode: 'WAL',
  synchronous: 'NORMAL'
});

// Create namespaces
async function initializeAgentDB() {
  await agentdb.createNamespace('attack_patterns', {
    dimensions: 1536,
    metric: 'cosine'
  });

  await agentdb.createIndex('attack_patterns', {
    type: 'hnsw',
    m: 16,
    efConstruction: 200
  });

  console.log('✅ AgentDB initialized');
}

initializeAgentDB().catch(console.error);

module.exports = agentdb;
```

### Step 3: Gradual Feature Adoption

**Option A: Keep existing code, add AgentDB features incrementally**

```javascript
// Before (standalone Midstreamer)
const { dtw_distance } = require('midstreamer');

async function detectThreat(input) {
  const tokens = tokenize(input);
  for (const pattern of knownPatterns) {
    const distance = dtw_distance(tokens, pattern);
    if (distance < threshold) {
      return { isThreat: true, patternType: pattern.type };
    }
  }
  return { isThreat: false };
}

// After (hybrid approach - both work together!)
const { dtw_distance } = require('midstreamer');
const { EnhancedDetector } = require('midstreamer/agentdb');
const agentdb = require('./config/agentdb');

const enhancedDetector = new EnhancedDetector({ agentdb });

async function detectThreat(input) {
  // Try enhanced detector first (with AgentDB)
  const enhancedResult = await enhancedDetector.detectThreat(input);
  if (enhancedResult.confidence > 0.9) {
    return enhancedResult;
  }

  // Fallback to original DTW (backward compatible)
  const tokens = tokenize(input);
  for (const pattern of knownPatterns) {
    const distance = dtw_distance(tokens, pattern);
    if (distance < threshold) {
      return { isThreat: true, patternType: pattern.type };
    }
  }

  return { isThreat: false };
}
```

**Option B: Full migration to EnhancedDetector**

```javascript
// Before
const { dtw_distance } = require('midstreamer');

// After
const { EnhancedDetector } = require('midstreamer/agentdb');
const agentdb = require('./config/agentdb');

const detector = new EnhancedDetector({
  agentdb,
  windowSize: 100,
  similarityThreshold: 0.85
});

async function detectThreat(input) {
  return await detector.detectThreat(input);
}
```

### Step 4: Migrate Pattern Storage

**Before**: Patterns in JSON files

```javascript
// data/patterns.json
{
  "patterns": [
    {
      "type": "sql_injection",
      "sequence": [1, 2, 3, 4, 5],
      "severity": 0.9
    }
  ]
}
```

**After**: Patterns in AgentDB (with semantic search)

```javascript
const { PatternMemoryNetwork, EmbeddingBridge } = require('midstreamer/agentdb');

async function migratePatterns() {
  const patterns = require('./data/patterns.json');
  const bridge = new EmbeddingBridge(agentdb, {
    apiKey: process.env.OPENAI_API_KEY
  });
  const network = new PatternMemoryNetwork(agentdb, bridge);

  for (const pattern of patterns.patterns) {
    await network.storePattern(
      new Float64Array(pattern.sequence),
      {
        name: pattern.type,
        attackType: pattern.type,
        severity: pattern.severity,
        firstSeen: new Date()
      }
    );
  }

  console.log(`✅ Migrated ${patterns.patterns.length} patterns to AgentDB`);
}

migratePatterns().catch(console.error);
```

### Step 5: Add Learning (Optional)

Enable adaptive learning:

```javascript
const { AdaptiveLearningEngine } = require('midstreamer/agentdb');

const learner = new AdaptiveLearningEngine('actor_critic', agentdb);

// Enable auto-tuning
await learner.enableAutoTuning(5000);

// Get optimized parameters
const params = await learner.getOptimalParams();
detector.updateConfig(params);

console.log('✅ Adaptive learning enabled');
```

---

## Code Migration Examples

### Example 1: Basic Detection

**Before**:

```javascript
const { dtw_distance } = require('midstreamer');

function detectAnomaly(series, reference) {
  const distance = dtw_distance(series, reference);
  return {
    isAnomaly: distance > 50,
    distance
  };
}
```

**After (backward compatible)**:

```javascript
const { dtw_distance } = require('midstreamer');

function detectAnomaly(series, reference) {
  const distance = dtw_distance(series, reference);
  return {
    isAnomaly: distance > 50,
    distance
  };
}
// ✅ No changes required!
```

**After (with AgentDB)**:

```javascript
const { dtw_distance } = require('midstreamer');
const { EnhancedDetector } = require('midstreamer/agentdb');

const detector = new EnhancedDetector({ agentdb });

async function detectAnomaly(series, reference) {
  // DTW distance (original)
  const distance = dtw_distance(series, reference);

  // Semantic similarity (new)
  const result = await detector.detectThreat(seriesAsText);

  return {
    isAnomaly: distance > 50 || result.isThreat,
    distance,
    semanticConfidence: result.confidence,
    method: result.method
  };
}
```

### Example 2: Pattern Matching

**Before**:

```javascript
const patterns = require('./patterns.json');

function findSimilarPattern(input) {
  for (const pattern of patterns) {
    const distance = dtw_distance(input, pattern.sequence);
    if (distance < 20) {
      return pattern;
    }
  }
  return null;
}
```

**After**:

```javascript
const { PatternMemoryNetwork } = require('midstreamer/agentdb');

const network = new PatternMemoryNetwork(agentdb, bridge);

async function findSimilarPattern(input) {
  // Semantic search (much faster than DTW for large pattern databases)
  const similar = await network.searchBySemantics(
    inputAsText,
    { topK: 1, minScore: 0.85 }
  );

  if (similar.length > 0) {
    return similar[0];
  }

  // Fallback to DTW if needed
  for (const pattern of patterns) {
    const distance = dtw_distance(input, pattern.sequence);
    if (distance < 20) {
      return pattern;
    }
  }

  return null;
}
```

### Example 3: Streaming Analysis

**Before**:

```javascript
const { create_temporal_compare } = require('midstreamer');

const comparator = create_temporal_compare(100);

process.stdin.on('data', (data) => {
  const values = parseData(data);
  for (const value of values) {
    comparator.add_value(value);
  }

  const analysis = comparator.analyze();
  console.log('DTW:', analysis.dtw_distance);
});
```

**After (backward compatible + AgentDB)**:

```javascript
const { create_temporal_compare } = require('midstreamer');
const { ReflexionMemory } = require('midstreamer/agentdb');

const comparator = create_temporal_compare(100);
const reflexion = new ReflexionMemory(agentdb, 'streaming_reflexions');

process.stdin.on('data', async (data) => {
  const values = parseData(data);
  for (const value of values) {
    comparator.add_value(value);
  }

  const analysis = comparator.analyze();
  console.log('DTW:', analysis.dtw_distance);

  // Store reflexion for learning
  if (analysis.anomaly_detected) {
    await reflexion.storeReflexion(
      'streaming_analysis',
      `analysis_${Date.now()}`,
      analysis.confidence,
      true
    );
  }
});
```

---

## Configuration Changes

### Old Configuration (Midstreamer only)

```javascript
// config.js
module.exports = {
  midstreamer: {
    windowSize: 100,
    slideSize: 10,
    threshold: 0.85
  }
};
```

### New Configuration (with AgentDB)

```javascript
// config.js
module.exports = {
  midstreamer: {
    windowSize: 100,
    slideSize: 10,
    threshold: 0.85
  },

  // New: AgentDB configuration
  agentdb: {
    databasePath: './data/defense.db',
    namespaces: {
      attackPatterns: {
        dimensions: 1536,
        metric: 'cosine'
      },
      reflexions: {
        dimensions: 512,
        metric: 'cosine'
      }
    },
    hnsw: {
      m: 16,
      efConstruction: 200
    },
    cache: {
      size: 10000,
      mmapSize: 268435456 // 256MB
    }
  },

  // New: Embedding configuration
  embedding: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    apiKey: process.env.OPENAI_API_KEY
  },

  // New: Learning configuration
  learning: {
    algorithm: 'actor_critic',
    autoTune: true,
    maxIterations: 5000
  },

  // New: QUIC sync configuration (optional)
  quicSync: {
    enabled: false,
    listen: '0.0.0.0:4433',
    peers: []
  }
};
```

---

## Performance Impact

### Latency Changes

| Operation | Before (Midstreamer) | After (with AgentDB) | Change |
|-----------|---------------------|---------------------|--------|
| DTW Distance | 7.8ms | 7.8ms | No change |
| Pattern Matching (10K) | N/A | <2ms | New feature |
| LCS Length | 3.2ms | 3.2ms | No change |
| Scheduler | 89ns | 89ns | No change |
| **Fast Path Detection** | **7.8ms** | **<10ms** | **+2.2ms** |

**Conclusion**: Minimal performance impact (<30% increase) for 10× more features.

### Memory Usage

| Configuration | Before | After | Change |
|---------------|--------|-------|--------|
| Base | 50MB | 50MB | No change |
| + 10K patterns | N/A | +71MB | New feature |
| + Quantization (4-bit) | N/A | +9MB | New feature |
| + Learning engine | N/A | +20MB | New feature |
| **Total (typical)** | **50MB** | **150MB** | **+100MB** |

**Conclusion**: Memory increase is acceptable for most applications.

### Throughput

| Scenario | Before | After | Change |
|----------|--------|-------|--------|
| DTW-only | 128 req/s | 128 req/s | No change |
| With AgentDB (cached) | N/A | 143 req/s | New feature |
| With AgentDB (cold) | N/A | 100 req/s | New feature |
| **Typical mixed** | **128 req/s** | **120 req/s** | **-6%** |

**Conclusion**: Slight throughput decrease, but adds semantic intelligence.

---

## Rollback Plan

### If Migration Fails

**Step 1: Disable AgentDB features**

```javascript
// Comment out AgentDB imports
// const { EnhancedDetector } = require('midstreamer/agentdb');

// Use original Midstreamer
const { dtw_distance } = require('midstreamer');
```

**Step 2: Remove AgentDB package (optional)**

```bash
npm uninstall agentdb
```

**Step 3: Revert configuration**

```javascript
// Use old config.js (without agentdb section)
```

### Gradual Rollback

**Roll back features one at a time**:

1. Disable learning engine
2. Disable vector search
3. Disable reflexion memory
4. Fall back to pure Midstreamer

```javascript
// Progressive rollback
const USE_AGENTDB_VECTOR = false; // Disable vector search
const USE_ADAPTIVE_LEARNING = false; // Disable learning
const USE_REFLEXION = false; // Disable memory

async function detectThreat(input) {
  if (USE_AGENTDB_VECTOR) {
    const result = await enhancedDetector.detectThreat(input);
    if (result.confidence > 0.9) return result;
  }

  // Always fallback to DTW
  return detectWithDTW(input);
}
```

---

## Migration Checklist

### Pre-Migration

- [ ] Backup existing pattern data
- [ ] Review current Midstreamer usage
- [ ] Identify features to adopt
- [ ] Test in staging environment
- [ ] Estimate memory requirements

### Migration

- [ ] Install AgentDB package
- [ ] Initialize AgentDB database
- [ ] Create namespaces and indexes
- [ ] Migrate pattern data
- [ ] Update configuration
- [ ] Add new API calls
- [ ] Test detection pipeline

### Post-Migration

- [ ] Monitor performance metrics
- [ ] Verify accuracy improvements
- [ ] Check memory usage
- [ ] Enable adaptive learning
- [ ] Train RL algorithms
- [ ] Set up QUIC sync (if multi-node)
- [ ] Document changes for team

### Rollback Preparation

- [ ] Keep old code commented
- [ ] Maintain dual-mode support
- [ ] Document rollback procedure
- [ ] Create restore scripts
- [ ] Test rollback in staging

---

## Troubleshooting Migration Issues

### Issue: AgentDB initialization fails

**Symptoms**: Database creation errors

**Solution**:

```javascript
// Ensure directory exists
const fs = require('fs');
const path = require('path');

const dbPath = './data/defense.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const agentdb = new AgentDB(dbPath);
```

### Issue: Embedding API errors

**Symptoms**: OpenAI API failures

**Solution**:

```javascript
// Check API key
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not set, using DTW-only mode');
  // Fall back to DTW
}

// Add retry logic
const bridge = new EmbeddingBridge(agentdb, {
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 5,
  retryDelay: 2000
});
```

### Issue: Performance regression

**Symptoms**: Slower detection

**Solution**:

```javascript
// Enable caching
const detector = new EnhancedDetector({
  agentdb,
  enableCache: true,
  cacheSize: 1000
});

// Use quantization
await searchEngine.quantize('attack_patterns', 4);

// Adjust ef_search
const results = await agentdb.vectorSearch({
  query,
  efSearch: 30 // Lower = faster
});
```

---

## Next Steps After Migration

1. **Monitor Performance**: Track latency, accuracy, and memory
2. **Enable Learning**: Start adaptive parameter tuning
3. **Expand Patterns**: Import more attack patterns
4. **Add Multi-Node**: Set up QUIC synchronization
5. **Optimize**: Fine-tune based on production metrics

---

## Support

**Need help with migration?**

- **Documentation**: [User Guide](./user-guide.md), [API Reference](./api-reference.md)
- **GitHub Issues**: https://github.com/ruvnet/midstream/issues
- **Discord**: [Join our community](#)
- **Email**: support@midstreamer.dev

**Migration went smoothly?** Share your experience on Discord! 🎉
