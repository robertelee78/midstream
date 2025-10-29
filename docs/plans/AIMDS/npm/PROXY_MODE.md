# AIMDS Proxy Mode Design

## Overview

Proxy mode enables AIMDS to act as a transparent security layer between clients and LLM APIs, providing real-time threat detection, sanitization, and response without requiring application code changes.

## Architecture

```
┌─────────────┐         ┌──────────────────────────┐         ┌─────────────┐
│   Client    │────────▶│      AIMDS Proxy         │────────▶│   LLM API   │
│ Application │         │                          │         │   Server    │
│             │◀────────│  • Detection             │◀────────│             │
└─────────────┘         │  • Sanitization          │         └─────────────┘
                        │  • Response              │
                        │  • Audit Logging         │
                        │  • Metrics               │
                        └──────────────────────────┘
```

## Core Features

### 1. Request Interception

**Intercepts all LLM requests** and applies security checks:
- Prompt injection detection
- PII detection and sanitization
- Jailbreak attempt detection
- Behavioral analysis
- Rate limiting

### 2. Response Filtering

**Inspects LLM responses** for:
- Data leakage
- PII in responses
- Policy violations
- Unexpected outputs

### 3. Automatic Mitigation

**Applies mitigations automatically:**
- Input sanitization
- Request rejection
- Context injection
- Response redaction
- Rollback to safe state

### 4. Comprehensive Logging

**Logs everything for audit:**
- All requests and responses
- Detected threats
- Applied mitigations
- Performance metrics
- User sessions

## Implementation

### Basic Proxy Server

```javascript
// proxy.js
const { createProxy } = require('aimds');

const proxy = createProxy({
  // Proxy configuration
  port: 8080,
  target: process.env.LLM_API_URL || 'http://localhost:8000',

  // Security modules
  detect: true,
  analyze: true,
  verify: false,
  respond: true,

  // Response strategy
  strategy: 'balanced',  // passive | balanced | aggressive
  autoRespond: true,

  // TLS/SSL
  tls: {
    enabled: process.env.TLS_ENABLED === 'true',
    cert: process.env.TLS_CERT,
    key: process.env.TLS_KEY
  },

  // Logging and audit
  audit: {
    enabled: true,
    path: './logs/proxy-audit.log',
    format: 'json'
  },

  // Metrics
  prometheus: {
    enabled: true,
    port: 9090
  }
});

// Start proxy
(async () => {
  await proxy.start();
  console.log(`AIMDS Proxy listening on port ${proxy.config.port}`);
  console.log(`Forwarding to ${proxy.config.target}`);
})();
```

### Advanced Configuration

```javascript
const { createProxy, Detector, Analyzer, Responder } = require('aimds');

// Create custom security components
const detector = new Detector({
  threshold: 0.85,
  mode: 'thorough',
  pii: true,
  patterns: './custom-patterns/'
});

const analyzer = new Analyzer({
  sensitivity: 'high',
  baseline: './baseline.json',
  learning: true
});

const responder = new Responder({
  strategy: 'aggressive',
  learning: true
});

// Create proxy with custom components
const proxy = createProxy({
  port: 8080,
  target: process.env.LLM_API_URL,

  // Inject custom components
  detector,
  analyzer,
  responder,

  // Request preprocessing
  preprocessRequest: async (req) => {
    // Add custom headers
    req.headers['X-Proxy-Version'] = '1.0.0';
    req.headers['X-Proxy-Time'] = new Date().toISOString();

    // Extract authentication
    const auth = extractAuth(req);
    req.aimds = { userId: auth?.userId, sessionId: auth?.sessionId };

    return req;
  },

  // Request modification
  modifyRequest: async (req) => {
    // Detect threats in request body
    if (req.body && req.body.prompt) {
      const result = await detector.detect(req.body.prompt);

      if (result.status === 'threat') {
        // Log threat
        console.warn('Threat detected:', {
          userId: req.aimds.userId,
          threat: result.findings[0],
          prompt: req.body.prompt
        });

        // Respond based on strategy
        const response = await responder.respond({
          type: result.findings[0].type,
          input: req.body.prompt,
          confidence: result.confidence,
          user: req.aimds.userId
        });

        if (response.action === 'reject') {
          throw new ProxyError('Threat detected: Request rejected', {
            status: 400,
            details: result.findings
          });
        }

        if (response.action === 'sanitize') {
          req.body.prompt = response.sanitized;
          req.headers['X-AIMDS-Sanitized'] = 'true';
        }

        if (response.action === 'context-injection') {
          req.body.prompt = response.augmented;
          req.headers['X-AIMDS-Context-Injected'] = 'true';
        }
      }

      // Analyze request patterns (async, doesn't block)
      analyzer.analyze({
        timestamp: Date.now(),
        userId: req.aimds.userId,
        sessionId: req.aimds.sessionId,
        endpoint: req.path,
        threat: result.status === 'threat',
        confidence: result.confidence
      }).catch(console.error);
    }

    return req;
  },

  // Response modification
  modifyResponse: async (res, req) => {
    // Check response for PII leakage
    if (res.body && res.body.text) {
      const result = await detector.detect(res.body.text, { pii: true });

      if (result.findings.some(f => f.type === 'pii')) {
        console.warn('PII detected in response:', {
          userId: req.aimds.userId,
          piiTypes: result.findings.map(f => f.pattern)
        });

        // Redact PII
        res.body.text = result.sanitized;
        res.headers['X-AIMDS-Redacted'] = 'true';
      }
    }

    // Add security headers
    res.headers['X-Content-Type-Options'] = 'nosniff';
    res.headers['X-Frame-Options'] = 'DENY';
    res.headers['X-XSS-Protection'] = '1; mode=block';

    return res;
  },

  // Error handling
  onError: async (err, req, res) => {
    console.error('Proxy error:', err);

    // Log to audit trail
    await logAuditEvent({
      type: 'error',
      userId: req.aimds?.userId,
      error: err.message,
      timestamp: Date.now()
    });

    // Send error response
    res.status(err.status || 500).json({
      error: 'Security check failed',
      message: err.message,
      requestId: req.aimds?.sessionId
    });
  },

  // Request timeout
  timeout: 30000,  // 30 seconds

  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMs: 60000,  // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => req.aimds?.userId || req.ip
  },

  // Circuit breaker
  circuitBreaker: {
    enabled: true,
    threshold: 10,  // Open after 10 failures
    timeout: 60000,  // Reset after 1 minute
    onOpen: () => console.error('Circuit breaker opened')
  }
});

// Custom error class
class ProxyError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.status = options.status || 500;
    this.details = options.details;
  }
}
```

## Proxy Strategies

### Passive Strategy

**Characteristics:**
- Logs threats but doesn't block
- Minimal impact on requests
- Best for monitoring and learning

```javascript
const proxy = createProxy({
  port: 8080,
  target: 'http://localhost:8000',
  strategy: 'passive',
  modifyRequest: async (req) => {
    const result = await detector.detect(req.body?.prompt);
    if (result.status === 'threat') {
      // Log but don't modify
      console.warn('Threat detected (passive mode):', result);
      req.headers['X-AIMDS-Threat-Detected'] = 'true';
      req.headers['X-AIMDS-Threat-Type'] = result.findings[0].type;
    }
    return req;
  }
});
```

### Balanced Strategy

**Characteristics:**
- Sanitizes threats when possible
- Rejects only high-confidence threats
- Good for production

```javascript
const proxy = createProxy({
  port: 8080,
  target: 'http://localhost:8000',
  strategy: 'balanced',
  modifyRequest: async (req) => {
    const result = await detector.detect(req.body?.prompt);

    if (result.status === 'threat') {
      if (result.confidence > 0.95) {
        // High confidence: reject
        throw new ProxyError('Threat detected', { status: 400 });
      } else if (result.confidence > 0.8) {
        // Medium confidence: sanitize
        const response = await responder.respond(result);
        req.body.prompt = response.sanitized;
      } else {
        // Low confidence: log only
        console.warn('Possible threat:', result);
      }
    }

    return req;
  }
});
```

### Aggressive Strategy

**Characteristics:**
- Rejects any suspicious input
- Maximum security, may have false positives
- Best for high-security environments

```javascript
const proxy = createProxy({
  port: 8080,
  target: 'http://localhost:8000',
  strategy: 'aggressive',
  modifyRequest: async (req) => {
    const result = await detector.detect(req.body?.prompt);

    if (result.status !== 'safe') {
      // Reject anything that's not definitively safe
      throw new ProxyError('Suspicious input detected', {
        status: 400,
        details: result.findings
      });
    }

    return req;
  }
});
```

## Advanced Features

### 1. Session Tracking

```javascript
const sessions = new Map();

const proxy = createProxy({
  port: 8080,
  target: 'http://localhost:8000',

  preprocessRequest: async (req) => {
    const sessionId = req.headers['x-session-id'] || generateSessionId();

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        requests: [],
        threats: []
      });
    }

    const session = sessions.get(sessionId);
    session.requests.push({
      timestamp: Date.now(),
      path: req.path,
      method: req.method
    });

    req.aimds = { session };
    return req;
  },

  modifyRequest: async (req) => {
    const result = await detector.detect(req.body?.prompt);

    if (result.status === 'threat') {
      req.aimds.session.threats.push({
        timestamp: Date.now(),
        type: result.findings[0].type,
        confidence: result.confidence
      });

      // Block session if too many threats
      if (req.aimds.session.threats.length > 5) {
        throw new ProxyError('Session blocked: Too many threats');
      }
    }

    return req;
  }
});
```

### 2. Dynamic Rate Limiting

```javascript
const rateLimits = new Map();

const proxy = createProxy({
  port: 8080,
  target: 'http://localhost:8000',

  modifyRequest: async (req) => {
    const userId = req.aimds?.userId || req.ip;

    // Get or create rate limit state
    if (!rateLimits.has(userId)) {
      rateLimits.set(userId, {
        limit: 100,  // Default: 100 req/min
        threats: 0
      });
    }

    const state = rateLimits.get(userId);

    // Detect threats
    const result = await detector.detect(req.body?.prompt);

    if (result.status === 'threat') {
      state.threats++;

      // Reduce rate limit after threats
      if (state.threats > 3) {
        state.limit = Math.max(10, state.limit / 2);
        console.warn(`Rate limit reduced for ${userId}: ${state.limit} req/min`);
      }
    }

    // Check rate limit
    const count = await redis.incr(`rate:${userId}`);
    if (count === 1) {
      await redis.expire(`rate:${userId}`, 60);
    }

    if (count > state.limit) {
      throw new ProxyError('Rate limit exceeded', { status: 429 });
    }

    return req;
  }
});
```

### 3. A/B Testing and Rollout

```javascript
const proxy = createProxy({
  port: 8080,
  target: 'http://localhost:8000',

  modifyRequest: async (req) => {
    const userId = req.aimds?.userId;

    // A/B test: 50% get aggressive protection
    const variant = hashUserId(userId) % 2 === 0 ? 'aggressive' : 'balanced';

    req.headers['X-AIMDS-Variant'] = variant;

    const result = await detector.detect(req.body?.prompt);

    if (result.status === 'threat') {
      if (variant === 'aggressive') {
        throw new ProxyError('Threat detected (aggressive)');
      } else {
        // Sanitize in balanced mode
        const response = await responder.respond(result);
        req.body.prompt = response.sanitized;
      }
    }

    return req;
  }
});
```

### 4. Multi-Target Routing

```javascript
const proxy = createProxy({
  port: 8080,

  // Dynamic target selection
  getTarget: async (req) => {
    // Route to different LLM backends based on request
    if (req.path.startsWith('/api/gpt4')) {
      return 'http://openai-api:8000';
    } else if (req.path.startsWith('/api/claude')) {
      return 'http://anthropic-api:8000';
    } else {
      return 'http://local-llm:8000';
    }
  },

  modifyRequest: async (req) => {
    // Apply consistent security regardless of backend
    const result = await detector.detect(req.body?.prompt);

    if (result.status === 'threat') {
      const response = await responder.respond(result);
      req.body.prompt = response.sanitized;
    }

    return req;
  }
});
```

## Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application
COPY . .

# Expose ports
EXPOSE 8080 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Run proxy
CMD ["node", "proxy.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  aimds-proxy:
    build: .
    ports:
      - "8080:8080"  # Proxy port
      - "9090:9090"  # Metrics port
    environment:
      - LLM_API_URL=http://llm-api:8000
      - AIMDS_STRATEGY=balanced
      - AIMDS_AUTO_RESPOND=true
      - REDIS_URL=redis://redis:6379
    depends_on:
      - llm-api
      - redis
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config
    restart: unless-stopped

  llm-api:
    image: your-llm-api:latest
    ports:
      - "8000:8000"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aimds-proxy
  labels:
    app: aimds-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: aimds-proxy
  template:
    metadata:
      labels:
        app: aimds-proxy
    spec:
      containers:
      - name: aimds-proxy
        image: your-registry/aimds-proxy:1.0.0
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: LLM_API_URL
          value: "http://llm-api-service:8000"
        - name: AIMDS_STRATEGY
          value: "balanced"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: aimds-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: aimds-proxy-service
spec:
  selector:
    app: aimds-proxy
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
  type: LoadBalancer
```

## Monitoring and Observability

### Health Check Endpoint

```javascript
// healthcheck.js
const http = require('http');

const options = {
  host: 'localhost',
  port: 8080,
  path: '/health',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => process.exit(1));
req.end();
```

### Metrics Collection

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#prometheus-metrics) for full Prometheus integration details.

## Best Practices

1. **Always log threats** even in passive mode
2. **Monitor false positive rates** and adjust thresholds
3. **Use session tracking** for behavioral analysis
4. **Enable circuit breakers** for reliability
5. **Test with realistic traffic** before production
6. **Set up alerts** for anomalies
7. **Regular baseline updates** for accuracy
8. **Document your strategy** and configuration

## Security Considerations

1. **TLS/SSL**: Always use HTTPS in production
2. **Authentication**: Validate client authentication
3. **Rate limiting**: Prevent DoS attacks
4. **Audit logging**: Log all security events
5. **Secret management**: Use environment variables or secret stores
6. **Network isolation**: Run proxy in secure network
7. **Regular updates**: Keep AIMDS and dependencies updated

## Troubleshooting

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed troubleshooting steps.

## Next Steps

1. Deploy proxy in staging environment
2. Monitor metrics and adjust thresholds
3. Collect baseline data for 1-2 weeks
4. Review false positive/negative rates
5. Gradually roll out to production
6. Set up alerting and monitoring dashboards
