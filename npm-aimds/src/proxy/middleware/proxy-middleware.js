/**
 * Core Proxy Middleware
 *
 * Handles request interception, threat detection, and response mitigation
 * for LLM API calls.
 */

const crypto = require('crypto');
const { Transform } = require('stream');

class ProxyMiddleware {
  constructor({ provider, detectionEngine, mitigationStrategy, auditLogger, metricsCollector, connectionPool }) {
    this.provider = provider;
    this.detectionEngine = detectionEngine;
    this.mitigationStrategy = mitigationStrategy;
    this.auditLogger = auditLogger;
    this.metricsCollector = metricsCollector;
    this.connectionPool = connectionPool;

    this.requestCounter = 0;
  }

  /**
   * Main middleware handler
   */
  async handle(req, res, next) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Extract request data
      const requestData = await this.extractRequestData(req);

      // Log incoming request
      this.auditLogger.logRequest(requestId, requestData);

      // Detect threats in request
      const detectionResult = await this.detectThreats(requestId, requestData);

      // Record detection metrics
      this.metricsCollector.recordDetection(detectionResult);

      // Check if request should be blocked
      if (detectionResult.shouldBlock) {
        return this.blockRequest(res, requestId, detectionResult);
      }

      // Apply mitigation to request if needed
      let processedRequest = requestData;
      if (detectionResult.threats.length > 0) {
        processedRequest = await this.mitigationStrategy.mitigateRequest(
          requestData,
          detectionResult
        );
      }

      // Forward request to provider
      const providerResponse = await this.forwardRequest(processedRequest);

      // Detect threats in response
      const responseDetection = await this.detectResponseThreats(requestId, providerResponse);

      // Apply mitigation to response if needed
      let processedResponse = providerResponse;
      if (responseDetection.threats.length > 0) {
        processedResponse = await this.mitigationStrategy.mitigateResponse(
          providerResponse,
          responseDetection
        );
      }

      // Log successful request
      const duration = Date.now() - startTime;
      this.auditLogger.logResponse(requestId, processedResponse, duration);
      this.metricsCollector.recordRequest(duration, detectionResult.severity);

      // Send response
      this.sendResponse(res, processedResponse);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.handleError(res, requestId, error, duration);
    }
  }

  /**
   * Extract request data from incoming request
   */
  async extractRequestData(req) {
    // Support both Express and Fastify request formats
    const body = req.body || await this.parseBody(req);

    return {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
      prompt: this.extractPrompt(body),
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  /**
   * Parse request body for non-Express frameworks
   */
  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(new Error('Invalid JSON in request body'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Extract prompt from request body (provider-specific)
   */
  extractPrompt(body) {
    if (!body) return '';

    // OpenAI format
    if (body.messages) {
      return body.messages.map(m => m.content).join('\n');
    }

    // Anthropic format
    if (body.prompt) {
      return body.prompt;
    }

    // Google format
    if (body.contents) {
      return body.contents.map(c => c.parts?.map(p => p.text).join('')).join('\n');
    }

    // Bedrock format
    if (body.inputText) {
      return body.inputText;
    }

    return JSON.stringify(body);
  }

  /**
   * Detect threats in request
   */
  async detectThreats(requestId, requestData) {
    const startTime = Date.now();

    try {
      const result = await this.detectionEngine.detect(requestData.prompt, {
        requestId,
        metadata: {
          ip: requestData.ip,
          userAgent: requestData.userAgent,
        },
      });

      const detectionTime = Date.now() - startTime;
      this.metricsCollector.recordDetectionTime(detectionTime);

      // Check if detection time exceeds threshold (should be <10ms)
      if (detectionTime > 10) {
        this.auditLogger.warn(`Detection time exceeded threshold: ${detectionTime}ms`, { requestId });
      }

      return result;
    } catch (error) {
      this.auditLogger.error('Detection failed', { requestId, error: error.message });
      // Fail open with warning
      return {
        threats: [],
        shouldBlock: false,
        severity: 'low',
        detectionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Detect threats in response
   */
  async detectResponseThreats(requestId, response) {
    const responseText = this.extractResponseText(response);

    return await this.detectionEngine.detect(responseText, {
      requestId,
      isResponse: true,
    });
  }

  /**
   * Extract text from provider response
   */
  extractResponseText(response) {
    if (!response?.body) return '';

    const body = response.body;

    // OpenAI format
    if (body.choices) {
      return body.choices.map(c => c.message?.content || c.text).join('\n');
    }

    // Anthropic format
    if (body.completion) {
      return body.completion;
    }

    // Google format
    if (body.candidates) {
      return body.candidates.map(c => c.content?.parts?.map(p => p.text).join('')).join('\n');
    }

    return JSON.stringify(body);
  }

  /**
   * Forward request to provider
   */
  async forwardRequest(requestData) {
    const startTime = Date.now();

    try {
      const response = await this.provider.sendRequest(requestData);

      const forwardTime = Date.now() - startTime;
      this.metricsCollector.recordForwardTime(forwardTime);

      return response;
    } catch (error) {
      this.auditLogger.error('Failed to forward request to provider', {
        error: error.message,
        provider: this.provider.name,
      });
      throw new Error(`Provider request failed: ${error.message}`);
    }
  }

  /**
   * Block a request due to threat detection
   */
  blockRequest(res, requestId, detectionResult) {
    this.auditLogger.warn('Request blocked', {
      requestId,
      threats: detectionResult.threats,
      severity: detectionResult.severity,
    });

    this.metricsCollector.recordBlockedRequest(detectionResult.severity);

    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-AIMDS-Request-Id', requestId);
    res.setHeader('X-AIMDS-Blocked', 'true');

    res.end(JSON.stringify({
      error: 'Request blocked by AIMDS',
      requestId,
      reason: 'Threat detected',
      threats: detectionResult.threats.map(t => ({
        type: t.type,
        severity: t.severity,
        description: t.description,
      })),
    }));
  }

  /**
   * Send successful response
   */
  sendResponse(res, response) {
    res.statusCode = response.statusCode || 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-AIMDS-Protected', 'true');

    // Copy provider headers
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        if (!key.toLowerCase().startsWith('x-aimds-')) {
          res.setHeader(key, value);
        }
      });
    }

    res.end(JSON.stringify(response.body));
  }

  /**
   * Handle errors
   */
  handleError(res, requestId, error, duration) {
    this.auditLogger.error('Proxy error', {
      requestId,
      error: error.message,
      stack: error.stack,
      duration,
    });

    this.metricsCollector.recordError(error.message);

    res.statusCode = error.statusCode || 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-AIMDS-Request-Id', requestId);

    res.end(JSON.stringify({
      error: 'Proxy error',
      requestId,
      message: error.message,
    }));
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const counter = (++this.requestCounter).toString(36).padStart(4, '0');
    return `req_${timestamp}_${counter}_${random}`;
  }
}

module.exports = ProxyMiddleware;
