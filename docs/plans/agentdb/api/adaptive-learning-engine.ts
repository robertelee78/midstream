/**
 * Adaptive Learning Engine
 * Reinforcement learning-based parameter optimization for streaming
 *
 * Integration: AgentDB RL → Midstreamer Parameters
 */

import { AgentDB, RLAlgorithm } from 'agentdb';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface StreamingMetrics {
  accuracy: number; // 0-1
  precision: number; // 0-1
  recall: number; // 0-1
  falsePositiveRate: number; // 0-1
  latency: number; // milliseconds
  throughput: number; // events/sec
  memoryUsage: number; // MB
  cpuUsage: number; // 0-100
}

export interface StreamingParameters {
  windowSize: number; // 10-1000
  threshold: number; // 0.1-10.0
  sensitivity: number; // 0.5-2.0
  adaptiveThreshold: boolean;
  anomalyDetectionMethod: 'dtw' | 'statistical' | 'hybrid';
}

export interface StateSpace {
  currentParams: StreamingParameters;
  recentMetrics: StreamingMetrics;
  dataCharacteristics: DataCharacteristics;
  historicalPerformance: number; // rolling average reward
}

export interface DataCharacteristics {
  variance: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
  seasonality: boolean;
  outlierRate: number;
  missingDataRate: number;
}

export interface Action {
  deltaWindowSize: number; // -50 to +50
  deltaThreshold: number; // -0.5 to +0.5
  deltaSensitivity: number; // -0.2 to +0.2
  changeMethod?: 'dtw' | 'statistical' | 'hybrid';
  toggleAdaptive?: boolean;
}

export interface RewardFunction {
  weights: {
    accuracy: number;
    latency: number;
    memory: number;
    falsePositives: number;
    throughput: number;
  };
  normalize: boolean;
}

export interface LearningConfig {
  algorithm: RLAlgorithm;
  learningRate: number;
  discountFactor: number; // gamma
  explorationRate: number; // epsilon
  explorationDecay: number;
  minExplorationRate: number;
  batchSize: number;
  replayBufferSize: number;
  targetUpdateFrequency: number;
}

export interface OptimizationResult {
  params: StreamingParameters;
  confidence: number;
  expectedReward: number;
  explorationRate: number;
}

// ============================================================================
// Adaptive Learning Engine Implementation
// ============================================================================

export class AdaptiveLearningEngine {
  private agentdb: AgentDB;
  private rlAgent: any; // AgentDB RL agent
  private config: LearningConfig;
  private rewardFunction: RewardFunction;

  private currentState: StateSpace;
  private episodeHistory: Array<{
    state: StateSpace;
    action: Action;
    reward: number;
    nextState: StateSpace;
  }>;

  private episodeCount: number = 0;
  private totalSteps: number = 0;
  private bestParams: StreamingParameters | null = null;
  private bestReward: number = -Infinity;

  private autoTuningInterval: NodeJS.Timeout | null = null;

  constructor(
    agentdb: AgentDB,
    config: Partial<LearningConfig> = {},
    rewardFunction: Partial<RewardFunction> = {}
  ) {
    this.agentdb = agentdb;

    // Default configuration
    this.config = {
      algorithm: 'actor_critic', // Best for continuous action spaces
      learningRate: 0.001,
      discountFactor: 0.99,
      explorationRate: 1.0,
      explorationDecay: 0.995,
      minExplorationRate: 0.01,
      batchSize: 32,
      replayBufferSize: 10000,
      targetUpdateFrequency: 100,
      ...config
    };

    // Default reward function
    this.rewardFunction = {
      weights: {
        accuracy: 1.0,
        latency: -0.3,
        memory: -0.2,
        falsePositives: -0.8,
        throughput: 0.5
      },
      normalize: true,
      ...rewardFunction
    };

    // Initialize state
    this.currentState = this.getInitialState();
    this.episodeHistory = [];
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize RL agent
   */
  async initializeAgent(
    algorithm?: RLAlgorithm,
    stateSpace?: {
      windowSize: [number, number];
      threshold: [number, number];
      sensitivity: [number, number];
    }
  ): Promise<void> {
    const algo = algorithm || this.config.algorithm;

    // Define state and action dimensions
    const stateDim = this.getStateDimension();
    const actionDim = this.getActionDimension();

    // Initialize RL agent via AgentDB
    this.rlAgent = await this.agentdb.createRLAgent({
      algorithm: algo,
      stateDimension: stateDim,
      actionDimension: actionDim,
      learningRate: this.config.learningRate,
      discountFactor: this.config.discountFactor,
      config: {
        // Actor-Critic specific
        actorHiddenLayers: [128, 64],
        criticHiddenLayers: [128, 64],
        // Experience replay
        replayBufferSize: this.config.replayBufferSize,
        batchSize: this.config.batchSize,
        // Exploration
        initialExplorationRate: this.config.explorationRate,
        explorationDecay: this.config.explorationDecay,
        minExplorationRate: this.config.minExplorationRate
      }
    });

    console.log(`RL agent initialized with ${algo} algorithm`);
  }

  // ==========================================================================
  // Learning Methods
  // ==========================================================================

  /**
   * Update agent from streaming metrics
   */
  async updateFromMetrics(
    metrics: StreamingMetrics,
    currentParams: StreamingParameters
  ): Promise<void> {
    // Compute reward
    const reward = this.computeReward(metrics);

    // Update state
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

      // Train agent
      await this.trainOnTransition(
        lastTransition.state,
        lastTransition.action,
        reward,
        nextState
      );
    }

    // Update current state
    this.currentState = nextState;
    this.totalSteps++;

    // Track best parameters
    if (reward > this.bestReward) {
      this.bestReward = reward;
      this.bestParams = { ...currentParams };
    }
  }

  /**
   * Get optimized parameters
   */
  async getOptimizedParams(): Promise<OptimizationResult> {
    // Encode current state
    const stateVector = this.encodeState(this.currentState);

    // Get action from policy (exploration vs exploitation)
    const shouldExplore = Math.random() < this.config.explorationRate;
    const action = shouldExplore
      ? this.sampleRandomAction()
      : await this.rlAgent.selectAction(stateVector);

    // Decode action to parameter changes
    const deltaParams = this.decodeAction(action);

    // Apply action to current params
    const newParams = this.applyAction(
      this.currentState.currentParams,
      deltaParams
    );

    // Store action for next update
    this.episodeHistory.push({
      state: this.currentState,
      action: deltaParams,
      reward: 0, // Will be filled in next update
      nextState: this.currentState // Will be updated
    });

    // Compute confidence (inverse of exploration rate)
    const confidence = 1 - this.config.explorationRate;

    // Estimate expected reward (from value function)
    const expectedReward = await this.rlAgent.estimateValue(stateVector);

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
   * Enable continuous auto-tuning
   */
  async enableAutoTuning(
    evaluationInterval: number,
    onParamsUpdated: (params: StreamingParameters) => Promise<StreamingMetrics>
  ): Promise<void> {
    if (this.autoTuningInterval) {
      clearInterval(this.autoTuningInterval);
    }

    this.autoTuningInterval = setInterval(async () => {
      try {
        // Get optimized parameters
        const result = await this.getOptimizedParams();

        // Apply parameters and get metrics
        const metrics = await onParamsUpdated(result.params);

        // Update agent with feedback
        await this.updateFromMetrics(metrics, result.params);

        console.log(`Auto-tuning episode ${this.episodeCount++}`);
        console.log(`  Reward: ${this.computeReward(metrics).toFixed(3)}`);
        console.log(`  Exploration: ${result.explorationRate.toFixed(3)}`);
        console.log(`  Confidence: ${result.confidence.toFixed(3)}`);
      } catch (error) {
        console.error('Auto-tuning error:', error);
      }
    }, evaluationInterval);

    console.log(`Auto-tuning enabled (interval: ${evaluationInterval}ms)`);
  }

  /**
   * Disable auto-tuning
   */
  disableAutoTuning(): void {
    if (this.autoTuningInterval) {
      clearInterval(this.autoTuningInterval);
      this.autoTuningInterval = null;
      console.log('Auto-tuning disabled');
    }
  }

  // ==========================================================================
  // Reward Function
  // ==========================================================================

  /**
   * Compute reward from metrics
   */
  private computeReward(metrics: StreamingMetrics): number {
    const w = this.rewardFunction.weights;

    // Normalize metrics if needed
    const norm = this.rewardFunction.normalize;
    const accuracy = norm ? metrics.accuracy : metrics.accuracy / 100;
    const latency = norm ? metrics.latency / 1000 : metrics.latency; // ms to seconds
    const memory = norm ? metrics.memoryUsage / 1000 : metrics.memoryUsage; // MB to GB
    const falsePositives = metrics.falsePositiveRate;
    const throughput = norm ? metrics.throughput / 10000 : metrics.throughput;

    // Compute weighted reward
    const reward =
      w.accuracy * accuracy +
      w.latency * latency +
      w.memory * memory +
      w.falsePositives * falsePositives +
      w.throughput * throughput;

    return reward;
  }

  // ==========================================================================
  // State Encoding/Decoding
  // ==========================================================================

  /**
   * Encode state to vector
   */
  private encodeState(state: StateSpace): number[] {
    const encoded: number[] = [];

    // Parameters (normalized to 0-1)
    encoded.push(
      (state.currentParams.windowSize - 10) / 990, // 10-1000 → 0-1
      (state.currentParams.threshold - 0.1) / 9.9, // 0.1-10 → 0-1
      (state.currentParams.sensitivity - 0.5) / 1.5, // 0.5-2.0 → 0-1
      state.currentParams.adaptiveThreshold ? 1 : 0,
      state.currentParams.anomalyDetectionMethod === 'dtw' ? 1 :
      state.currentParams.anomalyDetectionMethod === 'statistical' ? 0.5 : 0.75
    );

    // Recent metrics
    encoded.push(
      state.recentMetrics.accuracy,
      state.recentMetrics.precision,
      state.recentMetrics.recall,
      state.recentMetrics.falsePositiveRate,
      state.recentMetrics.latency / 1000, // Normalize to ~0-1
      state.recentMetrics.throughput / 10000,
      state.recentMetrics.memoryUsage / 1000,
      state.recentMetrics.cpuUsage / 100
    );

    // Data characteristics
    encoded.push(
      state.dataCharacteristics.variance,
      state.dataCharacteristics.trend === 'increasing' ? 1 :
      state.dataCharacteristics.trend === 'decreasing' ? -1 :
      state.dataCharacteristics.trend === 'stable' ? 0 : 0.5,
      state.dataCharacteristics.seasonality ? 1 : 0,
      state.dataCharacteristics.outlierRate,
      state.dataCharacteristics.missingDataRate
    );

    // Historical performance
    encoded.push(state.historicalPerformance);

    return encoded;
  }

  /**
   * Decode action from vector
   */
  private decodeAction(actionVector: number[]): Action {
    // Assuming actionVector is [deltaWindowSize, deltaThreshold, deltaSensitivity, ...]
    return {
      deltaWindowSize: Math.round(actionVector[0] * 100 - 50), // -50 to +50
      deltaThreshold: actionVector[1] * 1 - 0.5, // -0.5 to +0.5
      deltaSensitivity: actionVector[2] * 0.4 - 0.2, // -0.2 to +0.2
      changeMethod: actionVector[3] > 0.66 ? 'hybrid' :
                    actionVector[3] > 0.33 ? 'dtw' : 'statistical',
      toggleAdaptive: actionVector[4] > 0.5
    };
  }

  /**
   * Sample random action (exploration)
   */
  private sampleRandomAction(): number[] {
    return [
      Math.random(), // windowSize
      Math.random(), // threshold
      Math.random(), // sensitivity
      Math.random(), // method
      Math.random()  // adaptive toggle
    ];
  }

  /**
   * Apply action to parameters
   */
  private applyAction(
    currentParams: StreamingParameters,
    action: Action
  ): StreamingParameters {
    const newParams: StreamingParameters = { ...currentParams };

    // Apply deltas with safety bounds
    newParams.windowSize = this.clamp(
      currentParams.windowSize + action.deltaWindowSize,
      10, 1000
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
   * Train agent on transition
   */
  private async trainOnTransition(
    state: StateSpace,
    action: Action,
    reward: number,
    nextState: StateSpace
  ): Promise<void> {
    const stateVector = this.encodeState(state);
    const nextStateVector = this.encodeState(nextState);
    const actionVector = this.encodeActionForTraining(action);

    // Add to replay buffer
    await this.rlAgent.addExperience({
      state: stateVector,
      action: actionVector,
      reward,
      nextState: nextStateVector,
      done: false // Streaming is continuous
    });

    // Train if enough experiences
    if (this.totalSteps % this.config.batchSize === 0) {
      await this.rlAgent.train();
    }

    // Update target network periodically
    if (this.totalSteps % this.config.targetUpdateFrequency === 0) {
      await this.rlAgent.updateTargetNetwork();
    }
  }

  /**
   * Encode action for training
   */
  private encodeActionForTraining(action: Action): number[] {
    return [
      (action.deltaWindowSize + 50) / 100, // -50 to +50 → 0 to 1
      (action.deltaThreshold + 0.5) / 1, // -0.5 to +0.5 → 0 to 1
      (action.deltaSensitivity + 0.2) / 0.4, // -0.2 to +0.2 → 0 to 1
      action.changeMethod === 'hybrid' ? 0.75 :
      action.changeMethod === 'dtw' ? 0.5 : 0.25,
      action.toggleAdaptive ? 1 : 0
    ];
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private getStateDimension(): number {
    // 5 (params) + 8 (metrics) + 5 (data characteristics) + 1 (historical) = 19
    return 19;
  }

  private getActionDimension(): number {
    // 5 action components
    return 5;
  }

  private getInitialState(): StateSpace {
    return {
      currentParams: {
        windowSize: 100,
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
    // Simplified analysis (in production, use actual data statistics)
    return {
      variance: Math.random(), // Placeholder
      trend: 'stable',
      seasonality: false,
      outlierRate: metrics.falsePositiveRate,
      missingDataRate: 0.01
    };
  }

  private updateHistoricalPerformance(reward: number): number {
    const alpha = 0.1; // Smoothing factor
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
  getStatistics(): {
    episodeCount: number;
    totalSteps: number;
    bestReward: number;
    bestParams: StreamingParameters | null;
    currentExplorationRate: number;
    replayBufferSize: number;
  } {
    return {
      episodeCount: this.episodeCount,
      totalSteps: this.totalSteps,
      bestReward: this.bestReward,
      bestParams: this.bestParams,
      currentExplorationRate: this.config.explorationRate,
      replayBufferSize: this.episodeHistory.length
    };
  }

  /**
   * Export learning state
   */
  async exportState(): Promise<any> {
    return {
      config: this.config,
      statistics: this.getStatistics(),
      currentState: this.currentState,
      episodeHistory: this.episodeHistory,
      rlAgentState: await this.rlAgent.export()
    };
  }

  /**
   * Import learning state
   */
  async importState(state: any): Promise<void> {
    this.config = state.config;
    this.currentState = state.currentState;
    this.episodeHistory = state.episodeHistory;
    this.episodeCount = state.statistics.episodeCount;
    this.totalSteps = state.statistics.totalSteps;
    this.bestReward = state.statistics.bestReward;
    this.bestParams = state.statistics.bestParams;

    await this.rlAgent.import(state.rlAgentState);
  }
}

// ============================================================================
// Example Usage
// ============================================================================

export async function exampleAdaptiveLearning() {
  const agentdb = new AgentDB('./agentdb-data');
  await agentdb.initialize();

  // Create adaptive learning engine
  const engine = new AdaptiveLearningEngine(agentdb, {
    algorithm: 'actor_critic',
    learningRate: 0.001,
    explorationRate: 0.5
  });

  // Initialize RL agent
  await engine.initializeAgent();

  // Simulate streaming with adaptive tuning
  await engine.enableAutoTuning(5000, async (params) => {
    // Apply params to Midstreamer (placeholder)
    console.log('Applying params:', params);

    // Simulate metrics (in production, get from actual streaming)
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

    return metrics;
  });

  // Let it learn for 2 minutes
  await new Promise(resolve => setTimeout(resolve, 120000));

  // Disable and check results
  engine.disableAutoTuning();

  const stats = engine.getStatistics();
  console.log('\nLearning Results:');
  console.log('  Episodes:', stats.episodeCount);
  console.log('  Best Reward:', stats.bestReward.toFixed(3));
  console.log('  Best Params:', stats.bestParams);

  // Export for future use
  const state = await engine.exportState();
  // Save to file...
}
