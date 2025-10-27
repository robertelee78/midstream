/**
 * AIMDS HTTP/3 Proxy for LLM API Protection
 *
 * Main entry point for the proxy middleware that provides:
 * - Real-time threat detection on LLM API requests
 * - Auto-mitigation strategies (passive, balanced, aggressive)
 * - Multi-provider support (OpenAI, Anthropic, Google, AWS Bedrock)
 * - Audit logging and metrics collection
 * - Request/response streaming with connection pooling
 */

const http = require('http');
const https = require('https');
const { EventEmitter } = require('events');
const crypto = require('crypto');

// Import proxy components
const ProxyMiddleware = require('./proxy/middleware/proxy-middleware');
const DetectionEngine = require('./proxy/detectors/detection-engine');
const MitigationStrategy = require('./proxy/strategies/mitigation-strategy');
const AuditLogger = require('./proxy/utils/audit-logger');
const MetricsCollector = require('./proxy/utils/metrics-collector');
const ConnectionPool = require('./proxy/utils/connection-pool');

// Import provider handlers
const OpenAIProvider = require('./proxy/providers/openai-provider');
const AnthropicProvider = require('./proxy/providers/anthropic-provider');
const GoogleProvider = require('./proxy/providers/google-provider');
const BedrockProvider = require('./proxy/providers/bedrock-provider');

/**
 * Create an AIMDS proxy middleware
 *
 * @param {Object} config - Configuration options
 * @param {string} config.provider - LLM provider ('openai', 'anthropic', 'google', 'bedrock')
 * @param {string} config.apiKey - API key for the provider
 * @param {Object} config.detection - Detection configuration
 * @param {number} config.detection.threshold - Threat detection threshold (0-1)
 * @param {boolean} config.detection.enablePII - Enable PII detection
 * @param {boolean} config.detection.enableJailbreak - Enable jailbreak detection
 * @param {string} config.strategy - Mitigation strategy ('passive', 'balanced', 'aggressive')
 * @param {boolean} config.autoMitigate - Enable automatic mitigation
 * @param {Object} config.audit - Audit logging configuration
 * @param {string} config.audit.path - Path to audit log file
 * @param {string} config.audit.level - Log level ('info', 'warn', 'error')
 * @param {Object} config.metrics - Metrics collection configuration
 * @param {boolean} config.metrics.enabled - Enable metrics collection
 * @param {number} config.metrics.flushInterval - Metrics flush interval (ms)
 * @param {Object} config.pool - Connection pool configuration
 * @param {number} config.pool.maxConnections - Maximum concurrent connections
 * @param {number} config.pool.timeout - Connection timeout (ms)
 * @returns {Function} Express/Fastify compatible middleware
 */
function createProxy(config = {}) {
  // Validate configuration
  validateConfig(config);

  // Initialize components
  const detectionEngine = new DetectionEngine({
    threshold: config.detection?.threshold || 0.8,
    enablePII: config.detection?.enablePII !== false,
    enableJailbreak: config.detection?.enableJailbreak !== false,
    enablePatternMatching: config.detection?.enablePatternMatching !== false,
  });

  const mitigationStrategy = new MitigationStrategy({
    strategy: config.strategy || 'balanced',
    autoMitigate: config.autoMitigate !== false,
  });

  const auditLogger = new AuditLogger({
    path: config.audit?.path || './logs/aimds-audit.log',
    level: config.audit?.level || 'info',
    format: config.audit?.format || 'json',
  });

  const metricsCollector = new MetricsCollector({
    enabled: config.metrics?.enabled !== false,
    flushInterval: config.metrics?.flushInterval || 60000,
  });

  const connectionPool = new ConnectionPool({
    maxConnections: config.pool?.maxConnections || 50,
    timeout: config.pool?.timeout || 30000,
    keepAlive: config.pool?.keepAlive !== false,
  });

  // Initialize provider
  const provider = createProvider(config.provider, {
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    connectionPool,
  });

  // Create middleware
  const middleware = new ProxyMiddleware({
    provider,
    detectionEngine,
    mitigationStrategy,
    auditLogger,
    metricsCollector,
    connectionPool,
  });

  // Return Express/Fastify compatible middleware function
  return middleware.handle.bind(middleware);
}

/**
 * Create a provider instance based on type
 */
function createProvider(providerType, config) {
  const providers = {
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    google: GoogleProvider,
    bedrock: BedrockProvider,
  };

  const ProviderClass = providers[providerType];
  if (!ProviderClass) {
    throw new Error(`Unsupported provider: ${providerType}. Supported: ${Object.keys(providers).join(', ')}`);
  }

  return new ProviderClass(config);
}

/**
 * Validate proxy configuration
 */
function validateConfig(config) {
  if (!config.provider) {
    throw new Error('Provider is required (openai, anthropic, google, bedrock)');
  }

  if (!config.apiKey && config.provider !== 'bedrock') {
    throw new Error('API key is required for provider: ' + config.provider);
  }

  const validStrategies = ['passive', 'balanced', 'aggressive'];
  if (config.strategy && !validStrategies.includes(config.strategy)) {
    throw new Error(`Invalid strategy: ${config.strategy}. Valid: ${validStrategies.join(', ')}`);
  }

  if (config.detection?.threshold !== undefined) {
    const threshold = config.detection.threshold;
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new Error('Detection threshold must be a number between 0 and 1');
    }
  }
}

/**
 * Create a standalone proxy server
 *
 * @param {Object} config - Server configuration
 * @param {number} config.port - Port to listen on
 * @param {string} config.host - Host to bind to
 * @param {boolean} config.https - Enable HTTPS
 * @param {Object} config.tls - TLS configuration (cert, key)
 * @returns {http.Server|https.Server} HTTP/HTTPS server instance
 */
function createProxyServer(config = {}) {
  const proxyMiddleware = createProxy(config);

  const handler = (req, res) => {
    // Add Express-like methods
    req.body = '';
    req.on('data', chunk => req.body += chunk);
    req.on('end', () => {
      try {
        if (req.body) {
          req.body = JSON.parse(req.body);
        }
      } catch (err) {
        req.body = {};
      }

      // Call proxy middleware
      proxyMiddleware(req, res, (err) => {
        if (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Proxy error',
            message: err.message,
          }));
        }
      });
    });
  };

  let server;
  if (config.https && config.tls) {
    server = https.createServer({
      cert: config.tls.cert,
      key: config.tls.key,
    }, handler);
  } else {
    server = http.createServer(handler);
  }

  const port = config.port || 3000;
  const host = config.host || '0.0.0.0';

  server.listen(port, host, () => {
    console.log(`AIMDS Proxy listening on ${config.https ? 'https' : 'http'}://${host}:${port}`);
  });

  return server;
}

/**
 * Utility function to hash content for tracking
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// Export main API
module.exports = {
  createProxy,
  createProxyServer,

  // Export components for advanced usage
  ProxyMiddleware,
  DetectionEngine,
  MitigationStrategy,
  AuditLogger,
  MetricsCollector,
  ConnectionPool,

  // Export providers
  providers: {
    OpenAIProvider,
    AnthropicProvider,
    GoogleProvider,
    BedrockProvider,
  },

  // Utilities
  hashContent,
};
