/**
 * Neuro-Symbolic Attack Detector
 *
 * Detects attacks that combine neural (embedding-based) and symbolic (logic-based) approaches
 * Includes defenses against:
 * - Cross-modal attacks (text + image/audio/video)
 * - Adversarial perturbations in multimodal inputs
 * - Symbolic reasoning manipulation
 * - Logic-based jailbreaks
 * - Knowledge graph poisoning
 * - Embedding space attacks
 */

const crypto = require('crypto');

class NeuroSymbolicDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.75;
    this.enableCrossModal = options.enableCrossModal !== false;
    this.enableSymbolicReasoning = options.enableSymbolicReasoning !== false;
    this.enableEmbeddingAnalysis = options.enableEmbeddingAnalysis !== false;

    // Initialize detection patterns
    this.patterns = this.initializePatterns();
    this.crossModalPatterns = this.initializeCrossModalPatterns();
    this.symbolicPatterns = this.initializeSymbolicPatterns();

    // Statistics
    this.stats = {
      totalDetections: 0,
      crossModalAttacks: 0,
      symbolicAttacks: 0,
      embeddingAttacks: 0,
    };
  }

  /**
   * Main detection method for neuro-symbolic attacks
   */
  async detect(input, metadata = {}) {
    const startTime = Date.now();
    const threats = [];

    try {
      // 1. Cross-modal attack detection
      if (this.enableCrossModal && metadata.hasMultimodal) {
        const crossModalThreats = await this.detectCrossModalAttacks(input, metadata);
        threats.push(...crossModalThreats);
      }

      // 2. Symbolic reasoning attacks
      if (this.enableSymbolicReasoning) {
        const symbolicThreats = this.detectSymbolicAttacks(input);
        threats.push(...symbolicThreats);
      }

      // 3. Embedding space attacks
      if (this.enableEmbeddingAnalysis && metadata.embeddings) {
        const embeddingThreats = this.detectEmbeddingAttacks(metadata.embeddings);
        threats.push(...embeddingThreats);
      }

      // 4. Logic-based jailbreaks
      const logicThreats = this.detectLogicBasedJailbreaks(input);
      threats.push(...logicThreats);

      // 5. Knowledge graph manipulation
      const kgThreats = this.detectKnowledgeGraphAttacks(input);
      threats.push(...kgThreats);

      this.stats.totalDetections++;
      this.updateStats(threats);

      const detectionTime = Date.now() - startTime;

      return {
        threats,
        isThreat: threats.length > 0,
        severity: this.calculateMaxSeverity(threats),
        detectionTime,
        attackTypes: this.categorizeAttacks(threats),
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Neuro-symbolic detection error:', error);
      throw error;
    }
  }

  /**
   * Detect cross-modal attacks (text + image/audio/video)
   */
  async detectCrossModalAttacks(input, metadata) {
    const threats = [];

    // 1. Hidden instruction detection in image metadata
    if (metadata.imageMetadata) {
      if (this.detectHiddenInstructions(metadata.imageMetadata)) {
        threats.push({
          type: 'cross_modal_attack',
          subtype: 'hidden_instructions_in_image',
          severity: 'critical',
          confidence: 0.95,
          description: 'Hidden adversarial instructions detected in image metadata',
          mitigation: 'Strip image metadata before processing',
        });
      }
    }

    // 2. Visual adversarial perturbations
    if (metadata.hasImage) {
      const patterns = this.crossModalPatterns.visual_perturbation;
      for (const check of patterns) {
        if (check.test(input)) {
          threats.push({
            type: 'cross_modal_attack',
            subtype: 'visual_adversarial_perturbation',
            severity: 'high',
            confidence: 0.85,
            description: 'Potential visual adversarial perturbation detected',
            mitigation: 'Apply image preprocessing and normalization',
          });
          break;
        }
      }
    }

    // 3. Audio steganography
    if (metadata.hasAudio) {
      if (this.detectAudioSteganography(input)) {
        threats.push({
          type: 'cross_modal_attack',
          subtype: 'audio_steganography',
          severity: 'high',
          confidence: 0.80,
          description: 'Hidden instructions in audio detected',
          mitigation: 'Apply audio filtering and sanitization',
        });
      }
    }

    // 4. Cross-modal semantic inconsistency
    if (metadata.hasMultimodal && metadata.text && metadata.imageDescription) {
      const inconsistency = this.detectSemanticInconsistency(
        metadata.text,
        metadata.imageDescription
      );
      if (inconsistency > 0.7) {
        threats.push({
          type: 'cross_modal_attack',
          subtype: 'semantic_inconsistency',
          severity: 'medium',
          confidence: inconsistency,
          description: 'Inconsistent semantic meaning between modalities',
          mitigation: 'Verify consistency across modalities',
        });
      }
    }

    return threats;
  }

  /**
   * Detect symbolic reasoning attacks
   */
  detectSymbolicAttacks(input) {
    const threats = [];
    const lowerInput = input.toLowerCase();

    for (const [patternName, pattern] of Object.entries(this.symbolicPatterns)) {
      if (pattern.regex.test(lowerInput)) {
        threats.push({
          type: 'symbolic_attack',
          subtype: patternName,
          severity: pattern.severity,
          confidence: pattern.confidence,
          description: pattern.description,
          mitigation: pattern.mitigation,
        });
      }
    }

    return threats;
  }

  /**
   * Detect embedding space attacks
   */
  detectEmbeddingAttacks(embeddings) {
    const threats = [];

    // 1. Adversarial embedding detection
    if (this.isAdversarialEmbedding(embeddings)) {
      threats.push({
        type: 'embedding_attack',
        subtype: 'adversarial_embedding',
        severity: 'high',
        confidence: 0.85,
        description: 'Adversarial perturbations detected in embedding space',
        mitigation: 'Apply embedding normalization and outlier detection',
      });
    }

    // 2. Embedding clustering anomaly
    const clusterAnomaly = this.detectEmbeddingClusterAnomaly(embeddings);
    if (clusterAnomaly > 0.8) {
      threats.push({
        type: 'embedding_attack',
        subtype: 'cluster_anomaly',
        severity: 'medium',
        confidence: clusterAnomaly,
        description: 'Unusual embedding cluster detected',
        mitigation: 'Verify embedding provenance',
      });
    }

    return threats;
  }

  /**
   * Detect logic-based jailbreaks
   */
  detectLogicBasedJailbreaks(input) {
    const threats = [];

    const logicPatterns = [
      {
        name: 'syllogistic_manipulation',
        regex: /(if|since|because|therefore|thus)\s+(you\s+are|i\s+am|we\s+are).*(then|so|hence|therefore|thus)\s+(you\s+must|you\s+should|you\s+can|help\s+me)/i,
        severity: 'high',
        confidence: 0.80,
      },
      {
        name: 'logical_contradiction',
        regex: /(you\s+said|you\s+agreed|you\s+admitted).*(but|however|yet).*(you\s+should|you\s+must|you\s+can't)/i,
        severity: 'medium',
        confidence: 0.70,
      },
      {
        name: 'conditional_bypass',
        regex: /if\s+(i\s+am|we\s+are|this\s+is).*(then|,)\s*(you\s+can|it's\s+okay|you\s+should)/i,
        severity: 'high',
        confidence: 0.75,
      },
    ];

    for (const pattern of logicPatterns) {
      if (pattern.regex.test(input)) {
        threats.push({
          type: 'logic_based_jailbreak',
          subtype: pattern.name,
          severity: pattern.severity,
          confidence: pattern.confidence,
          description: `Logic-based jailbreak attempt: ${pattern.name}`,
          mitigation: 'Reject logical manipulation attempts',
        });
      }
    }

    return threats;
  }

  /**
   * Detect knowledge graph attacks
   */
  detectKnowledgeGraphAttacks(input) {
    const threats = [];

    const kgPatterns = [
      {
        name: 'relationship_poisoning',
        regex: /(update|change|modify|set)\s+(the|your)\s+(knowledge|facts|database|ontology)/i,
        severity: 'critical',
        confidence: 0.90,
      },
      {
        name: 'triple_injection',
        regex: /<[^>]+>\s+(is|has|relates to|connected to)\s+<[^>]+>/i,
        severity: 'high',
        confidence: 0.85,
      },
      {
        name: 'reasoning_rule_manipulation',
        regex: /(always|never)\s+(infer|conclude|deduce|reason)\s+that/i,
        severity: 'high',
        confidence: 0.80,
      },
    ];

    for (const pattern of kgPatterns) {
      if (pattern.regex.test(input)) {
        threats.push({
          type: 'knowledge_graph_attack',
          subtype: pattern.name,
          severity: pattern.severity,
          confidence: pattern.confidence,
          description: `Knowledge graph manipulation: ${pattern.name}`,
          mitigation: 'Validate knowledge graph updates',
        });
      }
    }

    return threats;
  }

  /**
   * Initialize neuro-symbolic attack patterns
   */
  initializePatterns() {
    return {
      hybrid_reasoning: {
        regex: /(combine|merge|integrate)\s+(neural|symbolic|logic|reasoning)/i,
        severity: 'medium',
        confidence: 0.65,
        description: 'Potential neuro-symbolic reasoning manipulation',
      },
    };
  }

  /**
   * Initialize cross-modal attack patterns
   */
  initializeCrossModalPatterns() {
    return {
      visual_perturbation: [
        /image\s+(with|contains|has)\s+hidden/i,
        /adversarial\s+(noise|perturbation|example)/i,
        /pixel\s+(manipulation|attack)/i,
      ],
      audio_steganography: [
        /audio\s+(contains|has|with)\s+hidden/i,
        /inaudible\s+instructions?/i,
        /ultrasonic\s+(command|signal)/i,
      ],
    };
  }

  /**
   * Initialize symbolic reasoning patterns
   */
  initializeSymbolicPatterns() {
    return {
      formal_logic_bypass: {
        regex: /(∀|∃|¬|∧|∨|→|↔|⊕)\s*\w+|forall\s+\w+|exists\s+\w+/i,
        severity: 'medium',
        confidence: 0.70,
        description: 'Formal logic notation detected (potential reasoning bypass)',
        mitigation: 'Sanitize formal logic symbols',
      },
      prolog_injection: {
        regex: /:-\s*\w+|assertz?\(|retract\(/i,
        severity: 'high',
        confidence: 0.85,
        description: 'Prolog-style logic injection attempt',
        mitigation: 'Block logic programming syntax',
      },
      ontology_manipulation: {
        regex: /(owl|rdf|sparql):(class|property|instance)/i,
        severity: 'high',
        confidence: 0.80,
        description: 'Ontology manipulation attempt detected',
        mitigation: 'Validate ontology operations',
      },
    };
  }

  /**
   * Helper methods
   */
  detectHiddenInstructions(metadata) {
    const suspiciousFields = ['comment', 'description', 'userComment', 'xmp'];
    for (const field of suspiciousFields) {
      if (metadata[field] && metadata[field].length > 100) {
        // Check for injection patterns in metadata
        if (/ignore|disregard|system|prompt/i.test(metadata[field])) {
          return true;
        }
      }
    }
    return false;
  }

  detectAudioSteganography(input) {
    // Detect references to audio manipulation
    return /ultrasonic|subliminal|inaudible|frequency\s+modulation/i.test(input);
  }

  detectSemanticInconsistency(text, imageDescription) {
    // Simple keyword-based semantic check
    const textWords = new Set(text.toLowerCase().split(/\s+/));
    const imageWords = new Set(imageDescription.toLowerCase().split(/\s+/));

    const intersection = new Set([...textWords].filter(x => imageWords.has(x)));
    const union = new Set([...textWords, ...imageWords]);

    const similarity = intersection.size / union.size;
    return 1 - similarity; // Return inconsistency score
  }

  isAdversarialEmbedding(embeddings) {
    if (!Array.isArray(embeddings) || embeddings.length === 0) return false;

    // Check for unusual embedding magnitudes
    const mean = embeddings.reduce((a, b) => a + b, 0) / embeddings.length;
    const stdDev = Math.sqrt(
      embeddings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embeddings.length
    );

    // If standard deviation is very high, might be adversarial
    return stdDev > 2.0;
  }

  detectEmbeddingClusterAnomaly(embeddings) {
    // Simple anomaly detection based on L2 norm
    if (!Array.isArray(embeddings)) return 0;

    const norm = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));

    // Typical embeddings have norm around 1.0
    // Very high or very low norms might indicate manipulation
    if (norm > 3.0 || norm < 0.1) {
      return Math.min(0.95, Math.abs(norm - 1.0));
    }

    return 0;
  }

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

  categorizeAttacks(threats) {
    const categories = {};
    for (const threat of threats) {
      categories[threat.type] = (categories[threat.type] || 0) + 1;
    }
    return categories;
  }

  updateStats(threats) {
    for (const threat of threats) {
      if (threat.type === 'cross_modal_attack') this.stats.crossModalAttacks++;
      if (threat.type === 'symbolic_attack') this.stats.symbolicAttacks++;
      if (threat.type === 'embedding_attack') this.stats.embeddingAttacks++;
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = NeuroSymbolicDetector;
