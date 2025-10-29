/**
 * Adaptive Learning Engine
 * RL-based parameter optimization for Midstream + AgentDB integration
 *
 * Features:
 * - Actor-Critic RL algorithm via AgentDB
 * - 19-dimensional state space (params + metrics + characteristics)
 * - 5-dimensional action space (parameter adjustments)
 * - 10K experience replay buffer
 * - Multi-objective reward function (accuracy + latency + memory)
 * - Auto-tuning mode with configurable intervals
 * - State persistence for cross-session learning
 *
 * Performance Targets:
 * - Convergence: <500 episodes
 * - Improvement: >15% over static baseline
 * - Overhead: <5% of processing time
 */

// Real AgentDB package imports (published to npm)
import { LearningSystem, type LearningSession, type LearningConfig as AgentDBLearningConfig } from 'agentdb';
import { createDatabase } from 'agentdb';
import { EmbeddingService } from 'agentdb';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Streaming metrics from Midstreamer analysis
 */
export interface StreamingMetrics {
  // Accuracy metrics
  accuracy: number; // 0-1 (overall detection accuracy)
  precision: number; // 0-1 (true positives / all positives)
  recall: number; // 0-1 (true positives / actual anomalies)
  falsePositiveRate: number; // 0-1 (false alarms rate)

  // Performance metrics
  latency: number; // milliseconds (processing delay)
  throughput: number; // events/sec (processing rate)
  memoryUsage: number; // MB (memory consumption)
  cpuUsage: number; // 0-100 (CPU utilization)
}

/**
 * Streaming analysis parameters (to be optimized)
 */
export interface StreamingParameters {
  windowSize: number; // 10-1000 (analysis window size)
  slideSize: number; // 1-500 (sliding window step)
  threshold: number; // 0.1-10.0 (anomaly detection threshold)
  sensitivity: number; // 0.5-2.0 (detection sensitivity)
  adaptiveThreshold: boolean; // use adaptive thresholding
  anomalyDetectionMethod: 'dtw' | 'statistical' | 'hybrid';
}

/**
 * Complete state space for RL agent (19 dimensions)
 */
export interface StateSpace {
  // Current parameter configuration (6 dims)
  currentParams: StreamingParameters;

  // Recent performance metrics (8 dims)
  recentMetrics: StreamingMetrics;

  // Data characteristics (5 dims)
  dataCharacteristics: DataCharacteristics;

  // Historical performance tracker (1 dim)
  historicalPerformance: number; // rolling average reward
}

/**
 * Data stream characteristics
 */
export interface DataCharacteristics {
  variance: number; // 0-1 (data variance)
  trend: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
  seasonality: boolean; // periodic patterns detected
  outlierRate: number; // 0-1 (proportion of outliers)
  missingDataRate: number; // 0-1 (missing data proportion)
}

/**
 * Action space for parameter adjustments (5 dimensions)
 */
export interface Action {
  deltaWindowSize: number; // -50 to +50
  deltaSlideSize: number; // -25 to +25
  deltaThreshold: number; // -0.5 to +0.5
  deltaSensitivity: number; // -0.2 to +0.2
  changeMethod?: 'dtw' | 'statistical' | 'hybrid';
  toggleAdaptive?: boolean;
}

/**
 * Multi-objective reward function configuration
 */
export interface RewardFunction {
  weights: {
    accuracy: number; // weight for accuracy (typically positive)
    latency: number; // weight for latency (typically negative)
    memory: number; // weight for memory usage (typically negative)
    falsePositives: number; // weight for false positives (typically negative)
    throughput: number; // weight for throughput (typically positive)
  };
  normalize: boolean; // normalize metrics to 0-1 range
}

/**
 * RL algorithm configuration
 */
export interface LearningConfig {
  algorithm: 'actor_critic' | 'q_learning' | 'sarsa' | 'dqn';
  learningRate: number; // 0.0001-0.01 (learning step size)
  discountFactor: number; // 0.9-0.99 (gamma, future reward discount)
  explorationRate: number; // 0-1 (epsilon, exploration probability)
  explorationDecay: number; // 0.99-0.999 (epsilon decay rate)
  minExplorationRate: number; // 0.01-0.1 (minimum epsilon)
  batchSize: number; // 16-128 (training batch size)
  replayBufferSize: number; // 1000-10000 (experience replay capacity)
  targetUpdateFrequency: number; // 50-500 (target network update interval)
}

/**
 * Optimization result with confidence metrics
 */
export interface OptimizationResult {
  params: StreamingParameters; // optimized parameters
  confidence: number; // 0-1 (confidence in recommendation)
  expectedReward: number; // estimated reward
  explorationRate: number; // current exploration rate
}

/**
 * Experience transition for replay buffer
 */
export interface Transition {
  state: StateSpace;
  action: Action;
  reward: number;
  nextState: StateSpace;
  done: boolean;
}

/**
 * Learning statistics for monitoring
 */
export interface LearningStatistics {
  episodeCount: number;
  totalSteps: number;
  bestReward: number;
  bestParams: StreamingParameters | null;
  currentExplorationRate: number;
  replayBufferSize: number;
  averageReward: number;
  convergenceProgress: number; // 0-1
}

// ============================================================================
// Adaptive Learning Engine Implementation
// ============================================================================

/**
 * Main adaptive learning engine for streaming parameter optimization
 */
export class AdaptiveLearningEngine {
  private learningSystem: LearningSystem; // Real AgentDB LearningSystem
  private currentSessionId: string | null = null; // Active RL session
  private config: LearningConfig;
  private rewardFunction: RewardFunction;

  // State tracking
  private currentState: StateSpace;
  private episodeHistory: Transition[] = [];
  private rewardHistory: number[] = [];

  // Statistics
  private episodeCount: number = 0;
  private totalSteps: number = 0;
  private bestParams: StreamingParameters | null = null;
  private bestReward: number = -Infinity;

  // Auto-tuning
  private autoTuningInterval: NodeJS.Timeout | null = null;
  private autoTuningCallback: ((params: StreamingParameters) => Promise<StreamingMetrics>) | null = null;

  constructor(
    learningSystem: LearningSystem,
    config: Partial<LearningConfig> = {},
    rewardFunction: Partial<RewardFunction> = {}
  ) {
    this.learningSystem = learningSystem;

    // Default RL configuration (optimized for fast convergence)
    this.config = {
      algorithm: 'actor_critic', // Best for continuous action spaces
      learningRate: 0.001, // Moderate learning rate
      discountFactor: 0.99, // High future reward consideration
      explorationRate: 1.0, // Start with full exploration
      explorationDecay: 0.995, // Gradual decay
      minExplorationRate: 0.01, // Allow 1% exploration always
      batchSize: 32, // Standard batch size
      replayBufferSize: 10000, // 10K experience replay buffer
      targetUpdateFrequency: 100, // Update target every 100 steps
      ...config
    };

    // Default multi-objective reward function
    this.rewardFunction = {
      weights: {
        accuracy: 1.0, // Primary objective
        latency: -0.3, // Minimize latency
        memory: -0.2, // Minimize memory usage
        falsePositives: -0.8, // Heavily penalize false positives
        throughput: 0.5 // Maximize throughput
      },
      normalize: true,
      ...rewardFunction
    };

    // Initialize state
    this.currentState = this.getInitialState();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize RL agent with AgentDB
   */
  async initializeAgent(algorithm?: string, userId: string = 'adaptive-learning-engine'): Promise<void> {
    const algo = algorithm || this.config.algorithm;
    const stateDim = this.getStateDimension();
    const actionDim = this.getActionDimension();

    console.log(`Initializing RL agent: ${algo}`);
    console.log(`  State dimension: ${stateDim}`);
    console.log(`  Action dimension: ${actionDim}`);

    // Map our algorithm name to AgentDB session type
    const sessionTypeMap: Record<string, LearningSession['sessionType']> = {
      'actor_critic': 'actor-critic',
      'q_learning': 'q-learning',
      'sarsa': 'sarsa',
      'dqn': 'dqn'
    };

    const sessionType = sessionTypeMap[algo] || 'actor-critic';

    // Start AgentDB learning session with real LearningSystem API
    const agentdbConfig: AgentDBLearningConfig = {
      learningRate: this.config.learningRate,
      discountFactor: this.config.discountFactor,
      explorationRate: this.config.explorationRate,
      batchSize: this.config.batchSize,
      targetUpdateFrequency: this.config.targetUpdateFrequency
    };

    this.currentSessionId = await this.learningSystem.startSession(
      userId,
      sessionType,
      agentdbConfig
    );

    console.log(`✅ RL agent initialized successfully (session: ${this.currentSessionId})`);
  }

  // ==========================================================================
  // Learning Methods
  // ==========================================================================

  /**
   * Update agent from streaming metrics (online learning)
   */
  async updateFromMetrics(
    metrics: StreamingMetrics,
    currentParams: StreamingParameters
  ): Promise<void> {
    // Compute reward from metrics
    const reward = this.computeReward(metrics);
    this.rewardHistory.push(reward);

    // Create next state
    const nextState: StateSpace = {
      currentParams,
      recentMetrics: metrics,
      dataCharacteristics: this.analyzeDataCharacteristics(metrics),
      historicalPerformance: this.updateHistoricalPerformance(reward)
    };

    // Store transition if we have a previous action
    if (this.episodeHistory.length > 0) {
      const lastTransition = this.episodeHistory[this.episodeHistory.length - 1];
      lastTransition.nextState = nextState;
      lastTransition.reward = reward;
      lastTransition.done = false; // Streaming is continuous

      // Train agent on this transition
      await this.trainOnTransition(lastTransition);
    }

    // Update current state
    this.currentState = nextState;
    this.totalSteps++;

    // Track best parameters
    if (reward > this.bestReward) {
      this.bestReward = reward;
      this.bestParams = { ...currentParams };
      console.log(`🎯 New best reward: ${reward.toFixed(4)}`);
    }

    // Trim replay buffer if needed
    if (this.episodeHistory.length > this.config.replayBufferSize) {
      this.episodeHistory.shift();
    }
  }

  /**
   * Get optimized parameters from policy
   */
  async getOptimizedParams(): Promise<OptimizationResult> {
    if (!this.currentSessionId) {
      throw new Error('Agent not initialized. Call initializeAgent() first.');
    }

    // Encode current state to string for AgentDB
    const stateStr = JSON.stringify(this.encodeState(this.currentState));

    // Get action prediction from AgentDB LearningSystem
    const prediction = await this.learningSystem.predict(this.currentSessionId, stateStr);

    // Parse action from prediction
    let actionVector: number[];
    try {
      actionVector = JSON.parse(prediction.action);
    } catch {
      // Fallback to random action if parsing fails
      actionVector = this.sampleRandomAction();
    }

    // Decode action to parameter changes
    const action = this.decodeAction(actionVector);

    // Apply action to current parameters
    const newParams = this.applyAction(this.currentState.currentParams, action);

    // Store action for next update
    const transition: Transition = {
      state: this.currentState,
      action,
      reward: 0, // Will be filled in next update
      nextState: this.currentState, // Will be updated
      done: false
    };
    this.episodeHistory.push(transition);

    // Use AgentDB confidence score
    const confidence = prediction.confidence;

    // Estimate expected reward from qValue or default
    const expectedReward = prediction.qValue !== undefined ? prediction.qValue : 0;

    // Decay exploration rate
    this.config.explorationRate = Math.max(
      this.config.minExplorationRate,
      this.config.explorationRate * this.config.explorationDecay
    );

    return {
      params: newParams,
      confidence,
      expectedReward,
      explorationRate: this.config.explorationRate
    };
  }

  /**
   * Enable continuous auto-tuning mode
   */
  async enableAutoTuning(
    evaluationInterval: number,
    onParamsUpdated: (params: StreamingParameters) => Promise<StreamingMetrics>
  ): Promise<void> {
    if (this.autoTuningInterval) {
      this.disableAutoTuning();
    }

    this.autoTuningCallback = onParamsUpdated;

    this.autoTuningInterval = setInterval(async () => {
      try {
        const startTime = Date.now();

        // Get optimized parameters
        const result = await this.getOptimizedParams();

        // Apply parameters and get feedback metrics
        const metrics = await onParamsUpdated(result.params);

        // Update agent with feedback
        await this.updateFromMetrics(metrics, result.params);

        const overhead = Date.now() - startTime;
        const overheadPercent = (overhead / evaluationInterval) * 100;

        this.episodeCount++;

        console.log(`📊 Auto-tuning episode ${this.episodeCount}`);
        console.log(`  Reward: ${this.computeReward(metrics).toFixed(4)}`);
        console.log(`  Exploration: ${result.explorationRate.toFixed(4)}`);
        console.log(`  Confidence: ${result.confidence.toFixed(4)}`);
        console.log(`  Overhead: ${overheadPercent.toFixed(2)}%`);

        // Check if overhead is within target (<5%)
        if (overheadPercent > 5.0) {
          console.warn(`⚠️  Learning overhead exceeds target: ${overheadPercent.toFixed(2)}%`);
        }
      } catch (error) {
        console.error('❌ Auto-tuning error:', error);
      }
    }, evaluationInterval);

    console.log(`🚀 Auto-tuning enabled (interval: ${evaluationInterval}ms)`);
  }

  /**
   * Disable auto-tuning
   */
  disableAutoTuning(): void {
    if (this.autoTuningInterval) {
      clearInterval(this.autoTuningInterval);
      this.autoTuningInterval = null;
      this.autoTuningCallback = null;
      console.log('⏸️  Auto-tuning disabled');
    }
  }

  // ==========================================================================
  // Reward Function
  // ==========================================================================

  /**
   * Compute multi-objective reward from metrics
   */
  private computeReward(metrics: StreamingMetrics): number {
    const w = this.rewardFunction.weights;

    // Normalize metrics if enabled
    let accuracy = metrics.accuracy;
    let latency = metrics.latency;
    let memory = metrics.memoryUsage;
    let falsePositives = metrics.falsePositiveRate;
    let throughput = metrics.throughput;

    if (this.rewardFunction.normalize) {
      // Normalize to 0-1 range
      latency = latency / 1000; // ms to seconds (assuming <1s)
      memory = memory / 1000; // MB to GB (assuming <1GB)
      throughput = throughput / 10000; // normalize to ~0-1
    }

    // Compute weighted sum
    const reward =
      w.accuracy * accuracy +
      w.latency * latency + // negative weight, so lower is better
      w.memory * memory + // negative weight
      w.falsePositives * falsePositives + // negative weight
      w.throughput * throughput;

    return reward;
  }

  // ==========================================================================
  // State Encoding/Decoding
  // ==========================================================================

  /**
   * Encode state to 19-dimensional vector
   */
  private encodeState(state: StateSpace): number[] {
    const encoded: number[] = [];

    // Parameters (6 dimensions, normalized to 0-1)
    encoded.push(
      (state.currentParams.windowSize - 10) / 990, // 10-1000 → 0-1
      (state.currentParams.slideSize - 1) / 499, // 1-500 → 0-1
      (state.currentParams.threshold - 0.1) / 9.9, // 0.1-10 → 0-1
      (state.currentParams.sensitivity - 0.5) / 1.5, // 0.5-2.0 → 0-1
      state.currentParams.adaptiveThreshold ? 1 : 0,
      state.currentParams.anomalyDetectionMethod === 'dtw' ? 1 :
      state.currentParams.anomalyDetectionMethod === 'statistical' ? 0.5 : 0.75
    );

    // Recent metrics (8 dimensions)
    encoded.push(
      state.recentMetrics.accuracy,
      state.recentMetrics.precision,
      state.recentMetrics.recall,
      state.recentMetrics.falsePositiveRate,
      state.recentMetrics.latency / 1000, // Normalize
      state.recentMetrics.throughput / 10000,
      state.recentMetrics.memoryUsage / 1000,
      state.recentMetrics.cpuUsage / 100
    );

    // Data characteristics (5 dimensions)
    encoded.push(
      state.dataCharacteristics.variance,
      state.dataCharacteristics.trend === 'increasing' ? 1 :
      state.dataCharacteristics.trend === 'decreasing' ? -1 :
      state.dataCharacteristics.trend === 'stable' ? 0 : 0.5,
      state.dataCharacteristics.seasonality ? 1 : 0,
      state.dataCharacteristics.outlierRate,
      state.dataCharacteristics.missingDataRate
    );

    // Historical performance (1 dimension)
    encoded.push(state.historicalPerformance);

    return encoded; // Total: 19 dimensions
  }

  /**
   * Decode action vector to parameter changes (5 dimensions)
   */
  private decodeAction(actionVector: number[]): Action {
    return {
      deltaWindowSize: Math.round(actionVector[0] * 100 - 50), // -50 to +50
      deltaSlideSize: Math.round(actionVector[1] * 50 - 25), // -25 to +25
      deltaThreshold: actionVector[2] * 1 - 0.5, // -0.5 to +0.5
      deltaSensitivity: actionVector[3] * 0.4 - 0.2, // -0.2 to +0.2
      changeMethod: actionVector[4] > 0.66 ? 'hybrid' :
                    actionVector[4] > 0.33 ? 'dtw' : 'statistical',
      toggleAdaptive: actionVector[4] > 0.5
    };
  }

  /**
   * Sample random action (exploration)
   */
  private sampleRandomAction(): number[] {
    return [
      Math.random(), // windowSize delta
      Math.random(), // slideSize delta
      Math.random(), // threshold delta
      Math.random(), // sensitivity delta
      Math.random()  // method/adaptive toggle
    ];
  }

  /**
   * Apply action to parameters with safety bounds
   */
  private applyAction(
    currentParams: StreamingParameters,
    action: Action
  ): StreamingParameters {
    const newParams: StreamingParameters = { ...currentParams };

    // Apply deltas with clamping
    newParams.windowSize = this.clamp(
      currentParams.windowSize + action.deltaWindowSize,
      10, 1000
    );

    newParams.slideSize = this.clamp(
      currentParams.slideSize + action.deltaSlideSize,
      1, 500
    );

    newParams.threshold = this.clamp(
      currentParams.threshold + action.deltaThreshold,
      0.1, 10.0
    );

    newParams.sensitivity = this.clamp(
      currentParams.sensitivity + action.deltaSensitivity,
      0.5, 2.0
    );

    // Apply method change if specified
    if (action.changeMethod) {
      newParams.anomalyDetectionMethod = action.changeMethod;
    }

    // Toggle adaptive if specified
    if (action.toggleAdaptive !== undefined) {
      newParams.adaptiveThreshold = action.toggleAdaptive;
    }

    return newParams;
  }

  // ==========================================================================
  // Training
  // ==========================================================================

  /**
   * Train agent on transition (experience replay)
   */
  private async trainOnTransition(transition: Transition): Promise<void> {
    if (!this.currentSessionId) {
      return; // Skip if no active session
    }

    const stateStr = JSON.stringify(this.encodeState(transition.state));
    const nextStateStr = JSON.stringify(this.encodeState(transition.nextState));
    const actionStr = JSON.stringify(this.encodeActionForTraining(transition.action));

    // Submit feedback to AgentDB LearningSystem
    await this.learningSystem.submitFeedback({
      sessionId: this.currentSessionId,
      action: actionStr,
      state: stateStr,
      reward: transition.reward,
      nextState: nextStateStr,
      success: transition.reward > 0,
      timestamp: Date.now()
    });

    // Train policy periodically with AgentDB
    if (this.totalSteps % this.config.batchSize === 0) {
      await this.learningSystem.train(
        this.currentSessionId,
        1, // epochs
        this.config.batchSize,
        this.config.learningRate
      );
    }
  }

  /**
   * Encode action for training (normalize to 0-1)
   */
  private encodeActionForTraining(action: Action): number[] {
    return [
      (action.deltaWindowSize + 50) / 100, // -50 to +50 → 0 to 1
      (action.deltaSlideSize + 25) / 50, // -25 to +25 → 0 to 1
      (action.deltaThreshold + 0.5) / 1, // -0.5 to +0.5 → 0 to 1
      (action.deltaSensitivity + 0.2) / 0.4, // -0.2 to +0.2 → 0 to 1
      action.changeMethod === 'hybrid' ? 0.75 :
      action.changeMethod === 'dtw' ? 0.5 : 0.25
    ];
  }

  /**
   * Estimate value function for state
   */
  private async estimateValue(stateVector: number[]): Promise<number> {
    // AgentDB doesn't expose value function directly
    // Use historical average as estimate
    return this.currentState.historicalPerformance;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private getStateDimension(): number {
    // 6 (params) + 8 (metrics) + 5 (data characteristics) + 1 (historical) = 20
    // Note: Adjusted from template's 19 to 20 with slideSize addition
    return 20;
  }

  private getActionDimension(): number {
    // 5 action components (windowSize, slideSize, threshold, sensitivity, method/toggle)
    return 5;
  }

  private getInitialState(): StateSpace {
    return {
      currentParams: {
        windowSize: 100,
        slideSize: 10,
        threshold: 2.0,
        sensitivity: 1.0,
        adaptiveThreshold: false,
        anomalyDetectionMethod: 'hybrid'
      },
      recentMetrics: {
        accuracy: 0.8,
        precision: 0.8,
        recall: 0.8,
        falsePositiveRate: 0.1,
        latency: 50,
        throughput: 1000,
        memoryUsage: 100,
        cpuUsage: 30
      },
      dataCharacteristics: {
        variance: 0.5,
        trend: 'stable',
        seasonality: false,
        outlierRate: 0.05,
        missingDataRate: 0.01
      },
      historicalPerformance: 0.0
    };
  }

  private analyzeDataCharacteristics(metrics: StreamingMetrics): DataCharacteristics {
    // Simplified analysis (in production, use actual stream statistics)
    // This would analyze the incoming data stream for patterns
    return {
      variance: Math.random() * 0.5 + 0.25, // 0.25-0.75
      trend: Math.random() > 0.5 ? 'stable' : 'oscillating',
      seasonality: false,
      outlierRate: metrics.falsePositiveRate * 0.5, // Rough approximation
      missingDataRate: 0.01
    };
  }

  private updateHistoricalPerformance(reward: number): number {
    const alpha = 0.1; // Exponential moving average smoothing factor
    return alpha * reward + (1 - alpha) * this.currentState.historicalPerformance;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // ==========================================================================
  // Monitoring & Diagnostics
  // ==========================================================================

  /**
   * Get learning statistics
   */
  getStatistics(): LearningStatistics {
    const avgReward = this.rewardHistory.length > 0
      ? this.rewardHistory.reduce((a, b) => a + b, 0) / this.rewardHistory.length
      : 0;

    // Estimate convergence progress (0-1)
    // Based on exploration decay and reward stability
    const convergenceProgress = Math.min(1.0,
      (1 - this.config.explorationRate) * 0.5 +
      (this.episodeCount / 500) * 0.5 // Target: 500 episodes
    );

    return {
      episodeCount: this.episodeCount,
      totalSteps: this.totalSteps,
      bestReward: this.bestReward,
      bestParams: this.bestParams,
      currentExplorationRate: this.config.explorationRate,
      replayBufferSize: this.episodeHistory.length,
      averageReward: avgReward,
      convergenceProgress
    };
  }

  /**
   * Export learning state for persistence
   */
  async exportState(): Promise<any> {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config: this.config,
      rewardFunction: this.rewardFunction,
      statistics: this.getStatistics(),
      currentState: this.currentState,
      episodeHistory: this.episodeHistory,
      rewardHistory: this.rewardHistory,
      currentSessionId: this.currentSessionId
    };
  }

  /**
   * Import learning state from persistence
   */
  async importState(state: any): Promise<void> {
    if (state.version !== '1.0.0') {
      throw new Error(`Unsupported state version: ${state.version}`);
    }

    this.config = state.config;
    this.rewardFunction = state.rewardFunction;
    this.currentState = state.currentState;
    this.episodeHistory = state.episodeHistory || [];
    this.rewardHistory = state.rewardHistory || [];

    const stats = state.statistics;
    this.episodeCount = stats.episodeCount;
    this.totalSteps = stats.totalSteps;
    this.bestReward = stats.bestReward;
    this.bestParams = stats.bestParams;
    this.currentSessionId = state.currentSessionId || null;

    console.log(`📥 Learning state imported (${this.episodeCount} episodes, ${this.totalSteps} steps)`);
  }

  /**
   * Reset learning state (start fresh)
   */
  reset(): void {
    this.currentState = this.getInitialState();
    this.episodeHistory = [];
    this.rewardHistory = [];
    this.episodeCount = 0;
    this.totalSteps = 0;
    this.bestParams = null;
    this.bestReward = -Infinity;
    this.config.explorationRate = 1.0;

    console.log('🔄 Learning state reset');
  }
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Basic adaptive learning setup
 */
export async function exampleBasicAdaptiveLearning(agentdb: any) {
  // Create engine with default config
  const engine = new AdaptiveLearningEngine(agentdb);

  // Initialize RL agent
  await engine.initializeAgent('actor_critic');

  // Simulate feedback loop
  for (let i = 0; i < 100; i++) {
    // Get optimized parameters
    const result = await engine.getOptimizedParams();
    console.log(`Episode ${i}: confidence=${result.confidence.toFixed(3)}`);

    // Simulate metrics (replace with actual Midstreamer metrics)
    const metrics: StreamingMetrics = {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.8 + Math.random() * 0.15,
      recall: 0.82 + Math.random() * 0.13,
      falsePositiveRate: 0.05 + Math.random() * 0.05,
      latency: 40 + Math.random() * 30,
      throughput: 900 + Math.random() * 200,
      memoryUsage: 90 + Math.random() * 20,
      cpuUsage: 25 + Math.random() * 15
    };

    // Update agent
    await engine.updateFromMetrics(metrics, result.params);
  }

  const stats = engine.getStatistics();
  console.log('\nLearning Results:');
  console.log(`  Episodes: ${stats.episodeCount}`);
  console.log(`  Best Reward: ${stats.bestReward.toFixed(4)}`);
  console.log(`  Convergence: ${(stats.convergenceProgress * 100).toFixed(1)}%`);
}

/**
 * Example: Auto-tuning mode with real Midstreamer integration
 */
export async function exampleAutoTuning(
  agentdb: any,
  midstreamer: any // Midstream analyzer instance
) {
  const engine = new AdaptiveLearningEngine(agentdb, {
    learningRate: 0.001,
    explorationRate: 0.5, // Start with 50% exploration
    replayBufferSize: 10000
  });

  await engine.initializeAgent();

  // Enable auto-tuning with 5-second intervals
  await engine.enableAutoTuning(5000, async (params) => {
    // Apply parameters to Midstreamer
    midstreamer.updateParameters(params);

    // Run analysis and collect metrics
    const results = await midstreamer.analyze();

    // Return metrics for learning
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

  console.log('🚀 Auto-tuning enabled. Press Ctrl+C to stop.');

  // Run for 10 minutes (120 episodes at 5s intervals)
  await new Promise(resolve => setTimeout(resolve, 600000));

  engine.disableAutoTuning();

  const stats = engine.getStatistics();
  console.log('\n📊 Final Statistics:');
  console.log(`  Episodes: ${stats.episodeCount}`);
  console.log(`  Total Steps: ${stats.totalSteps}`);
  console.log(`  Best Reward: ${stats.bestReward.toFixed(4)}`);
  console.log(`  Average Reward: ${stats.averageReward.toFixed(4)}`);
  console.log(`  Best Parameters:`, stats.bestParams);
  console.log(`  Convergence: ${(stats.convergenceProgress * 100).toFixed(1)}%`);

  // Export state for future use
  const state = await engine.exportState();
  // Save to file: fs.writeFileSync('learning-state.json', JSON.stringify(state));
}

/**
 * Example: State persistence across sessions
 */
export async function exampleStatePersistence(agentdb: any) {
  const engine = new AdaptiveLearningEngine(agentdb);
  await engine.initializeAgent();

  // Check if previous state exists
  // const previousState = loadStateFromFile('learning-state.json');
  // if (previousState) {
  //   await engine.importState(previousState);
  //   console.log('✅ Resumed from previous learning state');
  // }

  // Continue learning...
  // ... training loop ...

  // Export state periodically
  setInterval(async () => {
    const state = await engine.exportState();
    // saveStateToFile('learning-state.json', state);
    console.log('💾 State saved');
  }, 60000); // Every minute
}
