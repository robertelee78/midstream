/**
 * Mitigation Strategy
 *
 * Implements three mitigation strategies:
 * - Passive: Log only, no intervention
 * - Balanced: Sanitize threats, add warnings
 * - Aggressive: Block threats, strict filtering
 */

class MitigationStrategy {
  constructor({ strategy = 'balanced', autoMitigate = true }) {
    this.strategy = strategy;
    this.autoMitigate = autoMitigate;

    // Statistics
    this.mitigationCount = 0;
    this.mitigationsByType = {};
  }

  /**
   * Mitigate threats in request
   */
  async mitigateRequest(requestData, detectionResult) {
    if (!this.autoMitigate || detectionResult.threats.length === 0) {
      return requestData;
    }

    this.mitigationCount++;

    switch (this.strategy) {
      case 'passive':
        return this.passiveRequestMitigation(requestData, detectionResult);

      case 'balanced':
        return this.balancedRequestMitigation(requestData, detectionResult);

      case 'aggressive':
        return this.aggressiveRequestMitigation(requestData, detectionResult);

      default:
        throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  /**
   * Mitigate threats in response
   */
  async mitigateResponse(response, detectionResult) {
    if (!this.autoMitigate || detectionResult.threats.length === 0) {
      return response;
    }

    switch (this.strategy) {
      case 'passive':
        return this.passiveResponseMitigation(response, detectionResult);

      case 'balanced':
        return this.balancedResponseMitigation(response, detectionResult);

      case 'aggressive':
        return this.aggressiveResponseMitigation(response, detectionResult);

      default:
        return response;
    }
  }

  /**
   * Passive request mitigation - log only
   */
  passiveRequestMitigation(requestData, detectionResult) {
    this.recordMitigation('passive', 'request');

    // Add metadata about detected threats but don't modify
    return {
      ...requestData,
      _aimds_metadata: {
        strategy: 'passive',
        threats: detectionResult.threats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Balanced request mitigation - sanitize and warn
   */
  balancedRequestMitigation(requestData, detectionResult) {
    this.recordMitigation('balanced', 'request');

    let sanitizedPrompt = requestData.prompt;
    const modifications = [];

    // Remove or sanitize detected threats
    for (const threat of detectionResult.threats) {
      if (threat.type === 'pii_detected') {
        sanitizedPrompt = this.sanitizePII(sanitizedPrompt, threat.piiType);
        modifications.push(`Sanitized ${threat.piiType}`);
      }

      if (threat.type === 'pattern_match' && threat.severity === 'high') {
        sanitizedPrompt = this.sanitizePattern(sanitizedPrompt, threat.pattern);
        modifications.push(`Removed ${threat.pattern} pattern`);
      }
    }

    // Add warning to prompt
    const warning = `\n\n[SECURITY WARNING: The following prompt has been sanitized by AIMDS due to detected threats: ${modifications.join(', ')}]\n\n`;

    return {
      ...requestData,
      prompt: sanitizedPrompt,
      body: this.updateRequestBody(requestData.body, sanitizedPrompt + warning),
      _aimds_metadata: {
        strategy: 'balanced',
        threats: detectionResult.threats,
        modifications,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Aggressive request mitigation - strict filtering
   */
  aggressiveRequestMitigation(requestData, detectionResult) {
    this.recordMitigation('aggressive', 'request');

    let sanitizedPrompt = requestData.prompt;
    const modifications = [];
    const removedPatterns = [];

    // Aggressively remove all detected threats
    for (const threat of detectionResult.threats) {
      if (threat.type === 'pii_detected') {
        sanitizedPrompt = this.sanitizePII(sanitizedPrompt, threat.piiType);
        modifications.push(`Removed all ${threat.piiType}`);
      }

      if (threat.type === 'pattern_match') {
        sanitizedPrompt = this.sanitizePattern(sanitizedPrompt, threat.pattern);
        removedPatterns.push(threat.pattern);
      }

      if (threat.type === 'jailbreak_attempt') {
        sanitizedPrompt = this.removeJailbreakAttempt(sanitizedPrompt, threat.attemptType);
        modifications.push(`Blocked ${threat.attemptType} jailbreak`);
      }
    }

    // Add strict security notice
    const notice = `\n\n[SECURITY NOTICE: This request has been strictly filtered by AIMDS. ${modifications.length} threats removed. Patterns blocked: ${removedPatterns.join(', ') || 'none'}]\n\n`;

    return {
      ...requestData,
      prompt: sanitizedPrompt + notice,
      body: this.updateRequestBody(requestData.body, sanitizedPrompt + notice),
      _aimds_metadata: {
        strategy: 'aggressive',
        threats: detectionResult.threats,
        modifications,
        removedPatterns,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Passive response mitigation - log only
   */
  passiveResponseMitigation(response, detectionResult) {
    this.recordMitigation('passive', 'response');

    // Add warning header
    return {
      ...response,
      headers: {
        ...response.headers,
        'X-AIMDS-Threats-Detected': detectionResult.threats.length.toString(),
        'X-AIMDS-Strategy': 'passive',
      },
    };
  }

  /**
   * Balanced response mitigation - sanitize and warn
   */
  balancedResponseMitigation(response, detectionResult) {
    this.recordMitigation('balanced', 'response');

    let sanitizedBody = response.body;
    const modifications = [];

    // Sanitize response text
    const responseText = this.extractResponseText(sanitizedBody);
    let sanitizedText = responseText;

    for (const threat of detectionResult.threats) {
      if (threat.type === 'pii_detected') {
        sanitizedText = this.sanitizePII(sanitizedText, threat.piiType);
        modifications.push(`Sanitized ${threat.piiType} in response`);
      }
    }

    // Update response body with sanitized text
    sanitizedBody = this.updateResponseBody(sanitizedBody, sanitizedText);

    // Add warning to response
    if (modifications.length > 0) {
      sanitizedBody = this.addWarningToResponse(sanitizedBody, modifications);
    }

    return {
      ...response,
      body: sanitizedBody,
      headers: {
        ...response.headers,
        'X-AIMDS-Threats-Mitigated': modifications.length.toString(),
        'X-AIMDS-Strategy': 'balanced',
      },
    };
  }

  /**
   * Aggressive response mitigation - strict filtering
   */
  aggressiveResponseMitigation(response, detectionResult) {
    this.recordMitigation('aggressive', 'response');

    const highSeverityThreats = detectionResult.threats.filter(
      t => t.severity === 'high' || t.severity === 'critical'
    );

    // If high severity threats in response, block it
    if (highSeverityThreats.length > 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-AIMDS-Response-Blocked': 'true',
          'X-AIMDS-Strategy': 'aggressive',
        },
        body: {
          error: 'Response blocked by AIMDS',
          reason: 'High severity threats detected in model response',
          threats: highSeverityThreats.map(t => t.type),
        },
      };
    }

    // Otherwise sanitize aggressively
    let sanitizedBody = response.body;
    const responseText = this.extractResponseText(sanitizedBody);
    let sanitizedText = responseText;

    for (const threat of detectionResult.threats) {
      if (threat.type === 'pii_detected') {
        sanitizedText = this.sanitizePII(sanitizedText, threat.piiType);
      }
    }

    sanitizedBody = this.updateResponseBody(sanitizedBody, sanitizedText);

    return {
      ...response,
      body: sanitizedBody,
      headers: {
        ...response.headers,
        'X-AIMDS-Threats-Removed': detectionResult.threats.length.toString(),
        'X-AIMDS-Strategy': 'aggressive',
      },
    };
  }

  /**
   * Sanitize PII from text
   */
  sanitizePII(text, piiType) {
    const replacements = {
      email: '[EMAIL REDACTED]',
      phone: '[PHONE REDACTED]',
      ssn: '[SSN REDACTED]',
      credit_card: '[CARD REDACTED]',
      ip_address: '[IP REDACTED]',
      api_key: '[KEY REDACTED]',
    };

    const replacement = replacements[piiType] || '[REDACTED]';

    // Use the same patterns from detection engine
    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      api_key: /\b[A-Za-z0-9_-]{32,}\b/g,
    };

    const pattern = patterns[piiType];
    return pattern ? text.replace(pattern, replacement) : text;
  }

  /**
   * Sanitize dangerous patterns
   */
  sanitizePattern(text, patternType) {
    const indicators = {
      prompt_injection: [/ignore.*instructions/gi, /disregard.*above/gi, /system.*override/gi],
      code_execution: [/exec\(/gi, /eval\(/gi, /system\(/gi],
      sql_injection: [/union.*select/gi, /drop.*table/gi],
    };

    let sanitized = text;
    const patterns = indicators[patternType] || [];

    for (const pattern of patterns) {
      sanitized = sanitized.replace(pattern, '[REMOVED]');
    }

    return sanitized;
  }

  /**
   * Remove jailbreak attempt patterns
   */
  removeJailbreakAttempt(text, attemptType) {
    // Remove entire sentences containing jailbreak attempts
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      const lower = line.toLowerCase();
      return !(
        lower.includes('ignore') ||
        lower.includes('jailbreak') ||
        lower.includes('pretend you are') ||
        lower.includes('dan mode')
      );
    });

    return filtered.join('\n');
  }

  /**
   * Update request body with sanitized prompt
   */
  updateRequestBody(body, sanitizedPrompt) {
    if (!body) return body;

    const updated = { ...body };

    // OpenAI format
    if (updated.messages) {
      updated.messages = updated.messages.map(m => ({
        ...m,
        content: sanitizedPrompt,
      }));
    }

    // Anthropic format
    if (updated.prompt !== undefined) {
      updated.prompt = sanitizedPrompt;
    }

    return updated;
  }

  /**
   * Extract text from response body
   */
  extractResponseText(body) {
    if (!body) return '';

    // OpenAI format
    if (body.choices) {
      return body.choices.map(c => c.message?.content || c.text).join('\n');
    }

    // Anthropic format
    if (body.completion) {
      return body.completion;
    }

    return JSON.stringify(body);
  }

  /**
   * Update response body with sanitized text
   */
  updateResponseBody(body, sanitizedText) {
    if (!body) return body;

    const updated = { ...body };

    // OpenAI format
    if (updated.choices) {
      updated.choices = updated.choices.map(c => ({
        ...c,
        message: c.message ? { ...c.message, content: sanitizedText } : c.message,
        text: c.text ? sanitizedText : c.text,
      }));
    }

    // Anthropic format
    if (updated.completion !== undefined) {
      updated.completion = sanitizedText;
    }

    return updated;
  }

  /**
   * Add warning to response
   */
  addWarningToResponse(body, modifications) {
    const warning = `\n\n[AIMDS Warning: Response has been sanitized. Modifications: ${modifications.join(', ')}]`;

    const updated = { ...body };

    if (updated.choices) {
      updated.choices = updated.choices.map(c => ({
        ...c,
        message: c.message ? { ...c.message, content: c.message.content + warning } : c.message,
      }));
    }

    if (updated.completion) {
      updated.completion += warning;
    }

    return updated;
  }

  /**
   * Record mitigation statistics
   */
  recordMitigation(strategy, type) {
    const key = `${strategy}_${type}`;
    this.mitigationsByType[key] = (this.mitigationsByType[key] || 0) + 1;
  }

  /**
   * Get mitigation statistics
   */
  getStats() {
    return {
      totalMitigations: this.mitigationCount,
      mitigationsByType: this.mitigationsByType,
      strategy: this.strategy,
    };
  }
}

module.exports = MitigationStrategy;
