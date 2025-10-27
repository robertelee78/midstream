# AIMDS Test Suite

Comprehensive test suite for the AIMDS npm package with >98% code coverage.

## 📋 Test Organization

### Unit Tests (`tests/unit/`)
- **agentdb-client.test.ts** - AgentDB vector search, HNSW indexing, QUIC sync
- **verifier.test.ts** - lean-agentic verification, hash-consing, theorem proving
- **gateway-server.test.ts** - Express server, API endpoints, middleware

### Integration Tests (`tests/integration/`)
- **end-to-end.test.ts** - Complete request-response workflows
- Tests fast path (<10ms) and deep path (<520ms) scenarios
- Real-world attack detection patterns

### Performance Tests (`tests/performance/`)
- **detection-performance.test.ts** - Vector search latency and throughput
- **verification-performance.test.ts** - Policy verification performance
- Targets: Detection <10ms, Verification <500ms, Combined <520ms

### Benchmarks (`benchmarks/`)
- **comparison-bench.ts** - Comprehensive performance comparisons
- **Memory profiling and latency distribution analysis

## 🚀 Running Tests

### All Tests
```bash
npm test
```

### By Category
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:performance   # Performance tests only
```

### With Coverage
```bash
npm run test:coverage      # Generate coverage report
npm run test:coverage:report  # Open HTML coverage report
```

### Benchmarks
```bash
npm run benchmark          # Run all benchmarks
npm run benchmark:vector   # Vector search benchmarks only
npm run benchmark:verification  # Verification benchmarks only
```

### Watch Mode
```bash
npm run test:watch         # Run tests on file changes
```

### CI Mode
```bash
npm run test:ci            # Optimized for CI environments
```

## 📊 Performance Targets

| Component | Target | Test Coverage |
|-----------|--------|---------------|
| Vector Search | <2ms | ✅ |
| Detection (Fast Path) | <10ms | ✅ |
| Verification | <500ms | ✅ |
| Deep Path Combined | <520ms | ✅ |
| Response | <50ms | ✅ |
| Throughput | >10,000 req/s | ✅ |

## 📈 Coverage Requirements

The test suite enforces >98% coverage across:
- **Statements**: 98%+
- **Branches**: 98%+
- **Functions**: 98%+
- **Lines**: 98%+

## 🧪 Test Structure

Each test file follows this pattern:

```typescript
describe('Component', () => {
  beforeAll(async () => {
    // Setup once for all tests
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Feature', () => {
    test('should do something', async () => {
      // Arrange
      const input = createMockInput();

      // Act
      const result = await component.method(input);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

## 🔧 Mock Data

All test fixtures are centralized in `tests/fixtures/mock-data.ts`:
- Mock requests (safe, malicious, prompt injection)
- Mock policies (default, strict)
- Mock threat matches and embeddings
- Configuration mocks
- Helper functions

## 📦 Dependencies

- **jest**: Test framework
- **ts-jest**: TypeScript support for Jest
- **supertest**: HTTP integration testing
- **benchmark**: Performance benchmarking
- All types for TypeScript support

## 🐛 Debugging Tests

### Run specific test file
```bash
npm test -- agentdb-client.test.ts
```

### Run specific test case
```bash
npm test -- -t "should perform fast vector search"
```

### Enable verbose output
```bash
npm test -- --verbose
```

### Debug with VSCode
Add breakpoints and use the Jest debug configuration.

## 📝 Writing New Tests

1. Create test file in appropriate directory
2. Import fixtures from `tests/fixtures/mock-data.ts`
3. Mock external dependencies
4. Follow AAA pattern (Arrange, Act, Assert)
5. Include performance assertions where relevant
6. Add to coverage thresholds

Example:
```typescript
import { mockSafeRequest } from '../fixtures/mock-data';

describe('NewFeature', () => {
  test('should process request quickly', async () => {
    // Arrange
    const input = mockSafeRequest;

    // Act
    const { result, duration } = await testUtils.measurePerformance(
      () => feature.process(input)
    );

    // Assert
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(10); // Performance target
  });
});
```

## 🎯 Coverage Reports

After running tests with coverage:
- **Text**: Displayed in terminal
- **LCOV**: `coverage/lcov.info`
- **HTML**: `coverage/lcov-report/index.html`
- **JSON**: `coverage/coverage-summary.json`

## ⚡ Performance Testing Guidelines

1. Use `testUtils.measurePerformance()` for timing
2. Run performance tests with sufficient iterations (100+)
3. Calculate percentiles (p50, p95, p99) for latency
4. Test under concurrent load
5. Monitor memory usage
6. Compare against targets

## 🔒 Security Testing

Tests include scenarios for:
- SQL injection detection
- Shell injection detection
- Prompt injection detection
- Credential stuffing
- DDoS simulation
- Rate limiting

## 🌐 CI/CD Integration

The test suite is optimized for CI environments:
- Parallel test execution
- Configurable workers
- Fail-fast on errors
- Coverage reports in multiple formats
- Performance regression detection

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [AIMDS Main Documentation](../../AIMDS/README.md)
- [Performance Benchmarks](../../AIMDS/RUST_TEST_REPORT.md)

## 🤝 Contributing

When adding tests:
1. Maintain >98% coverage
2. Follow existing patterns
3. Include performance assertions
4. Update this README if adding new categories
5. Run full test suite before committing

---

**Note**: Some tests use mocked dependencies (agentdb, lean-agentic) to ensure consistent, fast test execution. Integration tests use real implementations where possible.
