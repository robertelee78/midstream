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

// Detection engines
const {
  DetectionEngine,
  NeuroSymbolicDetector,
  MultimodalDetector,
  UnifiedDetectionSystem,
} = require('./src/proxy/detectors');

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

  // Detection Engines (v0.1.5+)
  DetectionEngine,
  NeuroSymbolicDetector,
  MultimodalDetector,
  UnifiedDetectionSystem,

  // Integrations
  AgentDBClient: require('./src/integrations/agentdb'),
  LeanClient: require('./src/integrations/lean'),
  PrometheusExporter: require('./src/integrations/prometheus'),
  AuditLogger: require('./src/integrations/audit'),

  // Utilities
  utils: require('./src/utils'),

  // Intelligence Module (Week 1: AgentDB Foundation)
  intelligence: (() => {
    try {
      const intel = require('./dist/intelligence');
      return {
        // Vector Store
        ThreatVectorStore: intel.ThreatVectorStore,
        createVectorStore: intel.createVectorStore,

        // Embeddings
        createEmbeddingProvider: intel.createEmbeddingProvider,
        HashEmbeddingProvider: intel.HashEmbeddingProvider,
        OpenAIEmbeddingProvider: intel.OpenAIEmbeddingProvider,
        EmbeddingUtils: intel.EmbeddingUtils,

        // All exports
        ...intel
      };
    } catch (error) {
      console.warn('Intelligence module not compiled yet. Run: cd src/intelligence && npx tsc');
      return {};
    }
  })(),

  // Version
  version: require('./package.json').version,
};
