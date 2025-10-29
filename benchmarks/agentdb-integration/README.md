# AgentDB + Midstreamer Integration Benchmarks

Comprehensive performance benchmarking suite for validating the AgentDB + Midstreamer integration against target metrics.

## 🎯 Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Embedding Generation | <10ms | ✅ Yes |
| Storage Latency | <10ms | ✅ Yes |
| Search Latency (10K patterns) | <15ms | ✅ Yes |
| End-to-End Latency | <100ms | ✅ Yes |
| Throughput | 10,000 events/sec | ✅ Yes |
| RL Convergence | <500 episodes | 🟡 No |
| Memory Usage (w/ quantization) | <2GB | 🟡 No |

## 📦 Benchmark Suites

### 1. Embedding Performance (`embedding-performance.bench.ts`)

Tests all 4 embedding methods with variable sequence lengths:

- **Direct State Vector**: Fastest, minimal processing
- **Token-based**: Moderate complexity with vocabulary lookup
- **Pattern-based**: Complex feature extraction
- **Temporal Sequence**: Most feature-rich with attention

**Variations tested:**
- Sequence lengths: 10, 50, 100, 500, 1000
- Pattern complexity: 5, 10, 20, 50, 100 fields
- Temporal sequences: 10-50 steps

### 2. RL Performance (`rl-performance.bench.ts`)

Tests reinforcement learning adaptive capabilities:

- **Convergence Speed**: Episodes required to reach performance threshold
- **Inference Latency**: Action selection time (target: <5ms)
- **Learning Overhead**: Q-learning update time (target: <20ms)
- **Batch Learning**: Performance with various batch sizes
- **Memory Growth**: Q-table size scaling

### 3. Streaming Pipeline (`streaming-pipeline.bench.ts`)

End-to-end pipeline benchmarks with realistic streaming data:

- **Single Event Processing**: Full pipeline latency
- **Latency Distribution**: P50, P95, P99 analysis
- **Throughput Measurement**: Events per second at scale
- **Parallel vs Sequential**: Speedup analysis
- **Component Breakdown**: Time spent in each stage
- **Scale Testing**: Performance with growing pattern database

### 4. Memory Profiling (`memory-profiling.bench.ts`)

Memory usage analysis with optimization strategies:

- **Quantization Performance**: 4-bit and 8-bit compression
- **Quantization Accuracy**: RMSE vs original vectors
- **Storage Growth**: Memory scaling with dataset size
- **HNSW Index Overhead**: Graph structure memory
- **Memory Projections**: Capacity planning for various scales
- **Access Performance**: Dequantization overhead

### 5. Baseline Comparison (`baseline-comparison.bench.ts`)

Compares integration vs baseline implementations:

- **Baseline**: Midstreamer alone (no AgentDB, no ML)
- **Static**: Midstreamer + AgentDB (vector search, no RL)
- **Enhanced**: Full integration (AgentDB + RL)

**Metrics compared:**
- Detection latency
- Stream processing throughput
- Learning and adaptation accuracy
- ROI analysis with cost breakdown

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
# or
cd /workspaces/midstream/benchmarks/agentdb-integration
npm install
```

### Run All Benchmarks

```bash
npm run bench:all
```

This runs all 5 benchmark suites and generates a comprehensive master report.

### Run Individual Suites

```bash
# Embedding performance
npm run bench:embedding

# RL adaptive learning
npm run bench:rl

# Streaming pipeline
npm run bench:streaming

# Memory profiling
npm run bench:memory

# Baseline comparison
npm run bench:baseline
```

### Run Regression Tests

```bash
npm run test:regression
```

Runs lightweight regression tests to detect performance degradation.

### View Reports

```bash
# View master report
npm run report

# Or open in browser/editor
open results/MASTER-REPORT.md
```

## 📊 Output Files

All results are saved to the `results/` directory:

```
results/
├── MASTER-REPORT.md              # Comprehensive report
├── master-results.json           # All benchmark data
├── embedding-performance-report.md
├── embedding-performance.json
├── rl-performance-report.md
├── rl-performance.json
├── streaming-pipeline-report.md
├── streaming-pipeline.json
├── memory-profiling-report.md
├── memory-profiling.json
├── baseline-comparison-report.md
├── baseline-comparison.json
├── regression-report.md
├── regression-results.json
└── regression-baseline.json      # Baseline for future runs
```

## 📈 Interpreting Results

### Performance Targets

Each benchmark validates against specific targets:

- ✅ **PASS**: Metric meets or exceeds target
- ❌ **FAIL**: Metric exceeds target (needs optimization)

### Latency Percentiles

- **P50 (Median)**: Typical performance
- **P95**: 95% of requests faster than this
- **P99**: 99% of requests faster than this (critical for SLAs)

### Throughput

Calculated as operations per second:
- **Target**: 10,000 events/sec minimum
- **Optimal**: 50,000+ events/sec for production

### Memory Usage

Projections for various scales:
- **10K patterns**: ~50MB with 4-bit quantization
- **100K patterns**: ~500MB with 4-bit quantization
- **1M patterns**: ~5GB (requires distributed setup)

## 🔧 Optimization Recommendations

### If Embedding is Slow (<10ms target)

1. Enable WASM SIMD acceleration
2. Use 4-bit quantization
3. Reduce embedding dimensions
4. Batch embedding generation

### If Search is Slow (<15ms target)

1. Optimize HNSW parameters (M=16, efConstruction=200)
2. Use approximate search for large datasets
3. Implement quantized vector search
4. Pre-warm index with common patterns

### If Memory Exceeds Target (>2GB)

1. Enable 4-bit quantization (87.5% reduction)
2. Implement LRU cache for embeddings
3. Use distributed storage for >500K patterns
4. Prune old/unused patterns

### If Throughput is Low (<10K events/sec)

1. Enable parallel processing
2. Batch operations (100-1000 events)
3. Optimize hot paths in pipeline
4. Use async I/O for storage

## 🧪 Regression Testing

Regression tests ensure performance doesn't degrade over time:

```bash
npm run test:regression
```

### First Run

Creates a baseline from current performance:
- All tests run and measured
- Results saved to `regression-baseline.json`
- Future runs compare against this baseline

### Subsequent Runs

Compares current performance to baseline:
- ✅ **Pass**: Within 10% of baseline (20% for non-critical)
- ❌ **Fail**: Significant regression detected

### Updating Baseline

After performance improvements:

```bash
# Run regression tests
npm run test:regression

# If all pass, manually save new baseline
cp results/regression-results.json results/regression-baseline.json
```

## 📝 Adding New Benchmarks

### 1. Create Benchmark File

```typescript
// my-new-benchmark.bench.ts
import { BenchmarkRunner } from './utils/benchmark-runner';

async function main() {
  const runner = new BenchmarkRunner();

  const result = await runner.runBenchmark(
    'My Test',
    async () => {
      // Your test code here
    },
    { iterations: 1000, measureMemory: true }
  );

  runner.printResults(result);
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runMyBenchmark };
```

### 2. Add to Master Runner

Edit `run-all-benchmarks.ts`:

```typescript
import { runMyBenchmark } from './my-new-benchmark.bench';

const SUITES = [
  // ... existing suites
  {
    name: 'My New Benchmark',
    description: 'Tests my new feature',
    run: runMyBenchmark,
  },
];
```

### 3. Add NPM Script

Edit `package.json`:

```json
{
  "scripts": {
    "bench:mynew": "ts-node my-new-benchmark.bench.ts"
  }
}
```

## 🎛️ Configuration

### Benchmark Options

```typescript
interface BenchmarkOptions {
  iterations?: number;        // Default: 1000
  warmupIterations?: number;  // Default: 100
  measureMemory?: boolean;    // Default: true
  gc?: boolean;              // Default: true (force GC if available)
}
```

### Running with Custom Options

```typescript
const result = await runner.runBenchmark(
  'Custom Test',
  testFunction,
  {
    iterations: 5000,          // More iterations for precision
    warmupIterations: 500,     // Longer warmup
    measureMemory: true,       // Track memory usage
    gc: true,                  // Force GC between tests
  }
);
```

## 🐛 Troubleshooting

### "Cannot find module" errors

```bash
npm install
# or
npm install --save-dev @types/node ts-node typescript
```

### Out of memory errors

Large benchmark runs may need more memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run bench:all
```

### Slow execution

First run includes JIT warmup. Subsequent runs are faster:

```bash
# Run twice and compare
npm run bench:streaming
npm run bench:streaming  # Will be faster
```

### Inconsistent results

Enable garbage collection and increase iterations:

```bash
node --expose-gc benchmarks.js
```

## 📚 Reference Documentation

### Performance Targets Source

Targets defined in `/workspaces/midstream/docs/IMPLEMENTATION_SUMMARY.md`:
- Section 2: Architecture & Technical Stack
- Section 3: Performance Metrics

### Integration Architecture

See `/workspaces/midstream/AIMDS/agentdb-integration/` for implementation details.

### AgentDB Documentation

Vector database features and configuration:
- Embedding storage and search
- HNSW indexing
- Quantization strategies
- RL plugin integration

## 🤝 Contributing

When adding benchmarks:

1. Follow existing naming conventions
2. Include warmup phase (100+ iterations)
3. Measure memory when relevant
4. Validate against specific targets
5. Document expected performance
6. Add regression tests for critical paths

## 📄 License

MIT

## 🙏 Acknowledgments

Built for the AgentDB + Midstreamer integration project.

---

**Last Updated**: 2025-10-27
**Version**: 1.0.0
**Maintainer**: Performance Analysis Agent
