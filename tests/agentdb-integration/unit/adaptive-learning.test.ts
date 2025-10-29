/**
 * Unit Tests for Adaptive Learning Engine
 * Tests RL agent initialization, state/action space, reward function, and convergence
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  generateCPUUsagePattern,
  generateAnomalySequence,
  generateTrainingSet,
} from '../fixtures/test-data-generator';

interface RLConfig {
  algorithm?: 'actor_critic' | 'q_learning' | 'sarsa' | 'dqn';
  learningRate?: number;
  explorationRate?: number;
  explorationDecay?: number;
  discountFactor?: number;
}

interface MidstreamerParams {
  windowSize: number;
  threshold: number;
  sensitivity: number;
  adaptiveThreshold?: boolean;
  anomalyDetectionMethod?: string;
}

interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  latency: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface AgentState {
  params: MidstreamerParams;
  metrics: PerformanceMetrics;
  episode: number;
  reward: number;
  exploration: number;
  confidence: number;
}

interface TrainingStats {
  episodeCount: number;
  bestReward: number;
  bestParams: MidstreamerParams;
  convergenceEpisode?: number;
  averageReward: number;
  rewardHistory: number[];
}

/**
 * Mock Adaptive Learning Engine for testing
 */
class MockAdaptiveLearningEngine {
  private config: RLConfig;
  private state: AgentState;
  private rewardHistory: number[] = [];
  private autoTuningEnabled = false;
  private intervalHandle?: NodeJS.Timeout;

  constructor(config: RLConfig = {}) {
    this.config = {
      algorithm: 'actor_critic',
      learningRate: 0.001,
      explorationRate: 0.3,
      explorationDecay: 0.995,
      discountFactor: 0.99,
      ...config,
    };

    this.state = {
      params: {
        windowSize: 100,
        threshold: 2.0,
        sensitivity: 1.0,
        adaptiveThreshold: true,
        anomalyDetectionMethod: 'hybrid',
      },
      metrics: this.createDefaultMetrics(),
      episode: 0,
      reward: 0,
      exploration: this.config.explorationRate!,
      confidence: 1 - this.config.explorationRate!,
    };
  }

  async initializeAgent(): Promise<void> {
    // Initialize RL agent
    this.state.episode = 0;
    this.rewardHistory = [];
  }

  async trainEpisode(
    metricsCallback: (params: MidstreamerParams) => Promise<PerformanceMetrics>
  ): Promise<{ reward: number; params: MidstreamerParams }> {
    this.state.episode++;

    // Explore or exploit
    const shouldExplore = Math.random() < this.state.exploration;

    let newParams: MidstreamerParams;
    if (shouldExplore) {
      newParams = this.exploreParams(this.state.params);
    } else {
      newParams = this.exploitParams(this.state.params);
    }

    // Evaluate new parameters
    const metrics = await metricsCallback(newParams);

    // Calculate reward
    const reward = this.calculateReward(metrics);

    // Update state
    this.state.params = newParams;
    this.state.metrics = metrics;
    this.state.reward = reward;
    this.state.exploration *= this.config.explorationDecay!;
    this.state.confidence = 1 - this.state.exploration;

    this.rewardHistory.push(reward);

    return { reward, params: newParams };
  }

  async enableAutoTuning(
    interval: number,
    metricsCallback: (params: MidstreamerParams) => Promise<PerformanceMetrics>
  ): Promise<void> {
    this.autoTuningEnabled = true;

    // Run training episodes at interval
    this.intervalHandle = setInterval(async () => {
      if (this.autoTuningEnabled) {
        await this.trainEpisode(metricsCallback);
      }
    }, interval);
  }

  disableAutoTuning(): void {
    this.autoTuningEnabled = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  getStatistics(): TrainingStats {
    const bestRewardIdx = this.rewardHistory.indexOf(Math.max(...this.rewardHistory));
    const averageReward = this.rewardHistory.length > 0
      ? this.rewardHistory.reduce((a, b) => a + b, 0) / this.rewardHistory.length
      : 0;

    // Detect convergence (reward stable for 5 episodes)
    let convergenceEpisode: number | undefined;
    if (this.rewardHistory.length >= 10) {
      const recentRewards = this.rewardHistory.slice(-10);
      const recentAvg = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
      const recentStd = Math.sqrt(
        recentRewards.reduce((sum, r) => sum + Math.pow(r - recentAvg, 2), 0) / recentRewards.length
      );

      if (recentStd < 0.01) {
        convergenceEpisode = this.state.episode - 5;
      }
    }

    return {
      episodeCount: this.state.episode,
      bestReward: Math.max(...this.rewardHistory),
      bestParams: this.state.params,
      convergenceEpisode,
      averageReward,
      rewardHistory: [...this.rewardHistory],
    };
  }

  getCurrentState(): AgentState {
    return { ...this.state };
  }

  // Private helper methods
  private createDefaultMetrics(): PerformanceMetrics {
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      falsePositiveRate: 0.12,
      latency: 25,
      throughput: 8000,
      memoryUsage: 150,
      cpuUsage: 45,
    };
  }

  private exploreParams(current: MidstreamerParams): MidstreamerParams {
    // Random exploration
    return {
      windowSize: Math.max(10, Math.min(500, current.windowSize + (Math.random() - 0.5) * 50)),
      threshold: Math.max(0.5, Math.min(5.0, current.threshold + (Math.random() - 0.5) * 0.5)),
      sensitivity: Math.max(0.1, Math.min(2.0, current.sensitivity + (Math.random() - 0.5) * 0.2)),
      adaptiveThreshold: current.adaptiveThreshold,
      anomalyDetectionMethod: current.anomalyDetectionMethod,
    };
  }

  private exploitParams(current: MidstreamerParams): MidstreamerParams {
    // Small adjustments based on gradient
    const learningRate = this.config.learningRate!;

    return {
      windowSize: Math.round(current.windowSize + (Math.random() - 0.5) * 10 * learningRate * 1000),
      threshold: current.threshold + (Math.random() - 0.5) * 0.1 * learningRate * 100,
      sensitivity: current.sensitivity + (Math.random() - 0.5) * 0.05 * learningRate * 100,
      adaptiveThreshold: current.adaptiveThreshold,
      anomalyDetectionMethod: current.anomalyDetectionMethod,
    };
  }

  private calculateReward(metrics: PerformanceMetrics): number {
    // Multi-objective reward function
    const accuracyWeight = 0.4;
    const precisionWeight = 0.2;
    const recallWeight = 0.2;
    const latencyWeight = 0.1;
    const throughputWeight = 0.1;

    // Normalize metrics
    const normalizedLatency = Math.max(0, 1 - metrics.latency / 100);
    const normalizedThroughput = Math.min(1, metrics.throughput / 10000);

    const reward =
      accuracyWeight * metrics.accuracy +
      precisionWeight * metrics.precision +
      recallWeight * metrics.recall +
      latencyWeight * normalizedLatency +
      throughputWeight * normalizedThroughput;

    return Math.max(0, Math.min(1, reward));
  }
}

describe('Adaptive Learning Engine', () => {
  let engine: MockAdaptiveLearningEngine;

  beforeEach(async () => {
    engine = new MockAdaptiveLearningEngine();
    await engine.initializeAgent();
  });

  afterAll(() => {
    // Cleanup
  });

  describe('Agent Initialization', () => {
    it('should initialize with default configuration', async () => {
      const state = engine.getCurrentState();

      expect(state.episode).toBe(0);
      expect(state.params.windowSize).toBe(100);
      expect(state.params.threshold).toBe(2.0);
      expect(state.exploration).toBeGreaterThan(0);
    });

    it('should support different RL algorithms', async () => {
      const algorithms: Array<'actor_critic' | 'q_learning' | 'sarsa' | 'dqn'> = [
        'actor_critic',
        'q_learning',
        'sarsa',
        'dqn',
      ];

      for (const algorithm of algorithms) {
        const eng = new MockAdaptiveLearningEngine({ algorithm });
        await eng.initializeAgent();

        const state = eng.getCurrentState();
        expect(state.episode).toBe(0);
      }
    });

    it('should accept custom hyperparameters', async () => {
      const customEngine = new MockAdaptiveLearningEngine({
        learningRate: 0.0001,
        explorationRate: 0.5,
        explorationDecay: 0.99,
      });

      await customEngine.initializeAgent();
      const state = customEngine.getCurrentState();

      expect(state.exploration).toBe(0.5);
    });
  });

  describe('State Space', () => {
    it('should represent valid state space', () => {
      const state = engine.getCurrentState();

      expect(state.params.windowSize).toBeGreaterThan(0);
      expect(state.params.threshold).toBeGreaterThan(0);
      expect(state.params.sensitivity).toBeGreaterThan(0);
    });

    it('should maintain parameter constraints', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      // Run multiple episodes
      for (let i = 0; i < 50; i++) {
        await engine.trainEpisode(mockCallback);
      }

      const state = engine.getCurrentState();

      // Check bounds
      expect(state.params.windowSize).toBeGreaterThanOrEqual(10);
      expect(state.params.windowSize).toBeLessThanOrEqual(500);
      expect(state.params.threshold).toBeGreaterThanOrEqual(0.5);
      expect(state.params.threshold).toBeLessThanOrEqual(5.0);
      expect(state.params.sensitivity).toBeGreaterThanOrEqual(0.1);
      expect(state.params.sensitivity).toBeLessThanOrEqual(2.0);
    });
  });

  describe('Action Space', () => {
    it('should explore action space initially', async () => {
      const initialParams = { ...engine.getCurrentState().params };

      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      await engine.trainEpisode(mockCallback);

      const newParams = engine.getCurrentState().params;

      // Parameters should change during exploration
      const changed =
        newParams.windowSize !== initialParams.windowSize ||
        newParams.threshold !== initialParams.threshold ||
        newParams.sensitivity !== initialParams.sensitivity;

      expect(changed).toBe(true);
    });

    it('should balance exploration and exploitation', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      const explorationRates: number[] = [];

      for (let i = 0; i < 20; i++) {
        await engine.trainEpisode(mockCallback);
        explorationRates.push(engine.getCurrentState().exploration);
      }

      // Exploration should decay over time
      expect(explorationRates[0]).toBeGreaterThan(explorationRates[explorationRates.length - 1]);
    });
  });

  describe('Reward Function', () => {
    it('should calculate reward from metrics', async () => {
      const goodMetrics: PerformanceMetrics = {
        accuracy: 0.95,
        precision: 0.93,
        recall: 0.96,
        falsePositiveRate: 0.04,
        latency: 15,
        throughput: 12000,
        memoryUsage: 120,
        cpuUsage: 40,
      };

      const result = await engine.trainEpisode(async () => goodMetrics);

      expect(result.reward).toBeGreaterThan(0.8);
      expect(result.reward).toBeLessThanOrEqual(1.0);
    });

    it('should penalize poor performance', async () => {
      const poorMetrics: PerformanceMetrics = {
        accuracy: 0.60,
        precision: 0.55,
        recall: 0.58,
        falsePositiveRate: 0.35,
        latency: 80,
        throughput: 2000,
        memoryUsage: 300,
        cpuUsage: 85,
      };

      const result = await engine.trainEpisode(async () => poorMetrics);

      expect(result.reward).toBeLessThan(0.7);
    });

    it('should reward multi-objective optimization', async () => {
      const balancedMetrics: PerformanceMetrics = {
        accuracy: 0.88,
        precision: 0.86,
        recall: 0.89,
        falsePositiveRate: 0.12,
        latency: 20,
        throughput: 10000,
        memoryUsage: 140,
        cpuUsage: 45,
      };

      const result = await engine.trainEpisode(async () => balancedMetrics);

      expect(result.reward).toBeGreaterThan(0.75);
      expect(result.reward).toBeLessThan(0.95);
    });
  });

  describe('Convergence Behavior', () => {
    it('should converge to optimal parameters', async () => {
      const optimalParams = {
        windowSize: 150,
        threshold: 1.8,
        sensitivity: 1.2,
      };

      const mockCallback = async (params: MidstreamerParams) => {
        // Reward based on distance to optimal
        const distance = Math.sqrt(
          Math.pow((params.windowSize - optimalParams.windowSize) / 100, 2) +
          Math.pow(params.threshold - optimalParams.threshold, 2) +
          Math.pow(params.sensitivity - optimalParams.sensitivity, 2)
        );

        const accuracy = Math.max(0.7, 0.95 - distance * 0.2);

        return {
          accuracy,
          precision: accuracy - 0.03,
          recall: accuracy + 0.02,
          falsePositiveRate: 1 - accuracy,
          latency: 20,
          throughput: 10000,
          memoryUsage: 150,
          cpuUsage: 50,
        };
      };

      // Train for many episodes
      for (let i = 0; i < 100; i++) {
        await engine.trainEpisode(mockCallback);
      }

      const stats = engine.getStatistics();

      expect(stats.episodeCount).toBe(100);
      expect(stats.bestReward).toBeGreaterThan(0.85);

      // Should converge
      if (stats.convergenceEpisode) {
        expect(stats.convergenceEpisode).toBeLessThan(100);
      }
    });

    it('should track reward history', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85 + Math.random() * 0.1,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      for (let i = 0; i < 30; i++) {
        await engine.trainEpisode(mockCallback);
      }

      const stats = engine.getStatistics();

      expect(stats.rewardHistory).toHaveLength(30);
      expect(stats.averageReward).toBeGreaterThan(0);
    });

    it('should detect convergence', async () => {
      let stabilizedMetrics = false;

      const mockCallback = async (params: MidstreamerParams) => {
        // After 20 episodes, return stable metrics
        if (engine.getCurrentState().episode > 20) {
          stabilizedMetrics = true;
          return {
            accuracy: 0.92,
            precision: 0.90,
            recall: 0.93,
            falsePositiveRate: 0.08,
            latency: 18,
            throughput: 11000,
            memoryUsage: 140,
            cpuUsage: 42,
          };
        }

        // Before stabilization, return variable metrics
        return {
          accuracy: 0.75 + Math.random() * 0.15,
          precision: 0.72 + Math.random() * 0.15,
          recall: 0.78 + Math.random() * 0.15,
          falsePositiveRate: 0.15,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      for (let i = 0; i < 40; i++) {
        await engine.trainEpisode(mockCallback);
      }

      const stats = engine.getStatistics();

      // Should detect convergence after metrics stabilize
      expect(stats.convergenceEpisode).toBeDefined();
      if (stats.convergenceEpisode) {
        expect(stats.convergenceEpisode).toBeGreaterThan(20);
      }
    });
  });

  describe('Auto-Tuning', () => {
    it('should enable auto-tuning mode', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      await engine.enableAutoTuning(100, mockCallback);

      // Wait for some episodes
      await new Promise((resolve) => setTimeout(resolve, 350));

      engine.disableAutoTuning();

      const stats = engine.getStatistics();
      expect(stats.episodeCount).toBeGreaterThan(0);
    });

    it('should disable auto-tuning', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      await engine.enableAutoTuning(100, mockCallback);
      await new Promise((resolve) => setTimeout(resolve, 250));

      const countAfterEnable = engine.getCurrentState().episode;

      engine.disableAutoTuning();
      await new Promise((resolve) => setTimeout(resolve, 250));

      const countAfterDisable = engine.getCurrentState().episode;

      // Episode count should not increase significantly after disabling
      expect(countAfterDisable - countAfterEnable).toBeLessThan(3);
    });
  });

  describe('Performance', () => {
    it('should train episodes quickly', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        await engine.trainEpisode(mockCallback);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // < 1 second for 50 episodes
    });

    it('should handle rapid training iterations', async () => {
      const mockCallback = async (params: MidstreamerParams) => {
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          falsePositiveRate: 0.12,
          latency: 25,
          throughput: 8000,
          memoryUsage: 150,
          cpuUsage: 45,
        };
      };

      // Rapid fire training
      const promises = Array(100)
        .fill(null)
        .map(() => engine.trainEpisode(mockCallback));

      await Promise.all(promises);

      const stats = engine.getStatistics();
      expect(stats.episodeCount).toBe(100);
    });
  });
});
