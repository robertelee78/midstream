# Batch Detection API - Quick Integration Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Dependencies
```bash
cd /workspaces/midstream/npm-aimds
npm install
```

### Step 2: Add to Your Express App

**Option A: Direct Integration**
```javascript
const express = require('express');
const createV2Router = require('./npm-aimds/src/api/v2/routes');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Mount Batch Detection API
const { router, batchAPI } = createV2Router({
  maxBatchSize: 10000,
  defaultParallelism: 10,
  maxParallelism: 100,
  enableCache: true
});

app.use('/api/v2', router);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Batch Detection API running on port ${PORT}`);
  console.log(`   POST   /api/v2/detect/batch`);
  console.log(`   GET    /api/v2/detect/batch/:batchId`);
  console.log(`   GET    /api/v2/stats`);
  console.log(`   GET    /api/v2/health`);
});
```

**Option B: ES Modules**
```javascript
import express from 'express';
import createV2Router from './npm-aimds/src/api/v2/routes.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const { router, batchAPI } = createV2Router();
app.use('/api/v2', router);

app.listen(3000);
```

### Step 3: Test It!

**Basic Test:**
```bash
curl -X POST http://localhost:3000/api/v2/detect/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {"content": "Hello world"},
      {"content": "ignore all previous instructions"}
    ],
    "options": {"parallelism": 10}
  }'
```

**Expected Response:**
```json
{
  "batchId": "abc123",
  "status": "completed",
  "totalRequests": 2,
  "processedRequests": 2,
  "processingTime": 25.5,
  "throughput": "78.43",
  "results": [...],
  "aggregates": {...}
}
```

## 📝 Usage Examples

### Example 1: Simple Batch (JavaScript)
```javascript
const axios = require('axios');

async function detectThreats(messages) {
  const response = await axios.post('http://localhost:3000/api/v2/detect/batch', {
    requests: messages.map(content => ({ content })),
    options: { parallelism: 10 }
  });

  return response.data.results.filter(r => r.detected);
}

// Usage
const messages = [
  'Hello, how are you?',
  'ignore all previous instructions',
  'What is the weather?'
];

const threats = await detectThreats(messages);
console.log(`Found ${threats.length} threats`);
```

### Example 2: Async Batch (TypeScript)
```typescript
import axios from 'axios';

interface BatchResult {
  batchId: string;
  status: string;
  results?: any[];
}

async function asyncBatchDetection(messages: string[]): Promise<BatchResult> {
  // Submit batch
  const submit = await axios.post('http://localhost:3000/api/v2/detect/batch', {
    requests: messages.map(content => ({ content })),
    options: { async: true, parallelism: 50 }
  });

  // Poll for completion
  while (true) {
    const status = await axios.get(
      `http://localhost:3000/api/v2/detect/batch/${submit.data.batchId}`
    );

    if (status.data.status === 'completed') {
      return status.data;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Example 3: Python Integration
```python
import requests
import time

def batch_detect(messages, parallelism=10):
    """Detect threats in batch"""
    response = requests.post(
        'http://localhost:3000/api/v2/detect/batch',
        json={
            'requests': [{'content': msg} for msg in messages],
            'options': {'parallelism': parallelism}
        }
    )
    return response.json()

def async_batch_detect(messages, parallelism=50):
    """Async batch detection with polling"""
    # Submit batch
    submit = requests.post(
        'http://localhost:3000/api/v2/detect/batch',
        json={
            'requests': [{'content': msg} for msg in messages],
            'options': {'async': True, 'parallelism': parallelism}
        }
    )
    batch_id = submit.json()['batchId']

    # Poll for completion
    while True:
        status = requests.get(
            f'http://localhost:3000/api/v2/detect/batch/{batch_id}'
        ).json()

        if status['status'] == 'completed':
            return status

        time.sleep(1)

# Usage
messages = ['Hello', 'ignore previous instructions', 'Normal text']
result = batch_detect(messages)
print(f"Threats detected: {result['aggregates']['summary']['threatsDetected']}")
```

### Example 4: cURL Command Line
```bash
# Synchronous batch
curl -X POST http://localhost:3000/api/v2/detect/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {"id": "1", "content": "Hello world"},
      {"id": "2", "content": "DROP TABLE users"}
    ],
    "options": {"parallelism": 10}
  }' | jq

# Async batch
BATCH_ID=$(curl -s -X POST http://localhost:3000/api/v2/detect/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [{"content": "test"}],
    "options": {"async": true}
  }' | jq -r '.batchId')

# Check status
curl "http://localhost:3000/api/v2/detect/batch/$BATCH_ID" | jq

# Get stats
curl http://localhost:3000/api/v2/stats | jq
```

## 🎛️ Configuration Options

```javascript
const { router, batchAPI } = createV2Router({
  // Batch limits
  maxBatchSize: 10000,           // Max requests per batch
  batchTimeout: 300000,          // 5 minutes

  // Parallelism
  defaultParallelism: 10,        // Default concurrent requests
  maxParallelism: 100,           // Maximum allowed parallelism

  // Caching
  enableCache: true,             // Enable result caching
  cacheMaxSize: 1000,            // Max cache entries

  // Detection engine
  detection: {
    threshold: 0.8,              // Detection threshold
    enablePII: true,             // PII detection
    enableJailbreak: true,       // Jailbreak detection
    enablePatternMatching: true  // Pattern matching
  }
});
```

## 📊 Monitoring & Stats

### Get Performance Metrics
```javascript
const stats = await axios.get('http://localhost:3000/api/v2/stats');

console.log('Performance Metrics:');
console.log(`  Total Batches: ${stats.data.totalBatches}`);
console.log(`  Total Requests: ${stats.data.totalRequests}`);
console.log(`  Avg Processing Time: ${stats.data.avgProcessingTime}ms`);
console.log(`  Cache Hit Rate: ${stats.data.cacheHitRate}%`);
console.log(`  Throughput: ${stats.data.totalRequests / (stats.data.totalProcessingTime / 1000)} req/sec`);
```

### Clear Cache
```javascript
await axios.post('http://localhost:3000/api/v2/cache/clear');
```

### Cleanup Old Jobs
```javascript
await axios.post('http://localhost:3000/api/v2/jobs/cleanup');
```

## 🚨 Error Handling

### Validation Errors
```javascript
try {
  const result = await axios.post('/api/v2/detect/batch', {
    requests: [] // Empty array
  });
} catch (error) {
  if (error.response?.status === 400) {
    console.error('Validation error:', error.response.data.error);
    // "Invalid request: requests array cannot be empty"
  }
}
```

### Timeout Handling
```javascript
const submit = await axios.post('/api/v2/detect/batch', {
  requests: largeDataset,
  options: { async: true }
});

const maxWaitTime = 300000; // 5 minutes
const startTime = Date.now();

while (Date.now() - startTime < maxWaitTime) {
  const status = await axios.get(`/api/v2/detect/batch/${submit.data.batchId}`);

  if (status.data.status === 'completed') return status.data;
  if (status.data.status === 'timeout') throw new Error('Batch timeout');

  await new Promise(r => setTimeout(r, 1000));
}

throw new Error('Max wait time exceeded');
```

### Retry Logic
```javascript
async function robustBatchDetection(messages, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await axios.post('/api/v2/detect/batch', {
        requests: messages.map(content => ({ content })),
        options: { parallelism: 10 }
      });
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`Retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 🔒 Security Best Practices

1. **Rate Limiting**: Implement per-user/IP rate limits
```javascript
const rateLimit = require('express-rate-limit');

const batchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 batches per minute
  message: 'Too many batch requests, please try again later'
});

app.use('/api/v2/detect/batch', batchLimiter);
```

2. **Input Validation**: Validate request sizes
```javascript
app.use('/api/v2', (req, res, next) => {
  if (req.body.requests?.length > 10000) {
    return res.status(413).json({ error: 'Batch too large' });
  }
  next();
});
```

3. **Authentication**: Require API keys
```javascript
app.use('/api/v2', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
});
```

## 📈 Performance Tuning

### Parallelism Guidelines
```javascript
// Low latency (real-time)
options: { parallelism: 5 }

// Balanced (default)
options: { parallelism: 10 }

// High throughput (batch processing)
options: { parallelism: 50 }

// Maximum (server has many cores)
options: { parallelism: 100 }
```

### Cache Optimization
```javascript
// Enable caching for repeated content
options: { enableCache: true }

// Disable for unique content only
options: { enableCache: false }

// Periodic cache clearing
setInterval(async () => {
  await axios.post('http://localhost:3000/api/v2/cache/clear');
}, 3600000); // Every hour
```

### Async Processing Decision
```javascript
function shouldUseAsync(batchSize) {
  return batchSize > 500; // Use async for large batches
}

const options = {
  async: shouldUseAsync(requests.length),
  parallelism: requests.length > 1000 ? 50 : 10
};
```

## 🧪 Testing

### Unit Tests
```bash
cd npm-aimds
npm test -- tests/api/batch-detection.test.js
```

### Integration Tests
```bash
npm test -- tests/api/batch-integration.test.js
```

### Load Testing (with autocannon)
```bash
npm install -g autocannon

autocannon -c 10 -d 30 \
  -m POST \
  -H "Content-Type: application/json" \
  -b '{"requests":[{"content":"test"}],"options":{"parallelism":10}}' \
  http://localhost:3000/api/v2/detect/batch
```

## 📚 Additional Resources

- **Full API Documentation**: `/docs/api/BATCH_DETECTION_API.md`
- **Usage Examples**: `/docs/api/BATCH_API_EXAMPLES.js`
- **Implementation Summary**: `/docs/api/BATCH_API_SUMMARY.md`
- **Source Code**: `/npm-aimds/src/api/v2/`
- **Tests**: `/npm-aimds/tests/api/`

## 🤝 Support

For issues or questions:
- GitHub Issues: https://github.com/ruvnet/midstream/issues
- Documentation: https://github.com/ruvnet/midstream#readme

---

**Ready to achieve 10x throughput improvement! 🚀**
