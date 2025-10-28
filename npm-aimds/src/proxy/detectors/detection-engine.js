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
      /ignore.*(previous|prior|above|system).*instruction/i,
      /system.*prompt|initial.*instructions/i,
      /role.*play|pretend.*you|act\s+as/i,
      /you\s+are\s+(now|about|going)/i,
      /(bypass|circumvent).*(filter|safety|ethics)/i,
      /forget.*(everything|all|instructions)/i,
      /(dan|jailbreak|developer)\s+mode/i,
      /(enable|activate).*(unrestricted|unfiltered)/i,
    ];

    let matches = 0;
    for (const indicator of indicators) {
      if (indicator.test(content)) {
        matches++;
      }
    }

    // If 3+ indicators present, likely multi-stage jailbreak
    // Lower threshold for higher sensitivity
    return matches >= 2;
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
      prompt_injection_basic: {
        regex: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions|disregard.*(above|instructions)|system\s+override/i,
        severity: 'high',
        confidence: 0.9,
        description: 'Basic prompt injection attempt detected',
      },
      prompt_injection_advanced: {
        regex: /(new\s+instructions?:|updated\s+instructions?:|revised\s+prompt:)/i,
        severity: 'high',
        confidence: 0.85,
        description: 'Advanced prompt injection with instruction replacement',
      },
      data_exfiltration: {
        regex: /send.*to.*(http|https)|exfiltrate|dump.*(database|data|credentials)|export.*to.*(url|endpoint)/i,
        severity: 'critical',
        confidence: 0.85,
        description: 'Data exfiltration attempt detected',
      },
      code_execution: {
        regex: /exec\s*\(|eval\s*\(|system\s*\(|shell.*execute|run\s+command|execute\s+code|subprocess|popen/i,
        severity: 'critical',
        confidence: 0.95,
        description: 'Code execution attempt detected',
      },
      credential_theft: {
        regex: /(password|api[_\s-]?key|access[_\s-]?token|secret[_\s-]?key)\s+(is|=|:)\s*['""]?[A-Za-z0-9_\-]{8,}/i,
        severity: 'high',
        confidence: 0.8,
        description: 'Credential exposure detected',
      },
      sql_injection: {
        regex: /(union\s+(all\s+)?select|drop\s+(table|database)|insert\s+into.+values|delete\s+from|\-\-\s*$|;\s*drop|\/\*.*\*\/)/i,
        severity: 'high',
        confidence: 0.9,
        description: 'SQL injection attempt detected',
      },
      xss_attempt: {
        regex: /<script[^>]*>|javascript:|onerror\s*=|onload\s*=|<iframe/i,
        severity: 'high',
        confidence: 0.90,
        description: 'Cross-site scripting (XSS) attempt detected',
      },
      command_injection: {
        regex: /(\||;|&&)\s*(rm|del|format|mkfs)|rm\s+-rf|`[^`]+`|\$\([^)]+\)|>\s*\/dev\/|<\s*\/etc\/|&&\s*echo/i,
        severity: 'critical',
        confidence: 0.95,
        description: 'Command injection attempt detected',
      },
      path_traversal: {
        regex: /\.\.[\/\\]|\.\.%2f|\.\.%5c|%2e%2e%2f|%2e%2e\/|\/etc\/passwd|\/etc\/shadow/i,
        severity: 'high',
        confidence: 0.90,
        description: 'Path traversal attempt detected',
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
        regex: /do.*anything.*now|dan.*mode|jailbreak.*mode|(you\s+are\s+about\s+to\s+)?immerse.*role.*dan/i,
        severity: 'critical',
        confidence: 0.95,
        description: 'DAN mode jailbreak attempt',
      },
      role_play_advanced: {
        regex: /(pretend|imagine|act\s+as|roleplay\s+as|you\s+are\s+now).*you\s+(are|will\s+be).*(evil|hacker|villain|uncensored|unrestricted|unfiltered|DAN|alter\s+ego)/i,
        severity: 'high',
        confidence: 0.90,
        description: 'Advanced role-play jailbreak attempt',
      },
      role_play_basic: {
        regex: /(pretend|imagine|act.*as|roleplay.*as).*you.*are/i,
        severity: 'medium',
        confidence: 0.65,
        description: 'Basic role-play attempt (may be legitimate)',
      },
      instruction_override: {
        regex: /ignore.*(previous|above|prior|system|all).*instruction|disregard.*guidelines|forget.*instructions/i,
        severity: 'high',
        confidence: 0.9,
        description: 'Instruction override attempt',
      },
      context_manipulation: {
        regex: /new\s+context|reset\s+context|clear\s+memory|forget\s+(everything|all|what\s+i\s+told)/i,
        severity: 'medium',
        confidence: 0.7,
        description: 'Context manipulation attempt',
      },
      ethical_bypass: {
        regex: /(bypass|circumvent|ignore|remove)\s*(ethics|safety|guidelines|rules|restrictions|filters|limitations)/i,
        severity: 'high',
        confidence: 0.85,
        description: 'Ethical bypass attempt',
      },
      system_prompt_reveal: {
        regex: /(show|reveal|display|tell\s+me|what\s+is).*(system\s+prompt|initial\s+instructions|base\s+prompt|original\s+instructions)/i,
        severity: 'high',
        confidence: 0.90,
        description: 'System prompt revelation attempt',
      },
      developer_mode: {
        regex: /(enable|activate|enter)\s+(developer|debug|admin|root)\s+mode/i,
        severity: 'critical',
        confidence: 0.95,
        description: 'Developer mode activation attempt',
      },
      character_impersonation: {
        regex: /you\s+are\s+(no\s+longer|not)\s+(an\s+)?ai|you\s+are\s+a\s+(human|person|real)/i,
        severity: 'high',
        confidence: 0.85,
        description: 'AI identity manipulation',
      },
      token_smuggling: {
        regex: /&lt;|&gt;|<\s*\/?system>|<\s*\/?prompt>|<\s*\/?instruction>/i,
        severity: 'high',
        confidence: 0.90,
        description: 'Token smuggling / prompt injection via HTML entities',
      },
      base64_encoding: {
        regex: /base64.*decode|atob\(|fromCharCode|\\x[0-9a-f]{2}/i,
        severity: 'medium',
        confidence: 0.75,
        description: 'Potential encoding-based bypass',
      },
      multi_language: {
        regex: /(translate|in\s+chinese|in\s+russian|in\s+arabic|in\s+hindi).*ignore.*instructions/i,
        severity: 'high',
        confidence: 0.85,
        description: 'Multi-language jailbreak attempt',
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
