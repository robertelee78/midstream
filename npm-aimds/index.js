/**
 * AIMDS JavaScript API
 *
 * Programmatic interface to AIMDS functionality.
 * Provides detection, analysis, verification, and response capabilities.
 */

const { Detector } = require('./src/detection');
const { Analyzer } = require('./src/analysis');
const { Verifier } = require('./src/verification');
const { Responder } = require('./src/response');
const { StreamProcessor } = require('./src/stream');
const { ConfigLoader } = require('./src/config');

// Export main classes
module.exports = {
  // Core modules
  Detector,
  Analyzer,
  Verifier,
  Responder,
  StreamProcessor,

  // Configuration
  ConfigLoader,

  // Integrations
  AgentDBClient: require('./src/integrations/agentdb'),
  LeanClient: require('./src/integrations/lean'),
  PrometheusExporter: require('./src/integrations/prometheus'),
  AuditLogger: require('./src/integrations/audit'),

  // Utilities
  utils: require('./src/utils'),

  // Version
  version: require('./package.json').version,
};
