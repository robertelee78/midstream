/**
 * K6 Load Testing Scenarios
 * Tests system under various load patterns
 *
 * Usage:
 *   k6 run tests/load/k6-load-test.js
 *   k6 run --vus 100 --duration 5m tests/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const detectionLatency = new Trend('detection_latency');
const successfulDetections = new Counter('successful_detections');
const failedDetections = new Counter('failed_detections');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to sustained load
    ramp_up_sustained: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },   // Ramp up to 100 users
        { duration: '5m', target: 100 },   // Stay at 100 for 5 minutes
        { duration: '1m', target: 200 },   // Ramp up to 200
        { duration: '3m', target: 200 },   // Stay at 200 for 3 minutes
        { duration: '1m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '30s',
    },

    // Scenario 2: Spike testing
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Normal load
        { duration: '10s', target: 500 },  // Sudden spike
        { duration: '1m', target: 500 },   // Maintain spike
        { duration: '10s', target: 50 },   // Back to normal
        { duration: '30s', target: 0 },    // Ramp down
      ],
      startTime: '12m', // Start after sustained test
    },

    // Scenario 3: Stress testing (find breaking point)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 400 },
        { duration: '2m', target: 800 },
        { duration: '2m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      startTime: '15m', // Start after spike test
    },
  },

  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<100', 'p(99)<200'], // 95% < 100ms, 99% < 200ms
    'detection_latency': ['p(95)<50', 'p(99)<100'],  // Detection-specific

    // Error rate thresholds
    'errors': ['rate<0.01'], // Error rate < 1%
    'http_req_failed': ['rate<0.01'], // Failed requests < 1%

    // Throughput thresholds
    'http_reqs': ['rate>1000'], // > 1000 req/s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data generators
function generateSQLInjection() {
  const patterns = [
    "SELECT * FROM users WHERE id = '1' OR '1'='1'",
    "admin'--",
    "1' UNION SELECT NULL, username, password FROM users--",
    "'; DROP TABLE users; --",
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function generateXSSPayload() {
  const patterns = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(document.cookie)',
    '<svg onload=alert(1)>',
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function generateNormalContent() {
  const patterns = [
    'Hello, this is a normal message',
    'SELECT id, name FROM products WHERE category = ?',
    'User registration successful',
    'Processing payment for order #12345',
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function generateTestContent() {
  const rand = Math.random();
  if (rand < 0.3) return generateSQLInjection(); // 30% malicious SQL
  if (rand < 0.5) return generateXSSPayload();   // 20% malicious XSS
  return generateNormalContent();                // 50% normal
}

// Main test function
export default function() {
  group('Single Detection API', () => {
    const payload = JSON.stringify({
      content: generateTestContent(),
      contentType: 'text',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { name: 'SingleDetection' },
    };

    const startTime = new Date().getTime();
    const response = http.post(`${BASE_URL}/api/v2/detect`, payload, params);
    const endTime = new Date().getTime();

    // Record metrics
    detectionLatency.add(endTime - startTime);

    // Checks
    const checkResult = check(response, {
      'status is 200': (r) => r.status === 200,
      'response has detected field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('detected');
        } catch (e) {
          return false;
        }
      },
      'response time < 100ms': (r) => r.timings.duration < 100,
    });

    if (checkResult) {
      successfulDetections.add(1);
    } else {
      failedDetections.add(1);
      errorRate.add(1);
    }
  });

  group('Batch Detection API', () => {
    // Test batch processing every 10th request
    if (Math.random() < 0.1) {
      const batchSize = Math.floor(Math.random() * 50) + 10; // 10-60 items
      const batch = Array.from({ length: batchSize }, () => ({
        content: generateTestContent(),
        contentType: 'text',
      }));

      const payload = JSON.stringify({ requests: batch });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'BatchDetection' },
      };

      const response = http.post(`${BASE_URL}/api/v2/detect/batch`, payload, params);

      check(response, {
        'batch status is 200': (r) => r.status === 200,
        'batch processed all items': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.results && body.results.length === batchSize;
          } catch (e) {
            return false;
          }
        },
        'batch response time reasonable': (r) => r.timings.duration < batchSize * 10,
      });
    }
  });

  group('Health Check', () => {
    // Check health every 20th request
    if (Math.random() < 0.05) {
      const response = http.get(`${BASE_URL}/health`);

      check(response, {
        'health check is 200': (r) => r.status === 200,
        'health check fast': (r) => r.timings.duration < 10,
      });
    }
  });

  // Simulate realistic user behavior (some delay between requests)
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// Setup function (runs once per VU)
export function setup() {
  console.log('🚀 Starting load test...');
  console.log(`   Target: ${BASE_URL}`);

  // Warm-up request
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    console.error('❌ Health check failed during setup!');
  }

  return { startTime: new Date().toISOString() };
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log('\n📊 Load Test Summary');
  console.log(`   Started: ${data.startTime}`);
  console.log(`   Ended: ${new Date().toISOString()}`);
  console.log('\n   Check detailed metrics above ⬆️');
}

// Handle summary for custom reporting
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: '  ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': htmlReport(data),
  };
}

// Generate text summary
function textSummary(data, options) {
  let output = '\n╔════════════════════════════════════════════════╗\n';
  output += '║        LOAD TEST RESULTS SUMMARY             ║\n';
  output += '╚════════════════════════════════════════════════╝\n\n';

  // Requests
  const httpReqs = data.metrics.http_reqs.values.count;
  const httpReqRate = data.metrics.http_reqs.values.rate;
  output += `📈 Total Requests: ${httpReqs}\n`;
  output += `⚡ Request Rate: ${httpReqRate.toFixed(2)} req/s\n\n`;

  // Latency
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  output += `⏱️  Response Time:\n`;
  output += `   p95: ${p95.toFixed(2)}ms\n`;
  output += `   p99: ${p99.toFixed(2)}ms\n\n`;

  // Errors
  const errorRate = data.metrics.errors ? data.metrics.errors.values.rate : 0;
  output += `❌ Error Rate: ${(errorRate * 100).toFixed(2)}%\n\n`;

  // Success metrics
  const successful = data.metrics.successful_detections?.values.count || 0;
  const failed = data.metrics.failed_detections?.values.count || 0;
  output += `✅ Successful: ${successful}\n`;
  output += `❌ Failed: ${failed}\n\n`;

  // Pass/Fail
  const passed = p95 < 100 && p99 < 200 && errorRate < 0.01 && httpReqRate > 1000;
  if (passed) {
    output += '🎉 TEST PASSED - All thresholds met!\n';
  } else {
    output += '⚠️  TEST FAILED - Some thresholds not met\n';
  }

  return output;
}

// Generate HTML report
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
    .metric h3 { margin: 0 0 10px 0; color: #555; }
    .metric p { margin: 5px 0; font-size: 18px; }
    .pass { color: #4CAF50; font-weight: bold; }
    .fail { color: #f44336; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Load Test Report</h1>
    <div class="metric">
      <h3>Request Metrics</h3>
      <p>Total Requests: <strong>${data.metrics.http_reqs.values.count}</strong></p>
      <p>Request Rate: <strong>${data.metrics.http_reqs.values.rate.toFixed(2)} req/s</strong></p>
    </div>
    <div class="metric">
      <h3>Response Time</h3>
      <p>p95: <strong>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</strong></p>
      <p>p99: <strong>${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</strong></p>
    </div>
    <div class="metric">
      <h3>Error Rate</h3>
      <p class="${data.metrics.errors?.values.rate < 0.01 ? 'pass' : 'fail'}">
        ${((data.metrics.errors?.values.rate || 0) * 100).toFixed(2)}%
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
