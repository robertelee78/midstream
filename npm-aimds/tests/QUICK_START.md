# 🚀 Quick Start - AIMDS Test Suite

**One command to run all tests:**

```bash
./tests/run-all-tests.sh
```

---

## 📋 Quick Commands

### Run All Tests
```bash
cd /workspaces/midstream/npm-aimds
./tests/run-all-tests.sh
```

### Run Specific Test Suites
```bash
# Unit tests only
npx jest tests/quick-wins/ --silent

# Integration tests
npx jest tests/integration/ --silent

# Performance benchmarks
npx jest tests/benchmarks/ --silent

# With coverage
npx jest --coverage
```

### Run Individual Test Files
```bash
# Pattern Cache tests
npx jest tests/quick-wins/pattern-cache.test.js

# Parallel Detector tests
npx jest tests/quick-wins/parallel-detector.test.js

# Memory Pool tests
npx jest tests/quick-wins/memory-pool.test.js

# Batch API tests
npx jest tests/quick-wins/batch-api.test.js

# Vector Cache tests
npx jest tests/quick-wins/vector-cache.test.js
```

---

## 🎯 What Gets Tested

### 5 Quick-Win Optimizations
1. **Pattern Cache** - LRU cache with TTL
2. **Parallel Detector** - Multi-worker processing
3. **Memory Pool** - Buffer pooling & reuse
4. **Batch API** - Batch request processing
5. **Vector Cache** - Vector search caching

### Test Categories
- ✅ **Unit Tests** - Individual component testing
- ✅ **Integration Tests** - End-to-end workflows
- ✅ **Performance Benchmarks** - Validate speed targets
- ✅ **Load Tests** - Production stress testing (K6)

---

## 📊 Expected Results

### Coverage Target
- Statements: ≥90%
- Branches: ≥85%
- Functions: ≥90%
- Lines: ≥90%

### Performance Targets
- Pattern Cache: +50K req/s improvement
- Parallel Detection: 2-3x speedup
- Memory Pool: <5ms GC pauses
- Vector Cache: 60%+ hit rate
- Combined Throughput: 745K+ req/s

---

## 🔧 Load Testing (Optional)

### Prerequisites
```bash
# Install K6
# macOS:
brew install k6

# Linux:
wget -qO - https://dl.k6.io/key.gpg | sudo apt-key add -
sudo apt-add-repository "deb https://dl.k6.io/deb stable main"
sudo apt-get update
sudo apt-get install k6
```

### Run Load Tests
```bash
# Start your server first
npm start

# Then run load tests (in new terminal)
k6 run tests/load/k6-load-test.js
```

---

## 📁 Test Artifacts

After running tests, find reports here:

- **Coverage Report**: `coverage/index.html`
- **Test Report**: `test-report.html`
- **JUnit Results**: `test-results/junit.xml`

```bash
# View coverage report
open coverage/index.html
```

---

## ✅ Success Indicators

You should see:
- ✅ All tests passing
- ✅ Coverage ≥90%
- ✅ Performance benchmarks meeting targets
- ✅ Zero memory leaks detected
- ✅ Green output from test runner

---

## 🐛 Troubleshooting

### Tests Timing Out?
```bash
# Run with more time
npx jest --testTimeout=60000
```

### Want Verbose Output?
```bash
# Detailed logs
VERBOSE_TESTS=1 npm test
```

### Memory Leak Tests Not Working?
```bash
# Enable GC
node --expose-gc node_modules/.bin/jest
```

---

## 📚 More Information

- Full documentation: `tests/README.md`
- Test suite summary: `/workspaces/midstream/docs/testing/QUICK_WINS_TEST_SUITE_COMPLETE.md`

---

**That's it! Your comprehensive test suite is ready to run.** 🎉
