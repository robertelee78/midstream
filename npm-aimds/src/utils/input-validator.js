/**
 * Input Validation Framework
 * Comprehensive input validation and sanitization utilities
 * Prevents injection attacks, buffer overflows, and malicious input
 */

class InputValidator {
  /**
   * Validate and sanitize text input
   * @param {string} text - Input text to validate
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized text
   * @throws {TypeError|RangeError} If validation fails
   */
  static validateTextInput(text, maxLength = 10000) {
    if (typeof text !== 'string') {
      throw new TypeError('Input must be a string');
    }
    if (text.length > maxLength) {
      throw new RangeError(`Input too long: ${text.length} (max: ${maxLength})`);
    }
    return text;
  }

  /**
   * Validate numeric input with range checking
   * @param {any} num - Input to validate as number
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {number} Validated number
   * @throws {TypeError|RangeError} If validation fails
   */
  static validateNumberInput(num, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number(num);
    if (isNaN(parsed)) {
      throw new TypeError('Input must be a number');
    }
    if (parsed < min || parsed > max) {
      throw new RangeError(`Number out of range: ${parsed} (min: ${min}, max: ${max})`);
    }
    return parsed;
  }

  /**
   * Sanitize file path to prevent path traversal attacks
   * @param {string} path - File path to sanitize
   * @returns {string} Sanitized path
   * @throws {Error} If path contains dangerous patterns
   */
  static sanitizeFilePath(path) {
    if (typeof path !== 'string') {
      throw new TypeError('Path must be a string');
    }

    // Prevent path traversal
    const normalized = path.replace(/\.\./g, '').replace(/\/\//g, '/');

    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new Error('Invalid file path: path traversal detected');
    }

    return normalized;
  }

  /**
   * Sanitize command-line arguments to prevent injection
   * Only allows alphanumeric characters, dashes, underscores, dots, and forward slashes
   * @param {string} arg - Argument to sanitize
   * @returns {string} Sanitized argument
   */
  static sanitizeCommandArg(arg) {
    if (typeof arg !== 'string') {
      return '';
    }
    // Only allow safe characters: alphanumeric, dash, underscore, dot, forward slash
    return arg.replace(/[^a-zA-Z0-9\-_./]/g, '');
  }

  /**
   * Sanitize JSON input with size limits
   * @param {string} jsonString - JSON string to parse
   * @param {number} maxSize - Maximum JSON size in bytes
   * @returns {any} Parsed JSON object
   * @throws {Error} If JSON is invalid or too large
   */
  static sanitizeJSON(jsonString, maxSize = 10 * 1024 * 1024) {
    if (typeof jsonString !== 'string') {
      throw new TypeError('JSON input must be a string');
    }

    if (jsonString.length > maxSize) {
      throw new Error(`JSON payload too large: ${jsonString.length} bytes (max: ${maxSize})`);
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  /**
   * Validate email address format
   * @param {string} email - Email to validate
   * @returns {string} Validated email
   * @throws {Error} If email format is invalid
   */
  static validateEmail(email) {
    if (typeof email !== 'string') {
      throw new TypeError('Email must be a string');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    return email.toLowerCase();
  }

  /**
   * Validate URL format and prevent SSRF attacks
   * @param {string} url - URL to validate
   * @param {Array<string>} allowedProtocols - Allowed protocols (default: https)
   * @returns {string} Validated URL
   * @throws {Error} If URL is invalid or uses disallowed protocol
   */
  static validateURL(url, allowedProtocols = ['https']) {
    if (typeof url !== 'string') {
      throw new TypeError('URL must be a string');
    }

    try {
      const parsed = new URL(url);

      if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
        throw new Error(`Disallowed protocol: ${parsed.protocol}`);
      }

      // Prevent SSRF to localhost/internal IPs
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.16.') ||
          hostname === '::1') {
        throw new Error('SSRF attack detected: internal IP address');
      }

      return url;
    } catch (error) {
      throw new Error(`Invalid URL: ${error.message}`);
    }
  }

  /**
   * Sanitize array of command arguments
   * @param {Array} args - Arguments to sanitize
   * @returns {Array<string>} Sanitized arguments
   */
  static sanitizeCommandArgs(args) {
    if (!Array.isArray(args)) {
      throw new TypeError('Arguments must be an array');
    }

    return args.map(arg => this.sanitizeCommandArg(arg));
  }

  /**
   * Validate object against schema
   * @param {object} obj - Object to validate
   * @param {object} schema - Schema definition
   * @returns {object} Validated object
   * @throws {Error} If validation fails
   */
  static validateObject(obj, schema) {
    if (typeof obj !== 'object' || obj === null) {
      throw new TypeError('Input must be an object');
    }

    const validated = {};

    for (const [key, rules] of Object.entries(schema)) {
      const value = obj[key];

      // Check required fields
      if (rules.required && value === undefined) {
        throw new Error(`Missing required field: ${key}`);
      }

      // Skip optional undefined fields
      if (value === undefined) {
        continue;
      }

      // Type checking
      if (rules.type && typeof value !== rules.type) {
        throw new TypeError(`Field ${key} must be of type ${rules.type}`);
      }

      // Custom validator
      if (rules.validate && !rules.validate(value)) {
        throw new Error(`Validation failed for field: ${key}`);
      }

      validated[key] = value;
    }

    return validated;
  }
}

module.exports = { InputValidator };
