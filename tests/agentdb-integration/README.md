# AgentDB + Midstreamer Integration Tests

Comprehensive test suite for the AgentDB + Midstreamer integration with >90% coverage.

## 📁 Test Structure

```
tests/agentdb-integration/
├── unit/                           # Unit tests
│   ├── embedding-bridge.test.ts    # Embedding methods & caching
│   ├── adaptive-learning.test.ts   # RL agent & optimization
│   └── memory-anomaly-detector.test.ts # Pattern matching & learning
├── integration/                    # Integration tests
│   └── end-to-end-streaming.test.ts # Full pipeline tests
├── benchmarks/                     # Performance benchmarks
│   └── performance.bench.ts        # Latency & throughput tests
├── fixtures/                       # Test utilities
│   └── test-data-generator.ts      # Synthetic data generation
├── jest.config.js                  # Jest configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Test dependencies
└── README.md                       # This file
```

## 🚀 Quick Start

### Installation

```bash
cd tests/agentdb-integration
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Performance benchmarks
npm run test:bench

# Watch mode for development
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

## 📊 Test Coverage

### Coverage Targets (>90%)

- **Statements**: 90%+
- **Branches**: 90%+
- **Functions**: 90%+
- **Lines**: 90%+

### Current Coverage

Run `npm run test:coverage` to see current coverage metrics.

## 🧪 Test Categories

### 1. Unit Tests

#### Embedding Bridge (`unit/embedding-bridge.test.ts`)

Tests all 4 embedding methods:
- **Statistical**: Basic statistical features (mean, std, etc.)
- **DTW**: Dynamic Time Warping-based embeddings
- **Wavelet**: Frequency domain embeddings
- **Hybrid**: Combined approach (recommended)

Features tested:
- ✅ Embedding generation (384 dimensions)
- ✅ Pattern storage and retrieval
- ✅ Semantic search (cosine similarity)
- ✅ Caching performance
- ✅ Latency targets (<10ms)

#### Adaptive Learning Engine (`unit/adaptive-learning.test.ts`)

Tests reinforcement learning components:
- ✅ Agent initialization (Actor-Critic, Q-Learning, SARSA, DQN)
- ✅ State/action space validation
- ✅ Reward function calculation
- ✅ Convergence behavior
- ✅ Auto-tuning mode

Features tested:
- ✅ Parameter optimization
- ✅ Exploration/exploitation balance
- ✅ Multi-objective rewards
- ✅ Training statistics
- ✅ Convergence detection

#### Memory-Augmented Detector (`unit/memory-anomaly-detector.test.ts`)

Tests anomaly detection with historical context:
- ✅ Pattern initialization
- ✅ Semantic pattern matching
- ✅ Confidence calculation
- ✅ Learning from feedback
- ✅ Historical pattern database

Features tested:
- ✅ Anomaly detection accuracy
- ✅ Similar pattern retrieval
- ✅ Confidence-based detection
- ✅ Feedback learning loop
- ✅ Performance with large pattern DB

### 2. Integration Tests

#### End-to-End Streaming (`integration/end-to-end-streaming.test.ts`)

Tests complete streaming pipeline:
- ✅ Real-time data processing
- ✅ AgentDB pattern storage
- ✅ Adaptive parameter optimization
- ✅ Memory-augmented detection
- ✅ High-throughput streaming

Features tested:
- ✅ Full pipeline integration
- ✅ Anomaly detection in stream
- ✅ Pattern storage/retrieval
- ✅ Adaptive learning loop
- ✅ Performance under load
- ✅ Error handling & recovery

### 3. Performance Benchmarks

#### Performance Benchmarks (`benchmarks/performance.bench.ts`)

Comprehensive performance testing:

**Embedding Latency**:
- Target: <10ms per embedding
- Tests: Statistical, DTW, Hybrid, Wavelet
- Cached: <1ms

**Search Latency**:
- Target: <15ms per search (k=5)
- Tests: Various k values, concurrent search
- Database sizes: 100-10K vectors

**Throughput**:
- Embedding: >10K ops/sec
- Search: >5K ops/sec
- End-to-end: >5K events/sec

**Scaling Tests**:
- Sequence length scaling
- Database size scaling
- Concurrent load testing
- Memory efficiency

## 🎯 Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Embedding Latency | <10ms | Run tests to measure |
| Cached Embedding | <1ms | Run tests to measure |
| Search Latency (k=5) | <15ms | Run tests to measure |
| Search Latency (k=50) | <20ms | Run tests to measure |
| Embedding Throughput | >10K/sec | Run tests to measure |
| Search Throughput | >5K/sec | Run tests to measure |
| E2E Pipeline | >5K events/sec | Run tests to measure |

## 🧰 Test Utilities

### Test Data Generator (`fixtures/test-data-generator.ts`)

Provides synthetic data generation:

```typescript
import {
  generateSineWave,
  generateRandomWalk,
  generateCPUUsagePattern,
  generateAnomalySequence,
  generateSimilarPatterns,
  EXAMPLE_SEQUENCES
} from './fixtures/test-data-generator';

// Generate sine wave
const sine = generateSineWave({
  length: 100,
  frequency: 0.1,
  amplitude: 50,
  noise: 2
});

// Generate CPU usage pattern
const cpu = generateCPUUsagePattern(500);

// Generate sequence with anomaly
const { data, anomalyIndices } = generateAnomalySequence(200, {
  position: 100,
  magnitude: 50,
  duration: 5,
  type: 'spike'
});

// Generate similar patterns
const variations = generateSimilarPatterns(basePattern, 10, 5);
```

## 📈 Running Benchmarks

```bash
# Run all benchmarks
npm run test:bench

# Run with detailed output
npm test -- benchmarks/ --verbose

# Run specific benchmark
npm test -- benchmarks/performance.bench.ts
```

Benchmark results will show:
- Total operations
- Total time
- Average latency
- Throughput (ops/sec)
- Percentiles (P50, P95, P99)

## 🐛 Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test file
npm test -- embedding-bridge.test.ts

# Run specific test case
npm test -- -t "should generate embeddings"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🔄 Continuous Integration

For CI environments:

```bash
npm run test:ci
```

This command:
- Runs in CI mode (no watch)
- Generates coverage reports
- Uses limited workers for stability
- Produces machine-readable output

## 📝 Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { generateCPUUsagePattern } from '../fixtures/test-data-generator';

describe('My Component', () => {
  let component: MyComponent;

  beforeEach(async () => {
    component = new MyComponent();
    await component.initialize();
  });

  describe('Feature', () => {
    it('should do something', async () => {
      const result = await component.doSomething();
      expect(result).toBeDefined();
    });

    it('should handle edge cases', async () => {
      await expect(component.invalidOperation()).rejects.toThrow();
    });
  });
});
```

### Best Practices

1. **Use descriptive test names**: Clearly state what is being tested
2. **Test edge cases**: Empty inputs, nulls, large values
3. **Mock external dependencies**: Use mocks for AgentDB, file system, etc.
4. **Measure performance**: Use `performance.now()` for timing tests
5. **Generate synthetic data**: Use test-data-generator utilities
6. **Clean up resources**: Use `afterEach`/`afterAll` for cleanup
7. **Assertions**: Be specific with expectations

## 🎓 Example Test Patterns

### Testing Async Functions

```typescript
it('should process async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

### Testing Error Cases

```typescript
it('should throw on invalid input', async () => {
  await expect(function(invalid)).rejects.toThrow('Error message');
});
```

### Testing Performance

```typescript
it('should complete within time limit', async () => {
  const start = performance.now();
  await operation();
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100); // <100ms
});
```

### Testing With Test Data

```typescript
it('should detect anomaly', async () => {
  const { data, anomalyIndices } = generateAnomalySequence(100, {
    position: 50,
    magnitude: 50,
    type: 'spike'
  });

  const result = await detector.detect(data);
  expect(result.isAnomaly).toBe(true);
});
```

## 🚦 CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tests/agentdb-integration && npm install
      - run: cd tests/agentdb-integration && npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./tests/agentdb-integration/coverage/coverage-final.json
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [AgentDB Documentation](../../../plans/agentdb/)
- [Midstreamer Documentation](../../../README.md)
- [Integration Plan](../../../plans/agentdb/integration-plan.md)
- [Quick Start Guide](../../../plans/agentdb/examples/quick-start.md)

## 🤝 Contributing

When adding new tests:

1. Follow existing test structure
2. Maintain >90% coverage
3. Document complex test cases
4. Add performance benchmarks for critical paths
5. Update this README with new test categories

## 📊 Test Results

Run tests and store results:

```bash
npm run test:coverage
npx claude-flow@alpha hooks post-task --task-id "agentdb-integration-tests"
```

Results will be stored in Claude Flow memory at:
- Key: `agentdb-integration/tests/results`
- Namespace: `coordination`

## ❓ FAQ

**Q: Tests are failing, what should I check?**
A: Verify Node.js version (>=18), run `npm install`, check for TypeScript errors.

**Q: How do I run a single test?**
A: Use `npm test -- -t "test name"` or `npm test -- path/to/test.ts`

**Q: Coverage is below 90%, what should I do?**
A: Run `npm run test:coverage`, open `coverage/lcov-report/index.html`, add tests for uncovered lines.

**Q: Benchmarks are failing performance targets?**
A: Check system resources, run on dedicated hardware, or adjust targets in test files.

**Q: How do I add a new test suite?**
A: Create new `.test.ts` file in appropriate directory, follow existing patterns, update README.

## 📞 Support

For issues or questions:
- File an issue on GitHub
- Check integration documentation
- Review test examples in this directory

---

**Happy Testing! 🎉**
