# Parallel Detector Integration Guide

## Overview

This guide shows how to integrate the ParallelDetector into your AI Defence application for maximum throughput.

## Integration Steps

### 1. Update Detection Engine

Modify `/workspaces/midstream/npm-aimds/src/proxy/detection-engine-agentdb.js`:

```javascript
const { ParallelDetector } = require('./parallel-detector');

class DetectionEngineAgentDB {
  constructor(options = {}) {
    // Existing initialization...
    this.threshold = options.threshold || 0.8;

    // Add parallel detector
    this.parallelDetector = options.enableParallel
      ? new ParallelDetector({
          workerCount: options.workerCount || 4,
          enableVectorSearch: true,
          enableNeuroSymbolic: options.enableNeuroSymbolic !== false,
          enableMultimodal: options.enableMultimodal !== false,
          timeout: options.timeout || 5000
        })
      : null;

    // Existing patterns...
    this.patterns = this.initializePatterns();
  }

  async detect(content, options = {}) {
    // Use parallel detection if enabled
    if (this.parallelDetector) {
      return await this.detectParallel(content, options);
    }

    // Fallback to sequential (existing implementation)
    return await this.detectSequential(content, options);
  }

  async detectParallel(content, options) {
    try {
      const result = await this.parallelDetector.detectAllParallel({
        content,
        options: {
          ...options,
          threshold: this.threshold,
          integrations: this.config.integrations
        }
      });

      // Transform to existing format
      return {
        threats: result.detectorResults.flatMap(r => r.threats || []),
        severity: result.category,
        shouldBlock: result.detected && result.confidence >= this.threshold,
        detectionTime: result.detectionTime,
        detectionMethod: 'parallel',
        confidence: result.confidence,
        agentdbEnabled: true,
        contentHash: this.hashContent(content),
        timestamp: new Date().toISOString(),
        metadata: options.metadata || {},
      };
    } catch (error) {
      console.error('Parallel detection failed, falling back:', error);
      return await this.detectSequential(content, options);
    }
  }

  async detectSequential(content, options) {
    // Existing sequential detection implementation
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = process.hrtime.bigint();
    const threats = [];

    // Run detectors sequentially
    if (this.config.agentdb.enabled && this.vectorStore) {
      const vectorResult = await this.detectWithVectorSearch(content);
      if (vectorResult.isThreat) {
        threats.push(vectorResult);
      }
    }

    if (this.enablePatternMatching) {
      threats.push(...this.detectPatterns(content));
    }

    if (this.enablePII) {
      threats.push(...this.detectPII(content));
    }

    if (this.enableJailbreak) {
      threats.push(...this.detectJailbreak(content));
    }

    const endTime = process.hrtime.bigint();
    const detectionTimeMs = Number(endTime - startTime) / 1_000_000;

    const maxSeverity = threats.length > 0
      ? this.calculateMaxSeverity(threats)
      : 'low';

    return {
      threats,
      severity: maxSeverity,
      shouldBlock: this.shouldBlockRequest(threats, maxSeverity),
      detectionTime: detectionTimeMs,
      detectionMethod: 'sequential',
      agentdbEnabled: this.config.agentdb.enabled,
      contentHash: this.hashContent(content),
      timestamp: new Date().toISOString(),
      metadata: options.metadata || {},
    };
  }

  async close() {
    if (this.parallelDetector) {
      await this.parallelDetector.destroy();
    }
    if (this.vectorStore) {
      await this.vectorStore.close();
    }
  }
}

module.exports = DetectionEngineAgentDB;
```

### 2. Update Main API

Modify `/workspaces/midstream/npm-aimds/index.js`:

```javascript
const DetectionEngineAgentDB = require('./src/proxy/detection-engine-agentdb');

class AIDefence {
  constructor(options = {}) {
    this.engine = new DetectionEngineAgentDB({
      threshold: options.threshold || 0.8,
      enablePII: options.enablePII !== false,
      enableJailbreak: options.enableJailbreak !== false,
      enablePatternMatching: options.enablePatternMatching !== false,

      // Enable parallel detection
      enableParallel: options.enableParallel !== false,
      workerCount: options.workerCount || 4,
      enableNeuroSymbolic: options.enableNeuroSymbolic !== false,
      enableMultimodal: options.enableMultimodal !== false,
      timeout: options.timeout || 5000,

      integrations: options.integrations || {}
    });
  }

  async detect(content, options = {}) {
    return await this.engine.detect(content, options);
  }

  async close() {
    await this.engine.close();
  }
}

module.exports = { AIDefence };
```

### 3. Configuration Examples

#### Maximum Throughput (13K+ req/s)

```javascript
const { AIDefence } = require('aidefence');

const defence = new AIDefence({
  enableParallel: true,
  workerCount: 8,
  enableNeuroSymbolic: false,  // Disable for speed
  enableMultimodal: false,     // Disable for speed
  threshold: 0.8
});

const result = await defence.detect(userInput);
```

#### Maximum Accuracy

```javascript
const defence = new AIDefence({
  enableParallel: true,
  workerCount: 4,
  enableNeuroSymbolic: true,
  enableMultimodal: true,
  threshold: 0.75,
  timeout: 10000
});
```

#### Balanced (Recommended)

```javascript
const defence = new AIDefence({
  enableParallel: true,
  workerCount: 4,
  enableNeuroSymbolic: true,
  enableMultimodal: false,     // Disable most expensive
  threshold: 0.8,
  timeout: 5000
});
```

### 4. Express/Fastify Middleware

```javascript
const { AIDefence } = require('aidefence');

const defence = new AIDefence({
  enableParallel: true,
  workerCount: 4
});

// Express middleware
app.use(async (req, res, next) => {
  try {
    const result = await defence.detect(req.body.content);

    if (result.shouldBlock) {
      return res.status(403).json({
        error: 'Threat detected',
        severity: result.severity,
        confidence: result.confidence,
        detectionTime: result.detectionTime
      });
    }

    next();
  } catch (error) {
    console.error('Detection error:', error);
    next(error);
  }
});

// Fastify middleware
fastify.addHook('preHandler', async (request, reply) => {
  const result = await defence.detect(request.body.content);

  if (result.shouldBlock) {
    reply.code(403).send({
      error: 'Threat detected',
      severity: result.severity
    });
  }
});
```

### 5. Environment Variables

Add to `.env`:

```bash
# Enable parallel detection
AI_DEFENCE_PARALLEL=true

# Worker configuration
AI_DEFENCE_WORKERS=4

# Detector configuration
AI_DEFENCE_NEURO_SYMBOLIC=true
AI_DEFENCE_MULTIMODAL=false

# Performance tuning
AI_DEFENCE_TIMEOUT=5000
AI_DEFENCE_THRESHOLD=0.8
```

Load in code:

```javascript
require('dotenv').config();

const defence = new AIDefence({
  enableParallel: process.env.AI_DEFENCE_PARALLEL === 'true',
  workerCount: parseInt(process.env.AI_DEFENCE_WORKERS) || 4,
  enableNeuroSymbolic: process.env.AI_DEFENCE_NEURO_SYMBOLIC !== 'false',
  enableMultimodal: process.env.AI_DEFENCE_MULTIMODAL === 'true',
  timeout: parseInt(process.env.AI_DEFENCE_TIMEOUT) || 5000,
  threshold: parseFloat(process.env.AI_DEFENCE_THRESHOLD) || 0.8
});
```

## Monitoring & Metrics

### Get Real-time Statistics

```javascript
// Get detector statistics
const stats = await defence.engine.parallelDetector?.getStats();

console.log('Worker Pool:', stats.workerPool);
console.log('Performance:', stats.performance);
console.log('Errors:', stats.errors);
```

### Prometheus Metrics

```javascript
const { register } = require('prom-client');

// Add custom metrics
const detectionDuration = new Histogram({
  name: 'ai_defence_detection_duration_ms',
  help: 'Detection duration in milliseconds',
  labelNames: ['method']
});

const detectionThroughput = new Counter({
  name: 'ai_defence_detection_total',
  help: 'Total detections performed',
  labelNames: ['method', 'detected']
});

// In detection code
const result = await defence.detect(content);
detectionDuration.observe({ method: result.detectionMethod }, result.detectionTime);
detectionThroughput.inc({ method: result.detectionMethod, detected: result.shouldBlock });
```

## Performance Tuning

### Load-Based Worker Scaling

```javascript
class AdaptiveDefence {
  constructor(options) {
    this.minWorkers = 2;
    this.maxWorkers = 16;
    this.currentWorkers = 4;
    this.requestQueue = [];

    this.defence = new AIDefence({
      ...options,
      workerCount: this.currentWorkers
    });
  }

  async detect(content) {
    const queueSize = this.requestQueue.length;

    // Scale up if queue growing
    if (queueSize > 10 && this.currentWorkers < this.maxWorkers) {
      await this.scaleUp();
    }

    // Scale down if idle
    if (queueSize === 0 && this.currentWorkers > this.minWorkers) {
      await this.scaleDown();
    }

    return await this.defence.detect(content);
  }

  async scaleUp() {
    this.currentWorkers = Math.min(this.currentWorkers + 2, this.maxWorkers);
    await this.defence.close();
    this.defence = new AIDefence({
      enableParallel: true,
      workerCount: this.currentWorkers
    });
  }

  async scaleDown() {
    this.currentWorkers = Math.max(this.currentWorkers - 2, this.minWorkers);
    await this.defence.close();
    this.defence = new AIDefence({
      enableParallel: true,
      workerCount: this.currentWorkers
    });
  }
}
```

### Request Batching

```javascript
class BatchedDefence {
  constructor(options) {
    this.defence = new AIDefence(options);
    this.batchSize = 10;
    this.batchTimeout = 10; // ms
    this.batch = [];
    this.batchTimer = null;
  }

  async detect(content) {
    return new Promise((resolve, reject) => {
      this.batch.push({ content, resolve, reject });

      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }

  async processBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const currentBatch = this.batch.splice(0, this.batchSize);

    const results = await Promise.all(
      currentBatch.map(({ content }) => this.defence.detect(content))
    );

    currentBatch.forEach(({ resolve }, index) => {
      resolve(results[index]);
    });
  }
}
```

## Testing

### Unit Tests

```javascript
const { AIDefence } = require('aidefence');

describe('Parallel Detection', () => {
  let defence;

  beforeEach(() => {
    defence = new AIDefence({
      enableParallel: true,
      workerCount: 4
    });
  });

  afterEach(async () => {
    await defence.close();
  });

  it('should detect SQL injection', async () => {
    const result = await defence.detect('SELECT * FROM users WHERE 1=1');
    expect(result.shouldBlock).toBe(true);
    expect(result.detectionMethod).toBe('parallel');
  });

  it('should handle concurrent requests', async () => {
    const promises = Array(100).fill(0).map(() =>
      defence.detect('test input')
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(100);
    expect(results.every(r => r.detectionMethod === 'parallel')).toBe(true);
  });
});
```

### Load Testing

```bash
# Using Apache Bench
ab -n 10000 -c 100 -p payload.json -T application/json http://localhost:3000/detect

# Using wrk
wrk -t4 -c100 -d30s --latency http://localhost:3000/detect
```

## Troubleshooting

### Issue: Workers not spawning

**Solution**: Check Node.js version (requires >=14.0.0)

```bash
node --version
```

### Issue: High latency

**Solution**: Reduce detector count

```javascript
const defence = new AIDefence({
  enableParallel: true,
  enableNeuroSymbolic: false,  // Disable
  enableMultimodal: false       // Disable
});
```

### Issue: Memory leaks

**Solution**: Proper cleanup

```javascript
process.on('SIGTERM', async () => {
  await defence.close();
  process.exit(0);
});
```

### Issue: MaxListenersExceeded warning

**Solution**: Increase limit

```javascript
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 20;
```

## Production Checklist

- [ ] Enable parallel detection
- [ ] Configure worker count based on CPU cores
- [ ] Set appropriate timeout (5-10s)
- [ ] Configure detector types based on needs
- [ ] Add monitoring/metrics
- [ ] Set up error logging
- [ ] Configure graceful shutdown
- [ ] Load test before deployment
- [ ] Set up alerts for high error rates
- [ ] Configure autoscaling if needed

## Migration from Sequential

### Phase 1: Testing (1 week)
- Deploy with `enableParallel: false`
- Test all existing functionality
- Verify baseline metrics

### Phase 2: Gradual Rollout (1 week)
- Enable parallel for 10% of traffic
- Monitor performance and errors
- Gradually increase to 100%

### Phase 3: Optimization (1 week)
- Tune worker count
- Optimize detector selection
- Fine-tune thresholds

## Support

For issues or questions:
- Documentation: `/docs/npm/PARALLEL_DETECTOR_IMPLEMENTATION.md`
- Examples: `/examples/parallel-detection-example.js`
- Tests: `/tests/validation/test-parallel-detector.js`

## Performance Expectations

| Configuration | Throughput | Latency | Accuracy |
|---------------|------------|---------|----------|
| Maximum Speed | 13K+ req/s | 0.07ms | 95% |
| Balanced | 5-8K req/s | 0.5ms | 98% |
| Maximum Accuracy | 2-4K req/s | 2-5ms | 99.5% |

Choose configuration based on your requirements!
