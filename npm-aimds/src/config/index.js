/**
 * Configuration module
 *
 * Load, validate, and manage AIMDS configuration
 */

const fs = require('fs').promises;
const yaml = require('yaml');
const path = require('path');

class ConfigLoader {
  static async load(configPath = '.aimds.yaml') {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      const config = yaml.parse(content);

      if (!this.validate(config)) {
        throw new Error('Invalid configuration');
      }

      return config;
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults`);
      return this.getDefaults();
    }
  }

  static validate(config) {
    // TODO: Implement comprehensive validation
    return config && config.version;
  }

  static merge(base, override) {
    // TODO: Implement deep merge
    return { ...base, ...override };
  }

  static getDefaults() {
    return {
      version: '0.1',
      detection: {
        threshold: 0.8,
        mode: 'balanced',
        pii_detection: true,
      },
      analysis: {
        sensitivity: 'medium',
        learning: true,
      },
      verification: {
        method: 'ltl',
        timeout: 30,
      },
      response: {
        strategy: 'balanced',
        auto_respond: false,
      },
    };
  }
}

module.exports = { ConfigLoader };
