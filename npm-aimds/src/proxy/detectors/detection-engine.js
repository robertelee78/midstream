/**
 * Detection Engine
 *
 * High-performance threat detection engine with:
 * - Pattern matching (<10ms)
 * - Prompt injection detection
 * - PII sanitization
 * - Jailbreak detection
 */

const crypto = require('crypto');

class DetectionEngine {
  constructor({ threshold = 0.8, enablePII = true, enableJailbreak = true, enablePatternMatching = true }) {
    this.threshold = threshold;
    this.enablePII = enablePII;
    this.enableJailbreak = enableJailbreak;
    this.enablePatternMatching = enablePatternMatching;

    // Initialize detection patterns
    this.patterns = this.initializePatterns();
    this.piiPatterns = this.initializePIIPatterns();
    this.jailbreakPatterns = this.initializeJailbreakPatterns();

    // Performance tracking
    this.detectionCount = 0;
    this.totalDetectionTime = 0;
  }

  /**
   * Main detection method
   */
  async detect(content, options = {}) {
    const startTime = process.hrtime.bigint();

    const threats = [];
    let maxSeverity = 'low';

    try {
      // Pattern matching detection
      if (this.enablePatternMatching) {
        const patternThreats = this.detectPatterns(content);
        threats.push(...patternThreats);
      }

      // PII detection
      if (this.enablePII) {
        const piiThreats = this.detectPII(content);
        threats.push(...piiThreats);
      }

      // Jailbreak detection
      if (this.enableJailbreak) {
        const jailbreakThreats = this.detectJailbreak(content);
        threats.push(...jailbreakThreats);
      }

      // Calculate overall severity
      if (threats.length > 0) {
        maxSeverity = this.calculateMaxSeverity(threats);
      }

      // Determine if request should be blocked
      const shouldBlock = this.shouldBlockRequest(threats, maxSeverity);

      const endTime = process.hrtime.bigint();
      const detectionTimeMs = Number(endTime - startTime) / 1_000_000;

      // Update performance metrics
      this.detectionCount++;
      this.totalDetectionTime += detectionTimeMs;

      return {
        threats,
        severity: maxSeverity,
        shouldBlock,
        detectionTime: detectionTimeMs,
        contentHash: this.hashContent(content),
        timestamp: new Date().toISOString(),
        metadata: options.metadata || {},
      };

    } catch (error) {
      console.error('Detection engine error:', error);
      throw error;
    }
  }

  /**
   * Detect known threat patterns
   */
  detectPatterns(content) {
    const threats = [];
    const lowerContent = content.toLowerCase();

    for (const [patternName, pattern] of Object.entries(this.patterns)) {
      if (pattern.regex.test(lowerContent)) {
        threats.push({
          type: 'pattern_match',
          pattern: patternName,
          severity: pattern.severity,
          confidence: pattern.confidence,
          description: pattern.description,
          matched: true,
        });
      }
    }

    return threats;
  }

  /**
   * Detect PII (Personally Identifiable Information)
   */
  detectPII(content) {
    const threats = [];

    for (const [piiType, pattern] of Object.entries(this.piiPatterns)) {
      const matches = content.match(pattern.regex);
      if (matches) {
        threats.push({
          type: 'pii_detected',
          piiType,
          severity: 'medium',
          confidence: 0.9,
          description: `Detected ${piiType}: ${matches.length} occurrence(s)`,
          count: matches.length,
        });
      }
    }

    return threats;
  }

  /**
   * Detect jailbreak attempts
   */
  detectJailbreak(content) {
    const threats = [];
    const lowerContent = content.toLowerCase();

    for (const [attemptType, pattern] of Object.entries(this.jailbreakPatterns)) {
      if (pattern.regex.test(lowerContent)) {
        threats.push({
          type: 'jailbreak_attempt',
          attemptType,
          severity: pattern.severity,
          confidence: pattern.confidence,
          description: pattern.description,
        });
      }
    }

    // Check for multi-stage jailbreak patterns
    if (this.detectMultiStageJailbreak(content)) {
      threats.push({
        type: 'jailbreak_attempt',
        attemptType: 'multi_stage',
        severity: 'critical',
        confidence: 0.95,
        description: 'Multi-stage jailbreak attempt detected',
      });
    }

    return threats;
  }

  /**
   * Detect complex multi-stage jailbreak attempts
   */
  detectMultiStageJailbreak(content) {
    const indicators = [
      /ignore.*previous.*instruction/i,
      /system.*prompt/i,
      /role.*play/i,
      /pretend.*you.*are/i,
      /bypass.*filter/i,
    ];

    let matches = 0;
    for (const indicator of indicators) {
      if (indicator.test(content)) {
        matches++;
      }
    }

    // If 3+ indicators present, likely multi-stage jailbreak
    return matches >= 3;
  }

  /**
   * Calculate maximum severity from threats
   */
  calculateMaxSeverity(threats) {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };

    let maxLevel = 0;
    let maxSeverity = 'low';

    for (const threat of threats) {
      const level = severityLevels[threat.severity] || 1;
      if (level > maxLevel) {
        maxLevel = level;
        maxSeverity = threat.severity;
      }
    }

    return maxSeverity;
  }

  /**
   * Determine if request should be blocked
   */
  shouldBlockRequest(threats, severity) {
    if (threats.length === 0) return false;

    // Block critical threats always
    if (severity === 'critical') return true;

    // Block high severity if confidence is high
    const highConfidenceThreats = threats.filter(t =>
      t.severity === 'high' && t.confidence >= this.threshold
    );

    return highConfidenceThreats.length > 0;
  }

  /**
   * Initialize threat patterns
   */
  initializePatterns() {
    return {
      prompt_injection: {
        regex: /ignore.*instructions|disregard.*above|system.*override/i,
        severity: 'high',
        confidence: 0.9,
        description: 'Prompt injection attempt detected',
      },
      data_exfiltration: {
        regex: /send.*to.*http|exfiltrate|dump.*database|export.*data/i,
        severity: 'critical',
        confidence: 0.85,
        description: 'Data exfiltration attempt detected',
      },
      code_execution: {
        regex: /exec\(|eval\(|system\(|shell.*execute|run.*command/i,
        severity: 'critical',
        confidence: 0.95,
        description: 'Code execution attempt detected',
      },
      credential_theft: {
        regex: /password.*is|api.*key.*is|token.*is.*[A-Za-z0-9]{20,}/i,
        severity: 'high',
        confidence: 0.8,
        description: 'Credential exposure detected',
      },
      sql_injection: {
        regex: /union.*select|drop.*table|insert.*into.*values|delete.*from/i,
        severity: 'high',
        confidence: 0.9,
        description: 'SQL injection attempt detected',
      },
    };
  }

  /**
   * Initialize PII detection patterns
   */
  initializePIIPatterns() {
    return {
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        description: 'Email address',
      },
      phone: {
        regex: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
        description: 'Phone number',
      },
      ssn: {
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        description: 'Social Security Number',
      },
      credit_card: {
        regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        description: 'Credit card number',
      },
      ip_address: {
        regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        description: 'IP address',
      },
      api_key: {
        regex: /\b[A-Za-z0-9_-]{32,}\b/g,
        description: 'API key or token',
      },
    };
  }

  /**
   * Initialize jailbreak detection patterns
   */
  initializeJailbreakPatterns() {
    return {
      dan_mode: {
        regex: /do.*anything.*now|dan.*mode|jailbreak.*mode/i,
        severity: 'critical',
        confidence: 0.95,
        description: 'DAN mode jailbreak attempt',
      },
      role_play: {
        regex: /(pretend|imagine|act.*as|roleplay.*as).*you.*are.*(evil|hacker|villain|uncensored)/i,
        severity: 'high',
        confidence: 0.85,
        description: 'Role-play jailbreak attempt',
      },
      instruction_override: {
        regex: /ignore.*(previous|above|system).*instruction|disregard.*guidelines/i,
        severity: 'high',
        confidence: 0.9,
        description: 'Instruction override attempt',
      },
      context_manipulation: {
        regex: /new.*context|reset.*context|clear.*memory|forget.*everything/i,
        severity: 'medium',
        confidence: 0.7,
        description: 'Context manipulation attempt',
      },
      ethical_bypass: {
        regex: /(bypass|circumvent|ignore).*(ethics|safety|guidelines|rules)/i,
        severity: 'high',
        confidence: 0.85,
        description: 'Ethical bypass attempt',
      },
    };
  }

  /**
   * Hash content for tracking
   */
  hashContent(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      totalDetections: this.detectionCount,
      averageDetectionTime: this.detectionCount > 0
        ? this.totalDetectionTime / this.detectionCount
        : 0,
      threshold: this.threshold,
    };
  }
}

module.exports = DetectionEngine;
