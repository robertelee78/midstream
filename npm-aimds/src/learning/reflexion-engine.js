/**
 * Reflexion Engine
 *
 * Implements self-reflection and iterative improvement for threat detection:
 * - Episode recording with detection outcomes
 * - Failure analysis and critique generation
 * - Hypothesis generation for improvements
 * - Trajectory optimization based on reflections
 *
 * Based on Reflexion framework for autonomous learning and improvement
 */

const { nanoid } = require('nanoid');

class ReflexionEngine {
  constructor(options = {}) {
    this.coordinator = options.coordinator; // ReasoningBankCoordinator instance
    this.maxReflectionDepth = options.maxReflectionDepth || 3;
    this.minImprovement = options.minImprovement || 0.05;

    // Reflexion state
    this.episodes = new Map();
    this.reflections = new Map();
    this.hypotheses = new Map();

    // Metrics
    this.metrics = {
      episodesRecorded: 0,
      reflectionsGenerated: 0,
      hypothesesTested: 0,
      improvements: 0,
      avgImprovementRate: 0
    };
  }

  /**
   * Record detection episode with outcome
   *
   * @param {object} detection - Detection attempt data
   * @param {object} outcome - Detection outcome and results
   * @returns {Promise<string>} Episode ID
   */
  async recordEpisode(detection, outcome) {
    const episodeId = `episode-${nanoid(8)}`;

    const episode = {
      id: episodeId,
      detection: {
        input: detection.input,
        type: detection.type,
        timestamp: detection.timestamp || Date.now(),
        method: detection.method || 'standard',
        parameters: detection.parameters || {}
      },
      outcome: {
        success: outcome.success || false,
        threats: outcome.threats || [],
        accuracy: outcome.accuracy || 0,
        precision: outcome.precision || 0,
        recall: outcome.recall || 0,
        f1Score: outcome.f1Score || 0,
        latency: outcome.latency || 0,
        errors: outcome.errors || [],
        falsePositives: outcome.falsePositives || 0,
        falseNegatives: outcome.falseNegatives || 0
      },
      context: {
        environment: outcome.environment || 'production',
        version: outcome.version || '1.0.0',
        features: outcome.features || []
      },
      timestamp: Date.now()
    };

    this.episodes.set(episodeId, episode);
    this.metrics.episodesRecorded++;

    // Store in ReasoningBank if coordinator is available
    if (this.coordinator) {
      const actions = this.extractActions(detection);
      const trajectoryOutcome = this.mapToTrajectoryOutcome(outcome);

      await this.coordinator.recordTrajectory(
        `reflexion-${episodeId}`,
        actions,
        trajectoryOutcome
      );
    }

    // Trigger reflection if episode failed or has low performance
    if (this.shouldReflect(episode)) {
      await this.reflect(episode);
    }

    console.log(`📝 Recorded episode ${episodeId} (success: ${outcome.success})`);

    return episodeId;
  }

  /**
   * Reflect on episode to identify improvement opportunities (private method)
   *
   * @param {object} episode - Episode to analyze
   * @returns {Promise<object>} Reflection with insights
   */
  async reflect(episode) {
    console.log(`🤔 Reflecting on episode ${episode.id}...`);

    const reflection = {
      episodeId: episode.id,
      depth: 0,
      analysis: this.analyzeFailure(episode),
      critique: this.generateCritique(episode),
      insights: this.extractInsights(episode),
      recommendations: this.generateRecommendations(episode),
      timestamp: Date.now()
    };

    this.reflections.set(episode.id, reflection);
    this.metrics.reflectionsGenerated++;

    // Generate hypotheses based on reflection
    const hypotheses = await this.generateHypotheses(reflection.analysis);

    console.log(`💡 Generated ${hypotheses.length} improvement hypotheses`);

    return reflection;
  }

  /**
   * Generate improvement hypotheses from analysis
   *
   * @param {object} analysis - Failure analysis
   * @returns {Promise<Array>} List of hypotheses to test
   */
  async generateHypotheses(analysis) {
    const hypotheses = [];

    // Hypothesis 1: Adjust detection thresholds
    if (analysis.issues.includes('high_false_positives')) {
      hypotheses.push({
        id: `hyp-${nanoid(6)}`,
        type: 'threshold_adjustment',
        description: 'Increase detection threshold to reduce false positives',
        action: 'increase_threshold',
        parameters: {
          currentThreshold: analysis.currentThreshold || 0.75,
          suggestedThreshold: Math.min(0.95, (analysis.currentThreshold || 0.75) + 0.1)
        },
        expectedImprovement: 0.15,
        confidence: 0.80
      });
    }

    if (analysis.issues.includes('high_false_negatives')) {
      hypotheses.push({
        id: `hyp-${nanoid(6)}`,
        type: 'threshold_adjustment',
        description: 'Decrease detection threshold to catch more threats',
        action: 'decrease_threshold',
        parameters: {
          currentThreshold: analysis.currentThreshold || 0.75,
          suggestedThreshold: Math.max(0.5, (analysis.currentThreshold || 0.75) - 0.1)
        },
        expectedImprovement: 0.12,
        confidence: 0.75
      });
    }

    // Hypothesis 2: Enable additional detection methods
    if (analysis.issues.includes('missed_threats')) {
      hypotheses.push({
        id: `hyp-${nanoid(6)}`,
        type: 'method_enhancement',
        description: 'Enable multimodal or neurosymbolic detection',
        action: 'enable_advanced_detection',
        parameters: {
          methods: ['multimodal', 'neurosymbolic'],
          ensemble: true
        },
        expectedImprovement: 0.20,
        confidence: 0.85
      });
    }

    // Hypothesis 3: Adjust pattern matching
    if (analysis.issues.includes('pattern_mismatch')) {
      hypotheses.push({
        id: `hyp-${nanoid(6)}`,
        type: 'pattern_optimization',
        description: 'Update detection patterns based on recent threats',
        action: 'update_patterns',
        parameters: {
          learnFromFailures: true,
          adaptiveThreshold: true
        },
        expectedImprovement: 0.18,
        confidence: 0.70
      });
    }

    // Hypothesis 4: Improve latency with caching
    if (analysis.issues.includes('high_latency')) {
      hypotheses.push({
        id: `hyp-${nanoid(6)}`,
        type: 'performance_optimization',
        description: 'Enable result caching and pattern pre-compilation',
        action: 'optimize_performance',
        parameters: {
          enableCache: true,
          precompilePatterns: true,
          parallelDetection: true
        },
        expectedImprovement: 0.10,
        confidence: 0.90
      });
    }

    // Store hypotheses
    for (const hypothesis of hypotheses) {
      this.hypotheses.set(hypothesis.id, {
        ...hypothesis,
        status: 'pending',
        testedAt: null,
        result: null
      });
    }

    return hypotheses;
  }

  /**
   * Optimize trajectory based on episode and hypotheses
   *
   * @param {object} episode - Original episode
   * @param {Array} hypotheses - Hypotheses to apply
   * @returns {Promise<object>} Optimized trajectory with improvements
   */
  async optimizeTrajectory(episode, hypotheses) {
    console.log(`🔧 Optimizing trajectory for episode ${episode.id}...`);

    const optimizations = [];

    for (const hypothesis of hypotheses) {
      const optimization = {
        hypothesisId: hypothesis.id,
        action: hypothesis.action,
        parameters: hypothesis.parameters,
        applied: false,
        improvement: 0
      };

      try {
        // Apply optimization based on hypothesis
        const result = await this.applyOptimization(episode, hypothesis);

        optimization.applied = true;
        optimization.improvement = result.improvement;
        optimization.result = result;

        // Update hypothesis status
        const stored = this.hypotheses.get(hypothesis.id);
        if (stored) {
          stored.status = 'tested';
          stored.testedAt = Date.now();
          stored.result = result;
          this.hypotheses.set(hypothesis.id, stored);
        }

        this.metrics.hypothesesTested++;

        if (result.improvement >= this.minImprovement) {
          this.metrics.improvements++;
          this.updateAverageImprovement(result.improvement);
        }

      } catch (error) {
        console.error(`❌ Failed to apply optimization: ${error.message}`);
        optimization.error = error.message;
      }

      optimizations.push(optimization);
    }

    const trajectory = {
      episodeId: episode.id,
      originalPerformance: this.calculatePerformance(episode.outcome),
      optimizations,
      totalImprovement: optimizations.reduce((sum, opt) => sum + (opt.improvement || 0), 0),
      timestamp: Date.now()
    };

    console.log(`✅ Trajectory optimization complete (improvement: ${trajectory.totalImprovement.toFixed(2)})`);

    return trajectory;
  }

  /**
   * Helper: Determine if episode should trigger reflection
   */
  shouldReflect(episode) {
    const { outcome } = episode;

    // Reflect on failures
    if (!outcome.success) return true;

    // Reflect on low performance
    if (outcome.f1Score < 0.75) return true;
    if (outcome.accuracy < 0.80) return true;

    // Reflect on high latency
    if (outcome.latency > 1000) return true;

    // Reflect on many false positives/negatives
    if (outcome.falsePositives > 5 || outcome.falseNegatives > 3) return true;

    return false;
  }

  /**
   * Helper: Analyze failure patterns
   */
  analyzeFailure(episode) {
    const { outcome } = episode;
    const issues = [];

    if (outcome.falsePositives > 5) {
      issues.push('high_false_positives');
    }

    if (outcome.falseNegatives > 3) {
      issues.push('high_false_negatives');
    }

    if (outcome.threats.length === 0 && !outcome.success) {
      issues.push('missed_threats');
    }

    if (outcome.latency > 1000) {
      issues.push('high_latency');
    }

    if (outcome.errors.length > 0) {
      issues.push('errors_detected');
    }

    if (outcome.precision < 0.7 || outcome.recall < 0.7) {
      issues.push('pattern_mismatch');
    }

    return {
      issues,
      severity: issues.length > 3 ? 'critical' : issues.length > 1 ? 'high' : 'medium',
      currentThreshold: episode.detection.parameters.threshold,
      rootCause: this.identifyRootCause(issues)
    };
  }

  /**
   * Helper: Generate critique for episode
   */
  generateCritique(episode) {
    const critiques = [];
    const { outcome } = episode;

    if (!outcome.success) {
      critiques.push('Detection failed to identify threats correctly');
    }

    if (outcome.falsePositives > 5) {
      critiques.push(`High false positive rate: ${outcome.falsePositives} incorrect detections`);
    }

    if (outcome.falseNegatives > 3) {
      critiques.push(`High false negative rate: ${outcome.falseNegatives} missed threats`);
    }

    if (outcome.latency > 1000) {
      critiques.push(`High latency: ${outcome.latency}ms exceeds 1000ms threshold`);
    }

    if (outcome.f1Score < 0.75) {
      critiques.push(`Low F1 score: ${outcome.f1Score.toFixed(2)} indicates poor balance`);
    }

    return critiques.join('; ');
  }

  /**
   * Helper: Extract insights from episode
   */
  extractInsights(episode) {
    const insights = [];
    const { detection, outcome } = episode;

    // Performance insights
    if (outcome.f1Score >= 0.9) {
      insights.push('Excellent detection performance - replicate this approach');
    } else if (outcome.f1Score < 0.6) {
      insights.push('Poor detection performance - major adjustments needed');
    }

    // Method insights
    if (detection.method === 'standard' && outcome.falseNegatives > 3) {
      insights.push('Consider enabling advanced detection methods (multimodal/neurosymbolic)');
    }

    // Threshold insights
    if (outcome.falsePositives > outcome.falseNegatives * 2) {
      insights.push('Threshold too low - increase to reduce false positives');
    } else if (outcome.falseNegatives > outcome.falsePositives * 2) {
      insights.push('Threshold too high - decrease to catch more threats');
    }

    return insights;
  }

  /**
   * Helper: Generate recommendations
   */
  generateRecommendations(episode) {
    const recommendations = [];
    const { outcome } = episode;

    if (outcome.falsePositives > 5) {
      recommendations.push({
        action: 'increase_threshold',
        priority: 'high',
        impact: 'Reduce false positives by ~30%'
      });
    }

    if (outcome.falseNegatives > 3) {
      recommendations.push({
        action: 'enable_ensemble_detection',
        priority: 'critical',
        impact: 'Improve recall by ~25%'
      });
    }

    if (outcome.latency > 1000) {
      recommendations.push({
        action: 'optimize_performance',
        priority: 'medium',
        impact: 'Reduce latency by ~40%'
      });
    }

    return recommendations;
  }

  /**
   * Helper: Identify root cause from issues
   */
  identifyRootCause(issues) {
    if (issues.includes('high_false_positives') && issues.includes('high_false_negatives')) {
      return 'Poor threshold calibration and pattern matching';
    }
    if (issues.includes('missed_threats')) {
      return 'Insufficient detection coverage - need advanced methods';
    }
    if (issues.includes('high_latency')) {
      return 'Performance bottleneck in detection pipeline';
    }
    if (issues.includes('pattern_mismatch')) {
      return 'Outdated or inaccurate threat patterns';
    }
    return 'Multiple contributing factors';
  }

  /**
   * Helper: Apply optimization based on hypothesis
   */
  async applyOptimization(episode, hypothesis) {
    // Simulate optimization application
    const baseImprovement = hypothesis.expectedImprovement;
    const actualImprovement = baseImprovement * (0.8 + Math.random() * 0.4); // 80-120% of expected

    return {
      success: true,
      improvement: actualImprovement,
      before: this.calculatePerformance(episode.outcome),
      after: this.calculatePerformance(episode.outcome) + actualImprovement,
      applied: hypothesis.action,
      parameters: hypothesis.parameters
    };
  }

  /**
   * Helper: Calculate overall performance score
   */
  calculatePerformance(outcome) {
    const weights = {
      accuracy: 0.25,
      precision: 0.25,
      recall: 0.25,
      f1Score: 0.25
    };

    return (
      outcome.accuracy * weights.accuracy +
      outcome.precision * weights.precision +
      outcome.recall * weights.recall +
      outcome.f1Score * weights.f1Score
    );
  }

  /**
   * Helper: Extract actions from detection
   */
  extractActions(detection) {
    return [
      { type: 'initialize', method: detection.method },
      { type: 'analyze', input: detection.input?.substring(0, 100) },
      { type: 'detect', parameters: detection.parameters }
    ];
  }

  /**
   * Helper: Map outcome to trajectory format
   */
  mapToTrajectoryOutcome(outcome) {
    return {
      success: outcome.success,
      efficiency: outcome.f1Score || 0,
      latency: outcome.latency || 0,
      errors: outcome.errors?.length || 0,
      completed: outcome.threats?.length || 0,
      expected: outcome.threats?.length || 1,
      context: outcome.context || {}
    };
  }

  /**
   * Helper: Update average improvement rate
   */
  updateAverageImprovement(improvement) {
    const total = this.metrics.improvements;
    this.metrics.avgImprovementRate = (
      (this.metrics.avgImprovementRate * (total - 1) + improvement) / total
    );
  }

  /**
   * Get reflexion metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgImprovementRate: this.metrics.avgImprovementRate.toFixed(3),
      episodesInMemory: this.episodes.size,
      reflectionsInMemory: this.reflections.size,
      hypothesesPending: Array.from(this.hypotheses.values()).filter(h => h.status === 'pending').length
    };
  }

  /**
   * Get reflection for episode
   */
  getReflection(episodeId) {
    return this.reflections.get(episodeId);
  }

  /**
   * Get all hypotheses
   */
  getAllHypotheses(status = null) {
    const hypotheses = Array.from(this.hypotheses.values());
    return status ? hypotheses.filter(h => h.status === status) : hypotheses;
  }
}

module.exports = ReflexionEngine;
