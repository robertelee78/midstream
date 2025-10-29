/**
 * AI Defence Learning Module
 *
 * Integrates ReasoningBank and Reflexion Engine for adaptive learning
 */

const ReasoningBankCoordinator = require('./reasoningbank');
const ReflexionEngine = require('./reflexion-engine');

/**
 * Initialize learning system
 */
async function initializeLearning(options = {}) {
  const coordinator = new ReasoningBankCoordinator({
    dbPath: options.dbPath || './agentdb.db',
    minAttempts: options.minAttempts || 3,
    minSuccessRate: options.minSuccessRate || 0.6,
    minConfidence: options.minConfidence || 0.7,
    epochs: options.epochs || 10,
    batchSize: options.batchSize || 32
  });

  const reflexionEngine = new ReflexionEngine({
    coordinator,
    maxReflectionDepth: options.maxReflectionDepth || 3,
    minImprovement: options.minImprovement || 0.05
  });

  await coordinator.initialize();

  return {
    coordinator,
    reflexionEngine
  };
}

/**
 * Record detection attempt with learning
 */
async function recordDetectionWithLearning(learningSystem, detection, outcome) {
  const { coordinator, reflexionEngine } = learningSystem;

  // Record episode in Reflexion Engine
  const episodeId = await reflexionEngine.recordEpisode(detection, outcome);

  // Get reflection if available
  const reflection = reflexionEngine.getReflection(episodeId);

  return {
    episodeId,
    reflection,
    metrics: reflexionEngine.getMetrics()
  };
}

/**
 * Optimize detection strategy based on learning
 */
async function optimizeDetectionStrategy(learningSystem, scenario) {
  const { coordinator } = learningSystem;

  // Query best practices
  const bestPractice = await coordinator.queryBestPractice(scenario, {
    k: 5,
    onlySuccesses: true
  });

  // Distill patterns
  const patterns = await coordinator.distillMemory();

  return {
    bestPractice,
    patterns,
    metrics: coordinator.getMetrics()
  };
}

/**
 * Train learning models
 */
async function trainModels(learningSystem, domain = 'threat-detection') {
  const { coordinator } = learningSystem;

  // Train neural patterns
  const trainingResult = await coordinator.trainPatterns(domain);

  // Optimize memory
  await coordinator.optimizeMemory();

  return trainingResult;
}

/**
 * Get comprehensive learning metrics
 */
function getLearningMetrics(learningSystem) {
  const { coordinator, reflexionEngine } = learningSystem;

  return {
    coordination: coordinator.getMetrics(),
    reflexion: reflexionEngine.getMetrics(),
    timestamp: Date.now()
  };
}

module.exports = {
  ReasoningBankCoordinator,
  ReflexionEngine,
  initializeLearning,
  recordDetectionWithLearning,
  optimizeDetectionStrategy,
  trainModels,
  getLearningMetrics
};
