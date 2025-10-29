/**
 * AI Defence Detection Engine - Main Export
 *
 * Comprehensive threat detection system including:
 * - Pattern-based detection (text)
 * - Neuro-symbolic attack detection
 * - Multimodal attack detection (image/audio/video)
 * - Adversarial input detection
 */

const DetectionEngine = require('./detection-engine');
const NeuroSymbolicDetector = require('./neurosymbolic-detector');
const MultimodalDetector = require('./multimodal-detector');

/**
 * Unified Detection System
 */
class UnifiedDetectionSystem {
  constructor(options = {}) {
    // Initialize all detection engines
    this.textDetector = new DetectionEngine({
      threshold: options.threshold || 0.75,
      enablePII: options.enablePII !== false,
      enableJailbreak: options.enableJailbreak !== false,
      enablePatternMatching: options.enablePatternMatching !== false,
    });

    this.neuroSymbolicDetector = new NeuroSymbolicDetector({
      threshold: options.threshold || 0.75,
      enableCrossModal: options.enableCrossModal !== false,
      enableSymbolicReasoning: options.enableSymbolicReasoning !== false,
      enableEmbeddingAnalysis: options.enableEmbeddingAnalysis !== false,
    });

    this.multimodalDetector = new MultimodalDetector({
      threshold: options.threshold || 0.75,
    });

    this.options = options;
  }

  /**
   * Comprehensive threat detection across all modalities
   */
  async detectThreats(input, metadata = {}) {
    const startTime = Date.now();
    const allThreats = [];

    try {
      // 1. Text-based detection (always run)
      if (typeof input === 'string') {
        const textResult = await this.textDetector.detect(input, metadata);
        allThreats.push(...textResult.threats);
      }

      // 2. Neuro-symbolic detection
      if (this.options.enableNeuroSymbolic !== false) {
        const nsResult = await this.neuroSymbolicDetector.detect(input, metadata);
        allThreats.push(...nsResult.threats);
      }

      // 3. Multimodal detection
      if (metadata.hasImage || metadata.hasAudio || metadata.hasVideo) {
        if (metadata.hasImage) {
          const imageThreats = this.multimodalDetector.detectImageAttacks(
            input,
            metadata.imageData
          );
          allThreats.push(...imageThreats);
        }

        if (metadata.hasAudio) {
          const audioThreats = this.multimodalDetector.detectAudioAttacks(
            input,
            metadata.audioData
          );
          allThreats.push(...audioThreats);
        }

        if (metadata.hasVideo) {
          const videoThreats = this.multimodalDetector.detectVideoAttacks(
            input,
            metadata.videoData
          );
          allThreats.push(...videoThreats);
        }
      }

      const detectionTime = Date.now() - startTime;

      return {
        threats: allThreats,
        isThreat: allThreats.length > 0,
        severity: this.calculateMaxSeverity(allThreats),
        detectionTime,
        attackCategories: this.categorizeThreats(allThreats),
        mitigations: this.generateMitigations(allThreats),
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Unified detection error:', error);
      throw error;
    }
  }

  /**
   * Calculate maximum severity from all threats
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
   * Categorize threats by type
   */
  categorizeThreats(threats) {
    const categories = {};
    for (const threat of threats) {
      const type = threat.type || 'unknown';
      categories[type] = (categories[type] || 0) + 1;
    }
    return categories;
  }

  /**
   * Generate mitigation recommendations
   */
  generateMitigations(threats) {
    const mitigations = new Set();
    for (const threat of threats) {
      if (threat.mitigation) {
        mitigations.add(threat.mitigation);
      }
    }
    return Array.from(mitigations);
  }

  /**
   * Get combined statistics from all detectors
   */
  getStats() {
    return {
      textDetector: this.textDetector.getStats(),
      neuroSymbolicDetector: this.neuroSymbolicDetector.getStats(),
      multimodalDetector: this.multimodalDetector.getStats(),
    };
  }
}

module.exports = {
  DetectionEngine,
  NeuroSymbolicDetector,
  MultimodalDetector,
  UnifiedDetectionSystem,
};
