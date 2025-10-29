/**
 * API Key Encryption Utilities
 * Secure encryption/decryption for API keys and sensitive credentials
 * Uses AES-256-GCM for authenticated encryption
 */

const crypto = require('crypto');

class SecureConfig {
  constructor(options = {}) {
    this.algorithm = 'aes-256-gcm';

    // Use master key from environment or provided option
    // In production, MASTER_KEY should be stored securely (e.g., AWS Secrets Manager)
    const masterKey = options.masterKey || process.env.MASTER_KEY || 'default-insecure-key-change-in-production';

    // Derive encryption key using scrypt (memory-hard, resistant to hardware attacks)
    this.key = crypto.scryptSync(masterKey, 'salt', 32);

    if (masterKey === 'default-insecure-key-change-in-production') {
      console.warn('⚠️  WARNING: Using default master key. Set MASTER_KEY environment variable in production!');
    }
  }

  /**
   * Encrypt an API key or sensitive string
   * @param {string} plaintext - API key to encrypt
   * @returns {string} Base64-encoded encrypted data (IV + authTag + encrypted)
   */
  encryptKey(plaintext) {
    if (typeof plaintext !== 'string') {
      throw new TypeError('Plaintext must be a string');
    }

    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    // Get authentication tag (prevents tampering)
    const authTag = cipher.getAuthTag();

    // Combine: IV (16 bytes) + authTag (16 bytes) + encrypted data
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString('base64');
  }

  /**
   * Decrypt an encrypted API key
   * @param {string} encryptedKey - Base64-encoded encrypted data
   * @returns {string} Decrypted plaintext API key
   */
  decryptKey(encryptedKey) {
    if (typeof encryptedKey !== 'string') {
      throw new TypeError('Encrypted key must be a string');
    }

    try {
      // Decode from base64
      const buffer = Buffer.from(encryptedKey, 'base64');

      // Extract components
      const iv = buffer.slice(0, 16);
      const authTag = buffer.slice(16, 32);
      const encrypted = buffer.slice(32);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt multiple keys at once
   * @param {object} keys - Object with key-value pairs to encrypt
   * @returns {object} Object with encrypted values
   */
  encryptKeys(keys) {
    const encrypted = {};

    for (const [key, value] of Object.entries(keys)) {
      if (typeof value === 'string' && value) {
        encrypted[key] = this.encryptKey(value);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt multiple keys at once
   * @param {object} encryptedKeys - Object with encrypted key-value pairs
   * @returns {object} Object with decrypted values
   */
  decryptKeys(encryptedKeys) {
    const decrypted = {};

    for (const [key, value] of Object.entries(encryptedKeys)) {
      if (typeof value === 'string' && value) {
        try {
          decrypted[key] = this.decryptKey(value);
        } catch (error) {
          console.error(`Failed to decrypt key ${key}:`, error.message);
          decrypted[key] = null;
        }
      }
    }

    return decrypted;
  }

  /**
   * Hash a value (one-way, cannot be decrypted)
   * Useful for storing password hashes, tokens, etc.
   * @param {string} value - Value to hash
   * @returns {string} Hex-encoded hash
   */
  hash(value) {
    if (typeof value !== 'string') {
      throw new TypeError('Value must be a string');
    }

    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Hex-encoded random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Securely compare two strings (timing-safe)
   * Prevents timing attacks
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings match
   */
  secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    // Convert to buffers for timing-safe comparison
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }
}

/**
 * Singleton instance for global access
 */
let globalInstance = null;

/**
 * Get or create the global SecureConfig instance
 * @param {object} options - Configuration options
 * @returns {SecureConfig} SecureConfig instance
 */
function getSecureConfig(options) {
  if (!globalInstance) {
    globalInstance = new SecureConfig(options);
  }
  return globalInstance;
}

module.exports = {
  SecureConfig,
  getSecureConfig
};
