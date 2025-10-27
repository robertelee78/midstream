# AIMDS HTTP/3 Proxy Documentation

## Overview

The AIMDS proxy provides real-time LLM API protection with:

- **Real-time Detection**: Pattern matching, PII detection, jailbreak detection (<10ms)
- **Auto-Mitigation**: Three strategies (passive, balanced, aggressive)
- **Multi-Provider**: OpenAI, Anthropic, Google, AWS Bedrock
- **Audit Logging**: Comprehensive security audit trails
- **Metrics**: Prometheus-compatible performance metrics
- **Streaming**: Support for request/response streaming
- **Connection Pooling**: Optimized HTTP connection management

## Quick Start

### Basic Usage

```javascript
const { createProxy } = require('aimds/proxy');
const express = require('express');

const app = express();
app.use(express.json());

// Create proxy middleware
const aimdsProxy = createProxy({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  strategy: 'balanced',
  detection: { threshold: 0.8 }
});

// Protect your endpoint
app.post('/v1/chat/completions', aimdsProxy);

app.listen(3000);
```

### Standalone Server

```javascript
const { createProxyServer } = require('aimds/proxy');

const server = createProxyServer({
  port: 8080,
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  strategy: 'balanced',
});
```

## Configuration

### Provider Configuration

#### OpenAI

```javascript
createProxy({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  endpoint: 'https://api.openai.com/v1', // Optional custom endpoint
});
```

#### Anthropic

```javascript
createProxy({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

#### Google (Gemini)

```javascript
createProxy({
  provider: 'google',
  apiKey: process.env.GOOGLE_API_KEY,
});
```

#### AWS Bedrock

```javascript
createProxy({
  provider: 'bedrock',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

### Detection Configuration

```javascript
{
  detection: {
    threshold: 0.8,              // Threat detection threshold (0-1)
    enablePII: true,             // Enable PII detection
    enableJailbreak: true,       // Enable jailbreak detection
    enablePatternMatching: true, // Enable pattern matching
  }
}
```

### Mitigation Strategies

#### Passive Strategy

Logs threats but doesn't modify requests/responses.

```javascript
{ strategy: 'passive' }
```

**Use Case**: Monitoring and analysis without intervention.

#### Balanced Strategy

Sanitizes threats and adds warnings.

```javascript
{ strategy: 'balanced' }
```

**Use Case**: Production environments requiring both security and functionality.

**Actions**:
- Redacts PII
- Sanitizes dangerous patterns
- Adds security warnings
- Allows requests to proceed

#### Aggressive Strategy

Blocks high-severity threats and strictly filters content.

```javascript
{ strategy: 'aggressive' }
```

**Use Case**: High-security environments (financial, healthcare, government).

**Actions**:
- Blocks critical/high severity threats
- Removes all detected patterns
- Strict PII redaction
- Returns blocked response for threats

### Audit Logging

```javascript
{
  audit: {
    path: './logs/aimds-audit.log',
    level: 'info',  // 'debug', 'info', 'warn', 'error'
    format: 'json', // 'json' or 'text'
  }
}
```

**Log Rotation**:

```javascript
const logger = proxy.auditLogger;
await logger.rotate(); // Manual rotation
```

### Metrics Collection

```javascript
{
  metrics: {
    enabled: true,
    flushInterval: 60000, // Flush every 60 seconds
  }
}
```

**Export Metrics** (Prometheus format):

```javascript
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsCollector.exportPrometheus());
});
```

### Connection Pooling

```javascript
{
  pool: {
    maxConnections: 50,
    timeout: 30000,      // 30 seconds
    keepAlive: true,
  }
}
```

## Detection Capabilities

### Pattern Matching

Detects known threat patterns:

- **Prompt Injection**: "ignore previous instructions", "system override"
- **Data Exfiltration**: Attempts to export or send data
- **Code Execution**: eval(), exec(), system commands
- **Credential Theft**: Password/API key exposure
- **SQL Injection**: Database manipulation attempts

### PII Detection

Automatically detects and can redact:

- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- IP addresses
- API keys/tokens

### Jailbreak Detection

Identifies attempts to bypass AI safety:

- DAN mode attempts
- Role-play jailbreaks
- Instruction override attempts
- Context manipulation
- Ethical bypass attempts
- Multi-stage jailbreaks

## Performance

### Detection Speed

- **Target**: <10ms per request
- **Average**: 3-5ms for typical prompts
- **P95**: <8ms under normal load

### Throughput

- **Concurrent Connections**: Up to 50 (configurable)
- **Request Rate**: 1000+ requests/second (depending on hardware)

### Benchmarking

```javascript
const { DetectionEngine } = require('aimds/proxy');

const engine = new DetectionEngine({ threshold: 0.8 });
const stats = engine.getStats();

console.log('Average detection time:', stats.averageDetectionTime, 'ms');
```

## Examples

### Express Integration

```javascript
const express = require('express');
const { createProxy } = require('aimds/proxy');

const app = express();
app.use(express.json());

const aimdsProxy = createProxy({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  strategy: 'balanced',
});

app.post('/v1/chat/completions', aimdsProxy);
app.listen(3000);
```

### Fastify Integration

```javascript
const fastify = require('fastify')();
const { createProxy } = require('aimds/proxy');

const aimdsProxy = createProxy({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

fastify.post('/v1/messages', async (request, reply) => {
  // Fastify compatibility wrapper
  await aimdsProxy(request.raw, reply.raw, (err) => {
    if (err) reply.send(err);
  });
});

fastify.listen({ port: 3000 });
```

### Custom Mitigation Handler

```javascript
const { createProxy, DetectionEngine, MitigationStrategy } = require('aimds/proxy');

// Custom strategy
class CustomStrategy extends MitigationStrategy {
  async mitigateRequest(requestData, detectionResult) {
    // Your custom logic here
    return super.mitigateRequest(requestData, detectionResult);
  }
}

// Use custom strategy
const proxy = createProxy({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  // ... other config
});
```

## API Reference

### createProxy(config)

Creates an AIMDS proxy middleware.

**Parameters**:
- `config.provider` (string): LLM provider name
- `config.apiKey` (string): Provider API key
- `config.detection` (object): Detection configuration
- `config.strategy` (string): Mitigation strategy
- `config.audit` (object): Audit logging configuration
- `config.metrics` (object): Metrics configuration
- `config.pool` (object): Connection pool configuration

**Returns**: Express/Fastify compatible middleware function

### createProxyServer(config)

Creates a standalone proxy server.

**Parameters**: Same as `createProxy` plus:
- `config.port` (number): Server port
- `config.host` (string): Bind host
- `config.https` (boolean): Enable HTTPS
- `config.tls` (object): TLS configuration

**Returns**: HTTP/HTTPS server instance

### DetectionEngine

Low-level detection engine.

```javascript
const engine = new DetectionEngine({ threshold: 0.8 });
const result = await engine.detect('prompt text');
```

### MitigationStrategy

Mitigation strategy implementation.

```javascript
const strategy = new MitigationStrategy({ strategy: 'balanced' });
const mitigated = await strategy.mitigateRequest(requestData, detectionResult);
```

## Security Best Practices

1. **Choose Appropriate Strategy**:
   - Use `passive` for testing and monitoring
   - Use `balanced` for most production environments
   - Use `aggressive` for high-security requirements

2. **Set Detection Threshold**:
   - Lower threshold (0.6-0.7): More sensitive, more false positives
   - Medium threshold (0.7-0.8): Balanced
   - Higher threshold (0.8-0.9): Less sensitive, fewer false positives

3. **Enable Audit Logging**:
   - Always enable in production
   - Regularly review logs for threats
   - Set up alerts for critical threats

4. **Monitor Metrics**:
   - Track detection rates
   - Monitor block rates
   - Watch performance metrics

5. **Regular Updates**:
   - Keep AIMDS updated for latest threat patterns
   - Review and adjust thresholds based on real-world data

## Troubleshooting

### High False Positive Rate

- Increase detection threshold
- Review and adjust pattern matching rules
- Consider using `passive` mode to analyze before mitigating

### Performance Issues

- Enable connection pooling
- Increase `maxConnections`
- Check detection time metrics
- Consider caching for repeated patterns

### Integration Issues

- Verify API keys are correct
- Check network connectivity to provider
- Review audit logs for errors
- Test with simple requests first

## Support

For issues and questions:
- GitHub: https://github.com/your-org/aimds
- Documentation: https://aimds.dev
- Email: support@aimds.dev
