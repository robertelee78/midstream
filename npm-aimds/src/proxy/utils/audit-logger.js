/**
 * Audit Logger
 *
 * Comprehensive logging for security audits, compliance, and debugging
 */

const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

class AuditLogger {
  constructor({ path: logPath = './logs/aimds-audit.log', level = 'info', format = 'json' }) {
    this.logPath = logPath;
    this.level = level;
    this.format = format;

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    this.currentLevel = this.levels[level] || 1;

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Initialize log stream
    this.logStream = null;
    this.initializeLogStream();

    // Statistics
    this.logCount = 0;
    this.errorCount = 0;
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Initialize log file stream
   */
  initializeLogStream() {
    this.logStream = fs.createWriteStream(this.logPath, {
      flags: 'a',
      encoding: 'utf8',
    });

    this.logStream.on('error', (err) => {
      console.error('Log stream error:', err);
    });
  }

  /**
   * Log incoming request
   */
  logRequest(requestId, requestData) {
    this.info('Request received', {
      requestId,
      method: requestData.method,
      url: requestData.url,
      ip: requestData.ip,
      userAgent: requestData.userAgent,
      promptLength: requestData.prompt?.length || 0,
      timestamp: requestData.timestamp,
    });
  }

  /**
   * Log response
   */
  logResponse(requestId, response, duration) {
    this.info('Response sent', {
      requestId,
      statusCode: response.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log threat detection
   */
  logThreatDetection(requestId, detectionResult) {
    const level = this.getThreatLogLevel(detectionResult.severity);

    this[level]('Threat detected', {
      requestId,
      severity: detectionResult.severity,
      threatCount: detectionResult.threats.length,
      threats: detectionResult.threats.map(t => ({
        type: t.type,
        severity: t.severity,
        description: t.description,
      })),
      shouldBlock: detectionResult.shouldBlock,
      detectionTime: detectionResult.detectionTime,
    });
  }

  /**
   * Log mitigation action
   */
  logMitigation(requestId, strategy, modifications) {
    this.info('Mitigation applied', {
      requestId,
      strategy,
      modifications,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get log level based on threat severity
   */
  getThreatLogLevel(severity) {
    const levelMap = {
      low: 'info',
      medium: 'warn',
      high: 'warn',
      critical: 'error',
    };

    return levelMap[severity] || 'info';
  }

  /**
   * Log debug message
   */
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  /**
   * Log info message
   */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  /**
   * Log error message
   */
  error(message, metadata = {}) {
    this.errorCount++;
    this.log('error', message, metadata);
  }

  /**
   * Core logging method
   */
  log(level, message, metadata = {}) {
    if (this.levels[level] < this.currentLevel) {
      return;
    }

    this.logCount++;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    const formatted = this.formatLog(logEntry);

    // Write to file
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.write(formatted + '\n');
    }

    // Also log to console for errors
    if (level === 'error') {
      console.error(formatted);
    }
  }

  /**
   * Format log entry based on format setting
   */
  formatLog(entry) {
    if (this.format === 'json') {
      return JSON.stringify(entry);
    }

    // Plain text format
    const { timestamp, level, message, ...metadata } = entry;
    const metadataStr = Object.keys(metadata).length > 0
      ? ` ${JSON.stringify(metadata)}`
      : '';

    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metadataStr}`;
  }

  /**
   * Flush logs to disk
   */
  flush() {
    return new Promise((resolve) => {
      if (this.logStream && !this.logStream.destroyed) {
        this.logStream.once('finish', resolve);
        this.logStream.end();
      } else {
        resolve();
      }
    });
  }

  /**
   * Rotate log file
   */
  rotate() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = this.logPath.replace('.log', `.${timestamp}.log`);

    return new Promise((resolve, reject) => {
      if (!this.logStream || this.logStream.destroyed) {
        resolve();
        return;
      }

      this.logStream.end(() => {
        fs.rename(this.logPath, rotatedPath, (err) => {
          if (err) {
            reject(err);
          } else {
            this.initializeLogStream();
            resolve();
          }
        });
      });
    });
  }

  /**
   * Get logging statistics
   */
  getStats() {
    return {
      totalLogs: this.logCount,
      errorCount: this.errorCount,
      logPath: this.logPath,
      currentLevel: this.level,
    };
  }

  /**
   * Close logger
   */
  async close() {
    await this.flush();
  }
}

module.exports = AuditLogger;
