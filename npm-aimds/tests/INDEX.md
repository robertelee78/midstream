# AIMDS Test Suite Index

Quick reference guide to all test files and their contents.

## 📑 Quick Navigation

- [Configuration](#configuration)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [Performance Tests](#performance-tests)
- [Benchmarks](#benchmarks)
- [Running Tests](#running-tests)

---

## Configuration

### `jest.config.js`
Jest test framework configuration with:
- TypeScript support via ts-jest
- >98% coverage thresholds (enforced)
- Coverage reports in text, lcov, HTML, JSON formats
- Module path mapping for clean imports
- 30-second test timeout

### `setup.ts`
Global test setup and utilities:
- Environment variable configuration
- Global test utilities (`testUtils`)
- Mock console methods
- Cleanup hooks

### `package.json`
Test dependencies and npm scripts:
- Test runners (unit, integration, performance)
- Coverage generation
- Benchmark execution
- Watch mode

### `run-tests.sh`
Automated test runner script:
- Runs all test categories
- Generates coverage reports
- Validates coverage thresholds
- Executes benchmarks
- Provides summary statistics

---

## Unit Tests

### `unit/agentdb-client.test.ts` (618 lines, ~50 tests)

**Tests AgentDB Client for vector search and memory management**

#### Test Suites:
1. **Initialization**
   - HNSW index creation
   - Collection setup (threat_patterns, incidents, reflexion_memory)
   - QUIC synchronization configuration

2. **Vector Search**
   - Fast HNSW search (<2ms target)
   - Similarity threshold filtering
   - MMR diversity algorithm
   - Empty result handling
   - Threat level calculation

3. **Incident Storage**
   - Incident storage with embeddings
   - Threat pattern updates
   - ReflexionMemory integration
   - Causal link management

4. **Statistics and Monitoring**
   - Stats retrieval (incidents, patterns, memory usage)
   - Error handling

5. **Cleanup and Maintenance**
   - TTL-based cleanup
   - Graceful shutdown

6. **QUIC Synchronization**
   - Peer synchronization
   - Failure handling

7. **Edge Cases**
   - Malformed embeddings
   - Large embedding dimensions
   - Concurrent searches

### `unit/verifier.test.ts` (621 lines, ~40 tests)

**Tests lean-agentic Verifier for formal verification**

#### Test Suites:
1. **Initialization**
   - Engine initialization
   - Security axiom loading

2. **Policy Verification**
   - Hash-consing fast path (150x faster)
   - Dependent type checking
   - Rule evaluation by priority
   - Constraint checking
   - Warning vs error handling

3. **Theorem Proving**
   - Proof generation
   - Proof caching
   - Timeout handling
   - Dependency extraction

4. **Proof Certificate Verification**
   - Certificate validation
   - Hash verification
   - Error handling

5. **Cache Management**
   - Cache statistics
   - Cache clearing
   - Size limits

6. **Performance Tests**
   - Simple policy verification (<10ms)
   - Complex policy handling (<500ms)
   - Theorem proving speed

7. **Edge Cases**
   - Empty policies
   - Missing context
   - Malformed conditions
   - Concurrent verifications

### `unit/gateway-server.test.ts` (758 lines, ~60 tests)

**Tests Express API Gateway Server**

#### Test Suites:
1. **Initialization**
   - Parallel component initialization
   - Middleware configuration

2. **Health Check Endpoint**
   - Healthy status reporting
   - Component statistics
   - Failure detection

3. **Metrics Endpoint**
   - Prometheus metrics export

4. **Defense Endpoint - Fast Path**
   - Safe request processing (<10ms)
   - Low-threat fast path
   - Timing metadata

5. **Defense Endpoint - Deep Path**
   - High-risk verification (<520ms)
   - Proof certificate inclusion

6. **Request Validation**
   - Schema validation
   - Auto-generated request IDs
   - Timestamp population
   - IP capture

7. **Batch Defense Endpoint**
   - Parallel processing (1-100 requests)
   - Size validation
   - Efficiency testing

8. **Error Handling**
   - Fail-closed on errors
   - 404 handling
   - Global error handler

9. **Middleware**
   - Rate limiting
   - Compression
   - Security headers
   - Body size limits

10. **Graceful Shutdown**
    - Component cleanup
    - Connection handling
    - Timeout enforcement

---

## Integration Tests

### `integration/end-to-end.test.ts` (397 lines, ~30 tests)

**Tests complete request-to-response workflows**

#### Test Suites:
1. **Safe Request Flow**
   - Complete pipeline processing
   - Fast path execution
   - Incident storage

2. **Malicious Request Flow**
   - SQL injection detection
   - Shell injection detection
   - Prompt injection detection

3. **Deep Path Verification**
   - High-risk request handling
   - Proof certificate generation
   - Policy enforcement

4. **Performance Under Load**
   - Concurrent request handling
   - Mixed safe/malicious traffic

5. **Learning and Adaptation**
   - Pattern learning
   - Threat pattern updates

6. **Error Recovery**
   - Database error handling
   - Verification failure handling

7. **Real-world Scenarios**
   - Legitimate API usage
   - Credential stuffing detection
   - DDoS simulation

---

## Performance Tests

### `performance/detection-performance.test.ts` (376 lines, ~15 tests)

**Tests detection module performance**

#### Test Suites:
1. **Vector Search Performance**
   - Latency distribution (p50, p95, p99)
   - k=100 search performance
   - Concurrent load handling

2. **Detection Throughput**
   - >10,000 detections/sec target

3. **Memory Usage**
   - Stable memory under load
   - Cleanup efficiency

4. **Embedding Performance**
   - Various dimensions (128-1536d)
   - Sparse embedding handling

5. **Real-world Load Patterns**
   - Bursty traffic
   - Sustained load (10s @ 100 rps)

### `performance/verification-performance.test.ts` (408 lines, ~15 tests)

**Tests verification module performance**

#### Test Suites:
1. **Policy Verification Performance**
   - <500ms target validation
   - Hash-cons fast path (<1ms)
   - Complex policy handling

2. **Theorem Proving Performance**
   - Simple theorem proving (<100ms)
   - Proof caching effectiveness
   - Timeout handling

3. **Cache Performance**
   - >95% cache hit rate
   - Cache eviction efficiency

4. **Concurrent Verification**
   - Parallel verification (50+)
   - Mixed workload handling

5. **Memory Efficiency**
   - No leaks during sustained use
   - Cache cleanup

6. **Scalability Tests**
   - Linear scaling with policy complexity
   - High-frequency verification (50 rps)

---

## Benchmarks

### `benchmarks/comparison-bench.ts` (304 lines)

**Performance comparison and analysis suite**

#### Benchmark Suites:
1. **Vector Search Benchmark**
   - k=10 vs k=100 comparison
   - MMR diversity impact

2. **Policy Verification Benchmark**
   - Hash-cons vs dependent types vs theorem proving

3. **Complete Pipeline Benchmark**
   - Fast path vs deep path vs storage

4. **Memory Profiling**
   - 10K operation memory tracking
   - Growth analysis at checkpoints (1K, 5K, 10K)

5. **Latency Distribution Analysis**
   - 1000 iteration percentile calculation
   - Min, mean, max, p50, p75, p90, p95, p99, p99.9

---

## Running Tests

### Install Dependencies
```bash
cd tests
npm install
```

### Run Tests

#### All Tests
```bash
npm test
```

#### By Category
```bash
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:performance       # Performance tests
```

#### With Coverage
```bash
npm run test:coverage          # Generate coverage report
npm run test:coverage:report   # Open HTML report
```

#### Benchmarks
```bash
npm run benchmark              # Run all benchmarks
```

#### Watch Mode
```bash
npm run test:watch             # Run on file changes
```

#### CI Mode
```bash
npm run test:ci                # Optimized for CI
```

#### Automated Runner
```bash
./run-tests.sh                 # All tests + coverage + benchmarks
./run-tests.sh --coverage-only # Coverage only
./run-tests.sh --skip-benchmarks
```

---

## Test Data

### `fixtures/mock-data.ts` (544 lines)

Centralized test fixtures and helpers:
- Mock requests (safe, malicious, injection)
- Mock threat matches
- Mock security policies
- Mock configurations
- Helper functions

**Key Exports:**
- `mockSafeRequest`
- `mockMaliciousRequest`
- `mockPromptInjectionRequest`
- `mockDefaultPolicy`
- `mockStrictPolicy`
- `createMockRequest(overrides)`
- `createMockPolicy(overrides)`
- `generateMockEmbedding(seed, dim)`

---

## Documentation

### `README.md`
Comprehensive testing guide with:
- Test organization overview
- Running instructions
- Performance targets
- Coverage requirements
- Writing new tests
- Debugging guide

### `generate-report.ts`
Coverage report generator that creates:
- Markdown test reports
- Coverage statistics
- Visual coverage bars
- Pass/fail status

### `TEST_STATUS.md`
Complete test suite status including:
- Directory structure
- Test coverage details
- Performance targets
- Running instructions

### `TESTING_SUMMARY.md`
Executive summary with:
- Statistics and metrics
- File descriptions
- Performance validation
- Quick start guide

---

## Coverage Targets

All targets enforced in `jest.config.js`:
- **Statements**: ≥98%
- **Branches**: ≥98%
- **Functions**: ≥98%
- **Lines**: ≥98%

Tests fail if ANY metric drops below threshold.

---

## Performance Targets

| Component | Target | Tested |
|-----------|--------|--------|
| Vector Search | <2ms | ✅ |
| Detection | <10ms | ✅ |
| Verification | <500ms | ✅ |
| Deep Path | <520ms | ✅ |
| Response | <50ms | ✅ |
| Throughput | >10K/s | ✅ |

---

## File Statistics

| Category | Files | Lines | Tests |
|----------|-------|-------|-------|
| Configuration | 4 | ~300 | N/A |
| Fixtures | 1 | 544 | N/A |
| Unit Tests | 3 | 1,997 | ~150 |
| Integration | 1 | 397 | ~30 |
| Performance | 2 | 784 | ~30 |
| Benchmarks | 1 | 304 | N/A |
| Documentation | 4 | ~2,000 | N/A |
| **TOTAL** | **16** | **6,326+** | **210+** |

---

## Test Utilities

Available via `global.testUtils`:

```typescript
testUtils.waitFor(ms: number)                    // Async wait
testUtils.generateRequestId()                    // Mock request IDs
testUtils.generateEmbedding(dim?: number)        // Mock embeddings
testUtils.measurePerformance<T>(fn: () => Promise<T>)  // Timing
```

---

## Next Steps

1. ✅ **Created**: All test files
2. ✅ **Created**: Documentation
3. ✅ **Created**: Configuration
4. 🔄 **TODO**: Install dependencies (`npm install`)
5. 🔄 **TODO**: Run tests (`npm test`)
6. 🔄 **TODO**: Verify coverage (`npm run test:coverage`)

---

*For detailed information, see the comprehensive README.md*
