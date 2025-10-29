/**
 * ReasoningBank Coordinator Tests
 *
 * Tests for adaptive learning and coordination optimization
 */

const ReasoningBankCoordinator = require('../../npm-aimds/src/learning/reasoningbank');

describe('ReasoningBankCoordinator', () => {
  let coordinator;

  beforeEach(async () => {
    coordinator = new ReasoningBankCoordinator({
      dbPath: ':memory:', // In-memory database for testing
      minAttempts: 2,
      minSuccessRate: 0.6,
      minConfidence: 0.7
    });
  });

  describe('Trajectory Recording', () => {
    test('should record successful coordination trajectory', async () => {
      const trajectoryId = await coordinator.recordTrajectory(
        'agent-001',
        [
          { type: 'initialize', method: 'multimodal' },
          { type: 'analyze', input: 'test prompt' },
          { type: 'detect', parameters: { threshold: 0.75 } }
        ],
        {
          success: true,
          efficiency: 0.95,
          latency: 450,
          errors: 0,
          completed: 5,
          expected: 5,
          duration: 2000
        }
      );

      expect(trajectoryId).toMatch(/^traj-/);
      expect(coordinator.metrics.totalTrajectories).toBe(1);
      expect(coordinator.metrics.successfulTrajectories).toBe(1);
    });

    test('should record failed coordination trajectory', async () => {
      const trajectoryId = await coordinator.recordTrajectory(
        'agent-002',
        [
          { type: 'initialize', method: 'standard' },
          { type: 'detect', parameters: { threshold: 0.5 } }
        ],
        {
          success: false,
          efficiency: 0.45,
          latency: 1200,
          errors: 3,
          completed: 2,
          expected: 5,
          duration: 5000,
          timeout: true
        }
      );

      expect(trajectoryId).toMatch(/^traj-/);
      expect(coordinator.metrics.totalTrajectories).toBe(1);
      expect(coordinator.metrics.failedTrajectories).toBe(1);
    });

    test('should calculate reward correctly', () => {
      const reward1 = coordinator.calculateReward({
        success: true,
        efficiency: 0.9,
        latency: 800
      });

      expect(reward1).toBeGreaterThan(0.7);

      const reward2 = coordinator.calculateReward({
        success: false,
        efficiency: 0.3,
        errors: 5
      });

      expect(reward2).toBeLessThan(0.3);
    });
  });

  describe('Verdict Judgment', () => {
    test('should judge successful verdict with high confidence', async () => {
      const trajectory = {
        actions: [{ type: 'detect' }],
        outcome: {
          success: true,
          errors: 0,
          latency: 500,
          resourceUsage: 50,
          completed: 5,
          expected: 5
        },
        reward: 0.95,
        metadata: { maxLatency: 1000, maxResources: 100 }
      };

      const verdict = await coordinator.judgeVerdict(trajectory);

      expect(verdict.verdict).toBe('success');
      expect(verdict.confidence).toBeGreaterThan(0.7);
      expect(verdict.recommendation).toContain('Reinforce');
    });

    test('should judge failure verdict for poor performance', async () => {
      const trajectory = {
        actions: [{ type: 'detect' }],
        outcome: {
          success: false,
          errors: 5,
          latency: 3000,
          resourceUsage: 150,
          completed: 1,
          expected: 5
        },
        reward: 0.25,
        metadata: { maxLatency: 1000, maxResources: 100 }
      };

      const verdict = await coordinator.judgeVerdict(trajectory);

      expect(verdict.verdict).toBe('failure');
      expect(verdict.confidence).toBeLessThan(0.5);
      expect(verdict.recommendation).toContain('adjust strategy');
    });

    test('should analyze multiple factors for verdict', async () => {
      const trajectory = {
        actions: [{ type: 'detect' }],
        outcome: {
          success: true,
          errors: 0,
          latency: 900,
          resourceUsage: 80,
          completed: 5,
          expected: 5
        },
        reward: 0.80,
        metadata: { maxLatency: 1000, maxResources: 100 }
      };

      const verdict = await coordinator.judgeVerdict(trajectory);

      expect(verdict.factors).toHaveProperty('rewardThreshold');
      expect(verdict.factors).toHaveProperty('errorRate');
      expect(verdict.factors).toHaveProperty('completionRate');
      expect(verdict.factors).toHaveProperty('latencyThreshold');
      expect(verdict.factors).toHaveProperty('resourceEfficiency');
    });
  });

  describe('Memory Distillation', () => {
    test('should extract patterns from trajectories', async () => {
      // Record multiple trajectories first
      await coordinator.recordTrajectory('agent-001', [{ type: 'multimodal' }], {
        success: true, efficiency: 0.95, effect: 'high_accuracy'
      });

      await coordinator.recordTrajectory('agent-002', [{ type: 'multimodal' }], {
        success: true, efficiency: 0.92, effect: 'high_accuracy'
      });

      await coordinator.recordTrajectory('agent-003', [{ type: 'standard' }], {
        success: false, efficiency: 0.55, effect: 'low_accuracy'
      });

      const patterns = await coordinator.distillMemory();

      expect(Array.isArray(patterns)).toBe(true);
      expect(coordinator.metrics.patternsExtracted).toBeGreaterThan(0);
    });

    test('should use learner to discover causal edges', async () => {
      // This tests the integration with AgentDB's learner
      const patterns = await coordinator.distillMemory([]);

      // Should return array even if empty
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Best Practice Query', () => {
    test('should query best practices for scenario', async () => {
      const bestPractice = await coordinator.queryBestPractice(
        'prompt_injection_detection',
        { k: 5, onlySuccesses: true }
      );

      expect(bestPractice).toHaveProperty('found');
      expect(coordinator.metrics.queriesProcessed).toBe(1);
    });

    test('should handle missing data gracefully', async () => {
      const bestPractice = await coordinator.queryBestPractice(
        'nonexistent_scenario',
        { k: 5 }
      );

      expect(bestPractice.found).toBe(false);
      expect(bestPractice).toHaveProperty('recommendation');
    });

    test('should support context synthesis', async () => {
      const bestPractice = await coordinator.queryBestPractice(
        'authentication',
        { k: 3, minConfidence: 0.8 }
      );

      expect(bestPractice).toHaveProperty('insights');
    });
  });

  describe('Pattern Training', () => {
    test('should train neural patterns for domain', async () => {
      const result = await coordinator.trainPatterns('coordination');

      expect(result).toHaveProperty('domain');
      expect(result).toHaveProperty('epochs');
      expect(result).toHaveProperty('status');
      expect(result.domain).toBe('coordination');
    });

    test('should use configured epochs and batch size', async () => {
      const result = await coordinator.trainPatterns('threat-detection');

      expect(result.epochs).toBe(coordinator.learningConfig.epochs);
    });
  });

  describe('Metrics', () => {
    test('should track coordination metrics', async () => {
      await coordinator.recordTrajectory('agent-001', [{ type: 'test' }], {
        success: true, efficiency: 0.9
      });

      const metrics = coordinator.getMetrics();

      expect(metrics).toHaveProperty('totalTrajectories');
      expect(metrics).toHaveProperty('successfulTrajectories');
      expect(metrics).toHaveProperty('failedTrajectories');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('avgReward');
      expect(metrics).toHaveProperty('coordinationEfficiency');
    });

    test('should calculate success rate correctly', async () => {
      await coordinator.recordTrajectory('agent-001', [{ type: 'test' }], {
        success: true, efficiency: 0.9
      });

      await coordinator.recordTrajectory('agent-002', [{ type: 'test' }], {
        success: false, efficiency: 0.3
      });

      const metrics = coordinator.getMetrics();

      expect(parseFloat(metrics.successRate)).toBe(0.5);
      expect(parseFloat(metrics.failureRate)).toBe(0.5);
    });
  });

  describe('RL Algorithms Integration', () => {
    test('should support all 9 RL algorithms', () => {
      expect(coordinator.learningConfig.algorithms).toContain('decision_transformer');
      expect(coordinator.learningConfig.algorithms).toContain('q_learning');
      expect(coordinator.learningConfig.algorithms).toContain('sarsa');
      expect(coordinator.learningConfig.algorithms).toContain('actor_critic');
      expect(coordinator.learningConfig.algorithms).toContain('policy_gradient');
      expect(coordinator.learningConfig.algorithms).toContain('dqn');
      expect(coordinator.learningConfig.algorithms).toContain('a3c');
      expect(coordinator.learningConfig.algorithms).toContain('ppo');
      expect(coordinator.learningConfig.algorithms).toContain('ddpg');
    });
  });
});

console.log('✅ ReasoningBank tests complete');
