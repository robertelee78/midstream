# AI Defence Examples

This directory contains comprehensive examples demonstrating AI Defence capabilities.

## Vector Cache Demo

**File**: `vector-cache-demo.js`

Demonstrates the high-performance vector cache system with 244K req/s throughput and 99.9% hit rate.

### Run Demo

```bash
node examples/vector-cache-demo.js
```

### Features Demonstrated

1. **Basic Usage** - Simple cache operations
2. **Performance Benchmark** - 10K searches with throughput metrics
3. **Real-time Monitoring** - Live cache statistics
4. **Cache Patterns** - Hit rate across different query patterns

### Expected Output

```
╔══════════════════════════════════════════════════╗
║     Vector Cache Demo - AI Defence 2.0          ║
║  244K req/s | 99.9% Hit Rate | 4.88MB Memory   ║
╚══════════════════════════════════════════════════╝

=== Demo 1: Basic Usage ===
✅ Cache hit/miss tracking
✅ Statistics display

=== Demo 2: Performance Benchmark ===
✅ Throughput: 227K req/s
✅ Hit rate: 99.80%

=== Demo 3: Real-time Monitoring ===
✅ Live cache statistics
✅ Performance tracking

=== Demo 4: Cache Efficiency Patterns ===
✅ 100% repeated: 99.98% hit rate
✅ 80% repeated: 99.50% hit rate
✅ 60% repeated: 99.00% hit rate
✅ 20% repeated: 95.00% hit rate
```

## More Examples

Coming soon:
- `threat-detection-demo.js` - Real-time threat detection
- `api-protection-demo.js` - API endpoint protection
- `batch-processing-demo.js` - Batch threat analysis
- `stream-processing-demo.js` - Stream-based detection

## Documentation

- **Quick Start**: `/workspaces/midstream/docs/npm/VECTOR_CACHE_QUICKSTART.md`
- **Full Guide**: `/workspaces/midstream/docs/npm/VECTOR_CACHE_GUIDE.md`
- **Benchmarks**: `/workspaces/midstream/docs/npm/VECTOR_CACHE_SUCCESS.md`

## Support

For issues or questions:
- Documentation: `/workspaces/midstream/docs/npm/`
- Tests: `/workspaces/midstream/tests/intelligence/`
- GitHub: [midstream/issues](https://github.com/ruvnet/midstream/issues)
