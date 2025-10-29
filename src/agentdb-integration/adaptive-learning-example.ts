/**
 * Adaptive Learning Engine - Integration Example
 * Demonstrates complete integration with Midstream + AgentDB
 */

import { AdaptiveLearningEngine, StreamingMetrics, StreamingParameters } from './adaptive-learning-engine';

// ============================================================================
// Mock Midstream Analyzer (replace with actual implementation)
// ============================================================================

class MockMidstreamAnalyzer {
  private currentParams: StreamingParameters;
  private dataStream: number[] = [];

  constructor() {
    this.currentParams = {
      windowSize: 100,
      slideSize: 10,
      threshold: 2.0,
      sensitivity: 1.0,
      adaptiveThreshold: false,
      anomalyDetectionMethod: 'hybrid'
    };
  }

  updateParameters(params: StreamingParameters): void {
    this.currentParams = params;
    console.log('📊 Parameters updated:', {
      windowSize: params.windowSize,
      slideSize: params.slideSize,
      threshold: params.threshold.toFixed(2),
      sensitivity: params.sensitivity.toFixed(2),
      method: params.anomalyDetectionMethod
    });
  }

  async analyze(): Promise<any> {
    // Simulate analysis with current parameters
    const baseAccuracy = 0.85;
    const windowEffect = (this.currentParams.windowSize - 100) / 1000; // Larger window = slightly better accuracy
    const thresholdEffect = Math.abs(2.0 - this.currentParams.threshold) * -0.05; // Optimal at 2.0
    const sensitivityEffect = Math.abs(1.0 - this.currentParams.sensitivity) * -0.03;

    const accuracy = Math.max(0.5, Math.min(1.0,
      baseAccuracy + windowEffect + thresholdEffect + sensitivityEffect + (Math.random() * 0.1 - 0.05)
    ));

    const precision = accuracy * (0.9 + Math.random() * 0.1);
    const recall = accuracy * (0.85 + Math.random() * 0.15);
    const falsePositiveRate = (1 - accuracy) * (0.3 + Math.random() * 0.2);

    // Latency increases with window size
    const processingTime = 20 + (this.currentParams.windowSize / 10) + Math.random() * 20;

    // Throughput decreases with window size
    const eventsPerSecond = Math.max(100, 2000 - this.currentParams.windowSize + Math.random() * 200);

    // Memory increases with window size
    const memoryMB = 50 + (this.currentParams.windowSize / 5) + Math.random() * 30;

    const cpuPercent = 20 + (this.currentParams.windowSize / 20) + Math.random() * 20;

    return {
      accuracy,
      precision,
      recall,
      falsePositiveRate,
      processingTime,
      eventsPerSecond,
      memoryMB,
      cpuPercent
    };
  }
}

// ============================================================================
// Mock AgentDB (replace with actual AgentDB import)
// ============================================================================

class MockAgentDB {
  private agents: Map<string, any> = new Map();

  async initialize(): Promise<void> {
    console.log('✅ AgentDB initialized');
  }

  async createRLAgent(config: any): Promise<any> {
    const agent = new MockRLAgent(config);
    this.agents.set('rl-agent-1', agent);
    return agent;
  }
}

class MockRLAgent {
  private config: any;
  private experiences: any[] = [];
  private policy: number[][] = [];

  constructor(config: any) {
    this.config = config;
  }

  async selectAction(state: number[]): Promise<number[]> {
    // Simple mock policy: return normalized state-dependent action
    return [
      (state[0] + state[5] + Math.random() * 0.2) / 2,
      (state[1] + state[6] + Math.random() * 0.2) / 2,
      (state[2] + state[7] + Math.random() * 0.2) / 2,
      (state[3] + state[8] + Math.random() * 0.2) / 2,
      Math.random()
    ];
  }

  async addExperience(exp: any): Promise<void> {
    this.experiences.push(exp);
    if (this.experiences.length > this.config.config.replayBufferSize) {
      this.experiences.shift();
    }
  }

  async train(): Promise<void> {
    // Mock training
    console.log(`🧠 Training on ${this.experiences.length} experiences`);
  }

  async updateTargetNetwork(): Promise<void> {
    // Mock target network update
    console.log('🎯 Target network updated');
  }

  async estimateValue(state: number[]): Promise<number> {
    // Mock value estimation
    return state.reduce((a, b) => a + b, 0) / state.length;
  }

  async export(): Promise<any> {
    return {
      config: this.config,
      experiences: this.experiences.length,
      policy: this.policy
    };
  }

  async import(state: any): Promise<void> {
    this.config = state.config;
    this.policy = state.policy || [];
  }
}

// ============================================================================
// Integration Examples
// ============================================================================

/**
 * Example 1: Basic integration with manual feedback loop
 */
export async function example1_BasicIntegration() {
  console.log('\n' + '='.repeat(60));
  console.log('Example 1: Basic Integration with Manual Feedback');
  console.log('='.repeat(60) + '\n');

  const agentdb = new MockAgentDB();
  await agentdb.initialize();

  const midstreamer = new MockMidstreamAnalyzer();
  const engine = new AdaptiveLearningEngine(agentdb);

  await engine.initializeAgent('actor_critic');

  console.log('🚀 Running 50 episodes of adaptive learning...\n');

  for (let i = 0; i < 50; i++) {
    // Get optimized parameters
    const result = await engine.getOptimizedParams();

    // Apply to Midstreamer
    midstreamer.updateParameters(result.params);

    // Run analysis
    const analysisResults = await midstreamer.analyze();

    // Create metrics
    const metrics: StreamingMetrics = {
      accuracy: analysisResults.accuracy,
      precision: analysisResults.precision,
      recall: analysisResults.recall,
      falsePositiveRate: analysisResults.falsePositiveRate,
      latency: analysisResults.processingTime,
      throughput: analysisResults.eventsPerSecond,
      memoryUsage: analysisResults.memoryMB,
      cpuUsage: analysisResults.cpuPercent
    };

    // Update engine
    await engine.updateFromMetrics(metrics, result.params);

    if (i % 10 === 0 || i === 49) {
      console.log(`\nEpisode ${i + 1}/50`);
      console.log(`  Accuracy: ${metrics.accuracy.toFixed(4)}`);
      console.log(`  Latency: ${metrics.latency.toFixed(2)}ms`);
      console.log(`  Throughput: ${metrics.throughput.toFixed(0)} events/s`);
      console.log(`  Memory: ${metrics.memoryUsage.toFixed(1)}MB`);
      console.log(`  Confidence: ${result.confidence.toFixed(4)}`);
      console.log(`  Exploration: ${result.explorationRate.toFixed(4)}`);
    }
  }

  const stats = engine.getStatistics();
  console.log('\n' + '-'.repeat(60));
  console.log('📊 Final Statistics:');
  console.log('-'.repeat(60));
  console.log(`Episodes: ${stats.episodeCount}`);
  console.log(`Total Steps: ${stats.totalSteps}`);
  console.log(`Best Reward: ${stats.bestReward.toFixed(4)}`);
  console.log(`Average Reward: ${stats.averageReward.toFixed(4)}`);
  console.log(`Convergence: ${(stats.convergenceProgress * 100).toFixed(1)}%`);
  console.log('\nBest Parameters:');
  console.log(`  Window Size: ${stats.bestParams?.windowSize}`);
  console.log(`  Slide Size: ${stats.bestParams?.slideSize}`);
  console.log(`  Threshold: ${stats.bestParams?.threshold.toFixed(2)}`);
  console.log(`  Sensitivity: ${stats.bestParams?.sensitivity.toFixed(2)}`);
  console.log(`  Method: ${stats.bestParams?.anomalyDetectionMethod}`);
  console.log(`  Adaptive: ${stats.bestParams?.adaptiveThreshold}`);
}

/**
 * Example 2: Auto-tuning mode with continuous optimization
 */
export async function example2_AutoTuning() {
  console.log('\n' + '='.repeat(60));
  console.log('Example 2: Auto-Tuning Mode (30 seconds)');
  console.log('='.repeat(60) + '\n');

  const agentdb = new MockAgentDB();
  await agentdb.initialize();

  const midstreamer = new MockMidstreamAnalyzer();
  const engine = new AdaptiveLearningEngine(agentdb, {
    learningRate: 0.001,
    explorationRate: 0.5, // Start with 50% exploration
    explorationDecay: 0.99
  });

  await engine.initializeAgent();

  console.log('🚀 Auto-tuning enabled (5-second intervals)...\n');

  // Enable auto-tuning
  await engine.enableAutoTuning(5000, async (params) => {
    midstreamer.updateParameters(params);
    const results = await midstreamer.analyze();

    return {
      accuracy: results.accuracy,
      precision: results.precision,
      recall: results.recall,
      falsePositiveRate: results.falsePositiveRate,
      latency: results.processingTime,
      throughput: results.eventsPerSecond,
      memoryUsage: results.memoryMB,
      cpuUsage: results.cpuPercent
    };
  });

  // Run for 30 seconds (6 episodes)
  await new Promise(resolve => setTimeout(resolve, 30000));

  engine.disableAutoTuning();

  const stats = engine.getStatistics();
  console.log('\n' + '-'.repeat(60));
  console.log('📊 Auto-Tuning Results:');
  console.log('-'.repeat(60));
  console.log(`Episodes: ${stats.episodeCount}`);
  console.log(`Best Reward: ${stats.bestReward.toFixed(4)}`);
  console.log(`Average Reward: ${stats.averageReward.toFixed(4)}`);
  console.log(`Current Exploration: ${stats.currentExplorationRate.toFixed(4)}`);
  console.log(`Convergence: ${(stats.convergenceProgress * 100).toFixed(1)}%`);
}

/**
 * Example 3: State persistence across sessions
 */
export async function example3_StatePersistence() {
  console.log('\n' + '='.repeat(60));
  console.log('Example 3: State Persistence');
  console.log('='.repeat(60) + '\n');

  const agentdb = new MockAgentDB();
  await agentdb.initialize();

  const midstreamer = new MockMidstreamAnalyzer();
  const engine = new AdaptiveLearningEngine(agentdb);

  await engine.initializeAgent();

  console.log('🚀 Training for 20 episodes...\n');

  // Train for 20 episodes
  for (let i = 0; i < 20; i++) {
    const result = await engine.getOptimizedParams();
    midstreamer.updateParameters(result.params);
    const analysisResults = await midstreamer.analyze();

    const metrics: StreamingMetrics = {
      accuracy: analysisResults.accuracy,
      precision: analysisResults.precision,
      recall: analysisResults.recall,
      falsePositiveRate: analysisResults.falsePositiveRate,
      latency: analysisResults.processingTime,
      throughput: analysisResults.eventsPerSecond,
      memoryUsage: analysisResults.memoryMB,
      cpuUsage: analysisResults.cpuPercent
    };

    await engine.updateFromMetrics(metrics, result.params);
  }

  // Export state
  const state = await engine.exportState();
  console.log('💾 State exported:');
  console.log(`  Version: ${state.version}`);
  console.log(`  Episodes: ${state.statistics.episodeCount}`);
  console.log(`  Total Steps: ${state.statistics.totalSteps}`);
  console.log(`  Best Reward: ${state.statistics.bestReward.toFixed(4)}`);

  // Simulate new session
  console.log('\n🔄 Simulating new session...\n');
  const engine2 = new AdaptiveLearningEngine(agentdb);
  await engine2.initializeAgent();

  // Import state
  await engine2.importState(state);

  // Continue training
  console.log('🚀 Continuing training for 10 more episodes...\n');
  for (let i = 0; i < 10; i++) {
    const result = await engine2.getOptimizedParams();
    midstreamer.updateParameters(result.params);
    const analysisResults = await midstreamer.analyze();

    const metrics: StreamingMetrics = {
      accuracy: analysisResults.accuracy,
      precision: analysisResults.precision,
      recall: analysisResults.recall,
      falsePositiveRate: analysisResults.falsePositiveRate,
      latency: analysisResults.processingTime,
      throughput: analysisResults.eventsPerSecond,
      memoryUsage: analysisResults.memoryMB,
      cpuUsage: analysisResults.cpuPercent
    };

    await engine2.updateFromMetrics(metrics, result.params);
  }

  const stats2 = engine2.getStatistics();
  console.log('\n' + '-'.repeat(60));
  console.log('📊 Final Statistics (after resume):');
  console.log('-'.repeat(60));
  console.log(`Total Episodes: ${stats2.episodeCount}`);
  console.log(`Total Steps: ${stats2.totalSteps}`);
  console.log(`Best Reward: ${stats2.bestReward.toFixed(4)}`);
  console.log(`Average Reward: ${stats2.averageReward.toFixed(4)}`);
  console.log(`Convergence: ${(stats2.convergenceProgress * 100).toFixed(1)}%`);
}

/**
 * Example 4: Custom reward function
 */
export async function example4_CustomReward() {
  console.log('\n' + '='.repeat(60));
  console.log('Example 4: Custom Reward Function');
  console.log('='.repeat(60) + '\n');

  const agentdb = new MockAgentDB();
  await agentdb.initialize();

  const midstreamer = new MockMidstreamAnalyzer();

  // Custom reward emphasizing low latency and high throughput
  const customReward = {
    weights: {
      accuracy: 0.8, // Slightly less emphasis on accuracy
      latency: -0.6, // Heavy penalty for latency
      memory: -0.1, // Less concern for memory
      falsePositives: -0.5, // Moderate penalty
      throughput: 0.9 // High reward for throughput
    },
    normalize: true
  };

  const engine = new AdaptiveLearningEngine(agentdb, {}, customReward);
  await engine.initializeAgent();

  console.log('🚀 Training with custom reward (throughput + latency focus)...\n');

  for (let i = 0; i < 30; i++) {
    const result = await engine.getOptimizedParams();
    midstreamer.updateParameters(result.params);
    const analysisResults = await midstreamer.analyze();

    const metrics: StreamingMetrics = {
      accuracy: analysisResults.accuracy,
      precision: analysisResults.precision,
      recall: analysisResults.recall,
      falsePositiveRate: analysisResults.falsePositiveRate,
      latency: analysisResults.processingTime,
      throughput: analysisResults.eventsPerSecond,
      memoryUsage: analysisResults.memoryMB,
      cpuUsage: analysisResults.cpuPercent
    };

    await engine.updateFromMetrics(metrics, result.params);

    if (i % 10 === 0 || i === 29) {
      console.log(`Episode ${i + 1}/30`);
      console.log(`  Accuracy: ${metrics.accuracy.toFixed(4)}`);
      console.log(`  Latency: ${metrics.latency.toFixed(2)}ms ⚡`);
      console.log(`  Throughput: ${metrics.throughput.toFixed(0)} events/s 🚀`);
    }
  }

  const stats = engine.getStatistics();
  console.log('\n' + '-'.repeat(60));
  console.log('📊 Results (optimized for throughput/latency):');
  console.log('-'.repeat(60));
  console.log(`Best Reward: ${stats.bestReward.toFixed(4)}`);
  console.log(`Average Reward: ${stats.averageReward.toFixed(4)}`);
  console.log('\nOptimized Parameters:');
  console.log(`  Window Size: ${stats.bestParams?.windowSize}`);
  console.log(`  Slide Size: ${stats.bestParams?.slideSize}`);
  console.log(`  Threshold: ${stats.bestParams?.threshold.toFixed(2)}`);
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('\n🎯 Adaptive Learning Engine - Integration Examples\n');

  try {
    await example1_BasicIntegration();
    await example2_AutoTuning();
    await example3_StatePersistence();
    await example4_CustomReward();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
