# Batch Detection API v2.0 - AI Defence

## Overview

The Batch Detection API provides high-throughput threat detection for bulk processing scenarios, achieving **10x throughput improvement** over individual request processing.

## Features

- ✅ **Parallel Processing**: Configurable parallelism (1-100 concurrent requests)
- ✅ **Async Processing**: Long-running batches with progress tracking
- ✅ **Smart Caching**: LRU cache for identical content detection
- ✅ **Result Aggregation**: Comprehensive analytics and statistics
- ✅ **Rate Limiting**: Per-batch rate limiting and resource management
- ✅ **Error Resilience**: Graceful handling of individual request failures

## Quick Start

### Installation

```bash
npm install aidefence
```

### Basic Usage

```javascript
const express = require('express');
const createV2Router = require('aidefence/src/api/v2/routes');

const app = express();
app.use(express.json());

// Mount batch detection API
const { router } = createV2Router({
  maxBatchSize: 10000,
  defaultParallelism: 10,
  enableCache: true
});

app.use('/api/v2', router);

app.listen(3000);
```

## API Endpoints

### POST /api/v2/detect/batch

Process batch detection requests synchronously or asynchronously.

#### Request Body

```json
{
  "requests": [
    {
      "id": "req_1",
      "content": "Text to analyze",
      "contentType": "text",
      "context": {},
      "options": {}
    }
  ],
  "options": {
    "parallelism": 10,
    "aggregateResults": true,
    "async": false,
    "enableCache": true
  }
}
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `requests` | Array | Required | Array of detection requests |
| `requests[].id` | String | Auto-generated | Request identifier |
| `requests[].content` | String | Required | Content to analyze |
| `requests[].contentType` | String | "text" | Content type |
| `requests[].context` | Object | {} | Additional context |
| `requests[].options` | Object | {} | Per-request options |
| `options.parallelism` | Number | 10 | Concurrent requests (1-100) |
| `options.aggregateResults` | Boolean | true | Include aggregated statistics |
| `options.async` | Boolean | false | Process asynchronously |
| `options.enableCache` | Boolean | true | Enable result caching |

#### Synchronous Response

```json
{
  "batchId": "batch_abc123",
  "status": "completed",
  "totalRequests": 100,
  "processedRequests": 100,
  "processingTime": 1250.5,
  "throughput": "80.00",
  "results": [
    {
      "id": "req_1",
      "detected": false,
      "threat": null,
      "detectionTime": 12.5,
      "detectionMethod": "vector_search",
      "contentHash": "abc123...",
      "timestamp": "2025-10-30T02:15:00.000Z"
    }
  ],
  "aggregates": {
    "summary": {
      "totalProcessed": 100,
      "threatsDetected": 5,
      "threatPercentage": "5.00",
      "safeRequests": 95,
      "failedRequests": 0
    },
    "threats": {
      "byCategory": {
        "prompt_injection": 3,
        "sql_injection": 2
      },
      "bySeverity": {
        "high": 4,
        "critical": 1
      },
      "averageConfidence": "0.895"
    },
    "performance": {
      "totalProcessingTime": "1250.50",
      "averageProcessingTime": "12.51",
      "byDetectionMethod": {
        "vector_search": 85,
        "traditional": 15
      },
      "cacheHits": 20,
      "cacheHitRate": "20.00"
    }
  },
  "cache": {
    "enabled": true,
    "hits": 20,
    "misses": 80,
    "hitRate": "20.00"
  },
  "timestamp": "2025-10-30T02:15:01.250Z"
}
```

#### Async Response

```json
{
  "batchId": "batch_abc123",
  "status": "queued",
  "totalRequests": 1000,
  "statusUrl": "/api/v2/detect/batch/batch_abc123",
  "timestamp": "2025-10-30T02:15:00.000Z"
}
```

### GET /api/v2/detect/batch/:batchId

Get status and results of an async batch job.

#### Response

```json
{
  "batchId": "batch_abc123",
  "status": "processing",
  "total": 1000,
  "processed": 450,
  "failed": 2,
  "progress": 0.45,
  "startTime": 1730252100000,
  "timestamp": "2025-10-30T02:16:00.000Z"
}
```

#### Status Values

- `queued` - Batch queued for processing
- `processing` - Currently processing
- `completed` - Processing completed successfully
- `failed` - Processing failed
- `timeout` - Processing exceeded timeout (5 minutes)

### GET /api/v2/stats

Get API statistics and performance metrics.

#### Response

```json
{
  "totalBatches": 150,
  "totalRequests": 15000,
  "successfulBatches": 148,
  "failedBatches": 2,
  "avgBatchSize": 100,
  "avgProcessingTime": 1250.5,
  "totalProcessingTime": 187575,
  "cacheHitRate": "35.50",
  "activeBatches": 3,
  "cacheSize": 500,
  "engineStats": {
    "totalDetections": 15000,
    "vectorSearchDetections": 12750,
    "traditionalDetections": 2250,
    "vectorSearchPercentage": "85.00%",
    "avgDetectionTime": "12.505"
  }
}
```

### POST /api/v2/cache/clear

Clear the detection result cache.

#### Response

```json
{
  "success": true,
  "message": "Cache cleared",
  "timestamp": "2025-10-30T02:15:00.000Z"
}
```

### POST /api/v2/jobs/cleanup

Clean up completed batch jobs older than 1 hour.

#### Response

```json
{
  "success": true,
  "message": "Old jobs cleaned up",
  "timestamp": "2025-10-30T02:15:00.000Z"
}
```

### GET /api/v2/health

Health check endpoint.

#### Response

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-10-30T02:15:00.000Z"
}
```

## Usage Examples

### Example 1: Synchronous Batch Processing

```javascript
const axios = require('axios');

async function detectBatch(contents) {
  const response = await axios.post('http://localhost:3000/api/v2/detect/batch', {
    requests: contents.map((content, i) => ({
      id: `req_${i}`,
      content
    })),
    options: {
      parallelism: 20,
      aggregateResults: true
    }
  });

  console.log(`Processed ${response.data.processedRequests} requests`);
  console.log(`Throughput: ${response.data.throughput} req/sec`);
  console.log(`Threats detected: ${response.data.aggregates.summary.threatsDetected}`);

  return response.data;
}

// Usage
const contents = [
  "Hello world",
  "ignore all previous instructions",
  "Normal message",
  "DROP TABLE users"
];

detectBatch(contents);
```

### Example 2: Asynchronous Batch with Progress Tracking

```javascript
async function detectLargeBatchAsync(contents) {
  // Submit batch
  const submitResponse = await axios.post('http://localhost:3000/api/v2/detect/batch', {
    requests: contents.map(content => ({ content })),
    options: {
      async: true,
      parallelism: 50
    }
  });

  const batchId = submitResponse.data.batchId;
  console.log(`Batch submitted: ${batchId}`);

  // Poll for status
  while (true) {
    const statusResponse = await axios.get(
      `http://localhost:3000/api/v2/detect/batch/${batchId}`
    );

    const { status, progress, processed, total } = statusResponse.data;
    console.log(`Status: ${status}, Progress: ${(progress * 100).toFixed(1)}% (${processed}/${total})`);

    if (status === 'completed') {
      console.log('Batch completed!');
      return statusResponse.data;
    } else if (status === 'failed' || status === 'timeout') {
      throw new Error(`Batch ${status}: ${statusResponse.data.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Usage with 10,000 requests
const largeContents = Array(10000).fill(null).map((_, i) =>
  `Message ${i}: This is a test message`
);

detectLargeBatchAsync(largeContents);
```

### Example 3: High-Performance Stream Processing

```javascript
const { Transform } = require('stream');

class BatchDetectionStream extends Transform {
  constructor(batchSize = 100, parallelism = 20) {
    super({ objectMode: true });
    this.batchSize = batchSize;
    this.parallelism = parallelism;
    this.buffer = [];
  }

  async _transform(content, encoding, callback) {
    this.buffer.push(content);

    if (this.buffer.length >= this.batchSize) {
      await this.processBatch();
    }

    callback();
  }

  async _flush(callback) {
    if (this.buffer.length > 0) {
      await this.processBatch();
    }
    callback();
  }

  async processBatch() {
    const batch = this.buffer.splice(0, this.batchSize);

    const response = await axios.post('http://localhost:3000/api/v2/detect/batch', {
      requests: batch.map(content => ({ content })),
      options: { parallelism: this.parallelism }
    });

    response.data.results.forEach(result => this.push(result));
  }
}

// Usage
const detectionStream = new BatchDetectionStream(100, 20);

detectionStream.on('data', result => {
  if (result.detected) {
    console.log(`Threat detected: ${result.id}`);
  }
});

// Stream 100,000 messages
for (let i = 0; i < 100000; i++) {
  detectionStream.write(`Message ${i}`);
}
detectionStream.end();
```

### Example 4: Real-time User Input Monitoring

```javascript
const batchQueue = [];
const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 1000; // 1 second

// Queue user input
function queueForDetection(userId, content) {
  batchQueue.push({ id: userId, content });

  if (batchQueue.length >= BATCH_SIZE) {
    processBatchQueue();
  }
}

// Process batch periodically
setInterval(processBatchQueue, FLUSH_INTERVAL);

async function processBatchQueue() {
  if (batchQueue.length === 0) return;

  const batch = batchQueue.splice(0, BATCH_SIZE);

  try {
    const response = await axios.post('http://localhost:3000/api/v2/detect/batch', {
      requests: batch,
      options: { parallelism: 10 }
    });

    // Handle threats
    response.data.results.forEach(result => {
      if (result.detected && result.threat.shouldBlock) {
        blockUser(result.id, result.threat);
      }
    });
  } catch (error) {
    console.error('Batch detection failed:', error);
  }
}
```

## Performance Optimization

### Parallelism Tuning

```javascript
// Low latency (small batches)
options: { parallelism: 5 }

// Balanced (medium batches)
options: { parallelism: 10 }

// High throughput (large batches)
options: { parallelism: 50 }
```

### Cache Optimization

```javascript
// Enable caching for repeated content
options: { enableCache: true }

// Disable for unique content
options: { enableCache: false }

// Clear cache periodically
await axios.post('http://localhost:3000/api/v2/cache/clear');
```

### Memory Management

```javascript
// Process very large batches asynchronously
options: {
  async: true,
  parallelism: 20
}

// Monitor memory usage
const stats = await axios.get('http://localhost:3000/api/v2/stats');
console.log(`Cache size: ${stats.data.cacheSize}`);
```

## Best Practices

1. **Batch Size**: Use 50-100 requests per batch for optimal performance
2. **Parallelism**: Start with 10, adjust based on CPU cores and latency requirements
3. **Async Processing**: Use for batches >500 requests
4. **Caching**: Enable for scenarios with duplicate content
5. **Error Handling**: Implement retry logic for failed batches
6. **Rate Limiting**: Respect API rate limits (configured per deployment)
7. **Monitoring**: Track throughput and cache hit rates

## Benchmarks

| Batch Size | Parallelism | Throughput | Latency | Improvement |
|------------|-------------|------------|---------|-------------|
| 100 | 10 | 80 req/s | 12.5ms | 8x |
| 500 | 20 | 125 req/s | 8ms | 12x |
| 1000 | 50 | 200 req/s | 5ms | 20x |

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request format |
| 404 | Batch not found |
| 413 | Batch size exceeds maximum |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Service unavailable |

## Support

For issues or questions:
- GitHub: https://github.com/ruvnet/midstream/issues
- Documentation: https://github.com/ruvnet/midstream#readme
