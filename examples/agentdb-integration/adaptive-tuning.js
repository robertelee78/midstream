#!/usr/bin/env node

/**
 * Example 2: Adaptive Parameter Tuning
 *
 * This example demonstrates:
 * - Using reinforcement learning to optimize streaming parameters
 * - Auto-tuning Midstreamer configuration
 * - Tracking performance improvements over time
 *
 * Expected Output:
 * Starting adaptive tuning...
 * Auto-tuning episode 1
 *   Reward: 0.723
 * ...
 * Auto-tuning episode 30
 *   Reward: 0.891
 *
 * Adaptive Learning Results:
 *   Episodes: 30
 *   Best Parameters: {...}
 *   Performance Improvement: 23.4%
 */

const path = require('path');

// Mock classes for demonstration
class AdaptiveLearningEngine {
  constructor(agentdb, options = {}) {
    this.agentdb = agentdb;
    this.algorithm = options.algorithm || 'actor_critic';
    this.learningRate = options.learningRate || 0.001;
    this.explorationRate = options.explorationRate || 0.3;
    this.explorationDecay = options.explorationDecay || 0.95;

    this.episodeCount = 0;
    this.bestReward = 0;
    this.bestParams = null;
    this.autoTuneInterval = null;
  }

  async initializeAgent() {
    console.log(`✓ Initialized ${this.algorithm} agent`);
    console.log(`  Learning rate: ${this.learningRate}`);
    console.log(`  Exploration rate: ${this.explorationRate}`);
    console.log(`  Decay: ${this.explorationDecay}`);
  }

  async enableAutoTuning(interval, metricsCallback) {
    console.log(`✓ Auto-tuning enabled (interval: ${interval}ms)`);
    this.metricsCallback = metricsCallback;

    // Simulate auto-tuning episodes
    this.autoTuneInterval = setInterval(async () => {
      await this.runEpisode();
    }, interval);
  }

  async runEpisode() {
    this.episodeCount++;

    // Explore parameters
    const params = this.exploreParameters();

    // Get metrics from callback
    const metrics = await this.metricsCallback(params);

    // Calculate reward
    const reward = this.calculateReward(metrics);

    // Update best parameters
    if (reward > this.bestReward) {
      this.bestReward = reward;
      this.bestParams = { ...params };
    }

    // Decay exploration
    this.explorationRate *= this.explorationDecay;

    // Display episode results
    console.log(`\nAuto-tuning episode ${this.episodeCount}`);
    console.log(`  Reward: ${reward.toFixed(3)}`);
    console.log(`  Exploration: ${this.explorationRate.toFixed(3)}`);
    console.log(`  Confidence: ${(1 - this.explorationRate).toFixed(3)}`);
    console.log(`  Parameters: windowSize=${params.windowSize}, threshold=${params.threshold.toFixed(2)}`);
  }

  exploreParameters() {
    // Exploit best parameters or explore new ones
    if (this.bestParams && Math.random() > this.explorationRate) {
      // Exploit with small variations
      return {
        windowSize: Math.max(50, Math.min(200, this.bestParams.windowSize + (Math.random() - 0.5) * 20)),
        threshold: Math.max(1.0, Math.min(3.0, this.bestParams.threshold + (Math.random() - 0.5) * 0.2)),
        sensitivity: Math.max(0.5, Math.min(2.0, this.bestParams.sensitivity + (Math.random() - 0.5) * 0.1)),
        adaptiveThreshold: this.bestParams.adaptiveThreshold,
        anomalyDetectionMethod: this.bestParams.anomalyDetectionMethod
      };
    } else {
      // Explore random parameters
      return {
        windowSize: Math.floor(50 + Math.random() * 150),
        threshold: 1.0 + Math.random() * 2.0,
        sensitivity: 0.5 + Math.random() * 1.5,
        adaptiveThreshold: Math.random() > 0.5,
        anomalyDetectionMethod: ['statistical', 'dtw', 'hybrid'][Math.floor(Math.random() * 3)]
      };
    }
  }

  calculateReward(metrics) {
    // Weighted reward function
    const accuracyWeight = 0.3;
    const precisionWeight = 0.2;
    const recallWeight = 0.2;
    const latencyWeight = 0.15;
    const throughputWeight = 0.15;

    const normalizedLatency = Math.max(0, 1 - metrics.latency / 100);
    const normalizedThroughput = Math.min(1, metrics.throughput / 1000);

    return (
      metrics.accuracy * accuracyWeight +
      metrics.precision * precisionWeight +
      metrics.recall * recallWeight +
      normalizedLatency * latencyWeight +
      normalizedThroughput * throughputWeight
    );
  }

  disableAutoTuning() {
    if (this.autoTuneInterval) {
      clearInterval(this.autoTuneInterval);
      console.log('\n✓ Auto-tuning disabled');
    }
  }

  getStatistics() {
    return {
      episodeCount: this.episodeCount,
      bestReward: this.bestReward,
      bestParams: this.bestParams,
      explorationRate: this.explorationRate
    };
  }
}

class MockMidstreamer {
  constructor(config) {
    this.config = config;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  async analyzeStream(dataSource) {
    // Simulate streaming analysis with realistic metrics
    const baseAccuracy = 0.75 + Math.random() * 0.15;
    const basePrecision = 0.70 + Math.random() * 0.20;
    const baseRecall = 0.65 + Math.random() * 0.25;

    // Better parameters = better metrics
    const windowOptimality = 1 - Math.abs(this.config.windowSize - 147) / 147;
    const thresholdOptimality = 1 - Math.abs(this.config.threshold - 1.82) / 1.82;

    return {
      accuracy: Math.min(0.95, baseAccuracy + windowOptimality * 0.15),
      precision: Math.min(0.95, basePrecision + thresholdOptimality * 0.15),
      recall: Math.min(0.95, baseRecall + (windowOptimality + thresholdOptimality) * 0.05),
      falsePositiveRate: Math.max(0.02, 0.15 - windowOptimality * 0.1),
      processingTime: 30 + Math.random() * 40,
      eventsPerSecond: 500 + Math.random() * 500
    };
  }
}

class MockAgentDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
  }

  async initialize() {
    console.log(`✓ AgentDB initialized at ${this.dbPath}`);
  }
}

async function adaptiveStreaming() {
  console.log('='.repeat(60));
  console.log('Example 2: Adaptive Parameter Tuning');
  console.log('='.repeat(60));
  console.log();

  // Setup
  const dbPath = path.join(__dirname, 'agentdb-data');
  const agentdb = new MockAgentDB(dbPath);
  await agentdb.initialize();
  console.log();

  const engine = new AdaptiveLearningEngine(agentdb, {
    algorithm: 'actor_critic',
    learningRate: 0.001,
    explorationRate: 0.3
  });

  await engine.initializeAgent();
  console.log();

  const midstreamer = new MockMidstreamer({
    windowSize: 100,
    threshold: 2.0
  });

  console.log('📊 Initial Configuration:');
  console.log(`   Window size: ${midstreamer.config.windowSize}`);
  console.log(`   Threshold: ${midstreamer.config.threshold}`);
  console.log();

  // Enable auto-tuning
  console.log('🔄 Starting adaptive tuning...');
  console.log('   Running 30 episodes over 30 seconds...');
  console.log();

  const dataSource = {}; // Mock data source

  await engine.enableAutoTuning(1000, async (optimizedParams) => {
    // Apply optimized parameters to Midstreamer
    midstreamer.updateConfig({
      windowSize: Math.round(optimizedParams.windowSize),
      threshold: optimizedParams.threshold,
      sensitivity: optimizedParams.sensitivity
    });

    // Run streaming and collect metrics
    const metrics = await midstreamer.analyzeStream(dataSource);

    return {
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      falsePositiveRate: metrics.falsePositiveRate,
      latency: metrics.processingTime,
      throughput: metrics.eventsPerSecond,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0 // Would use actual CPU monitoring
    };
  });

  // Let it learn for 30 seconds (30 episodes)
  await new Promise(resolve => setTimeout(resolve, 30000));

  engine.disableAutoTuning();

  // Check results
  const stats = engine.getStatistics();
  const improvement = ((stats.bestReward / 0.8) * 100 - 100);

  console.log();
  console.log('='.repeat(60));
  console.log('📊 Adaptive Learning Results:');
  console.log('='.repeat(60));
  console.log(`Episodes: ${stats.episodeCount}`);
  console.log(`Best Reward: ${stats.bestReward.toFixed(3)}`);
  console.log(`Exploration Rate: ${stats.explorationRate.toFixed(3)}`);
  console.log();
  console.log('Best Parameters:');
  console.log(`  Window Size: ${Math.round(stats.bestParams.windowSize)}`);
  console.log(`  Threshold: ${stats.bestParams.threshold.toFixed(2)}`);
  console.log(`  Sensitivity: ${stats.bestParams.sensitivity.toFixed(2)}`);
  console.log(`  Adaptive Threshold: ${stats.bestParams.adaptiveThreshold}`);
  console.log(`  Detection Method: ${stats.bestParams.anomalyDetectionMethod}`);
  console.log();
  console.log(`Performance Improvement: ${improvement.toFixed(1)}%`);
  console.log();

  // Configuration tips
  console.log('💡 Configuration Tips:');
  console.log('   • Reduce learning rate if reward oscillates');
  console.log('   • Increase exploration if stuck in local optimum');
  console.log('   • Use longer intervals for more stable convergence');
  console.log('   • Save optimal parameters for future use');
  console.log();

  console.log('✓ Example complete!');
  console.log('='.repeat(60));
}

// Run the example
if (require.main === module) {
  adaptiveStreaming().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { adaptiveStreaming };
