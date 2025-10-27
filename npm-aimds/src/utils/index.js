/**
 * Utility functions
 *
 * Common utilities for AIMDS operations
 */

const crypto = require('crypto');

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function validateInput(input, schema) {
  // TODO: Implement schema validation
  return true;
}

async function parseConfig(path) {
  const { ConfigLoader } = require('../config');
  return await ConfigLoader.load(path);
}

function formatOutput(data, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  // TODO: Implement text formatting
  return String(data);
}

module.exports = {
  hashText,
  validateInput,
  parseConfig,
  formatOutput,
};
