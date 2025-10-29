/**
 * ReflexionEngine Tests
 *
 * Tests for self-reflection and iterative improvement
 */

const ReflexionEngine = require('../../npm-aimds/src/learning/reflexion-engine');

describe('ReflexionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ReflexionEngine({
      maxReflectionDepth: 3,
      minImprovement: 0.05
    });
  });

  describe('Episode Recording', () => {
    test('should record successful detection episode', async () => {
      const detection = {
        input: 'Test prompt for analysis',
        type: 'prompt_injection',
        method: 'multimodal',
        parameters: { threshold: 0.75 }
      };

      const outcome = {
        success: true,
        threats: [{ type: 'prompt_injection', confidence: 0.92 }],
        accuracy: 0.95,
        precision: 0.93,
        recall: 0.97,
        f1Score: 0.95,
        latency: 450,
        falsePositives: 1,
        falseNegatives: 0
      };

      const episodeId = await engine.recordEpisode(detection, outcome);

      expect(episodeId).toMatch(/^episode-/);
      expect(engine.metrics.episodesRecorded).toBe(1);
      expect(engine.episodes.has(episodeId)).toBe(true);
    });

    test('should record failed detection episode', async () => {
      const detection = {
        input: 'Another test prompt',
        type: 'jailbreak',
        method: 'standard',
        parameters: { threshold: 0.5 }
      };

      const outcome = {
        success: false,
        threats: [],
        accuracy: 0.60,
        precision: 0.55,
        recall: 0.40,
        f1Score: 0.46,
        latency: 1200,
        falsePositives: 10,
        falseNegatives: 8,
        errors: ['timeout', 'pattern_mismatch']
      };

      const episodeId = await engine.recordEpisode(detection, outcome);

      expect(episodeId).toMatch(/^episode-/);
      expect(engine.episodes.get(episodeId).outcome.success).toBe(false);
    });

    test('should trigger reflection for failed episodes', async () => {
      const detection = {
        input: 'Test',
        type: 'test',
        method: 'standard'
      };

      const outcome = {
        success: false,
        accuracy: 0.50,
        precision: 0.45,
        recall: 0.40,
        f1Score: 0.42,
        latency: 800
      };

      await engine.recordEpisode(detection, outcome);

      expect(engine.metrics.reflectionsGenerated).toBeGreaterThan(0);
    });
  });

  describe('Failure Analysis', () => {
    test('should identify high false positives issue', () => {
      const episode = {
        id: 'test-1',
        detection: { parameters: { threshold: 0.5 } },
        outcome: {
          success: false,
          falsePositives: 12,
          falseNegatives: 2,
          precision: 0.45,
          recall: 0.80,
          latency: 600
        }
      };

      const analysis = engine.analyzeFailure(episode);

      expect(analysis.issues).toContain('high_false_positives');
      expect(analysis.severity).toBe('high');
    });

    test('should identify high false negatives issue', () => {
      const episode = {
        id: 'test-2',
        detection: { parameters: { threshold: 0.9 } },
        outcome: {
          success: false,
          falsePositives: 1,
          falseNegatives: 10,
          precision: 0.90,
          recall: 0.30,
          latency: 500
        }
      };

      const analysis = engine.analyzeFailure(episode);

      expect(analysis.issues).toContain('high_false_negatives');
    });

    test('should identify high latency issue', () => {
      const episode = {
        id: 'test-3',
        detection: { parameters: {} },
        outcome: {
          success: true,
          falsePositives: 0,
          falseNegatives: 0,
          latency: 2500
        }
      };

      const analysis = engine.analyzeFailure(episode);

      expect(analysis.issues).toContain('high_latency');
    });

    test('should identify multiple issues', () => {
      const episode = {
        id: 'test-4',
        detection: { parameters: {} },
        outcome: {
          success: false,
          threats: [],
          falsePositives: 8,
          falseNegatives: 5,
          precision: 0.40,
          recall: 0.35,
          latency: 1800,
          errors: ['error1', 'error2']
        }
      };

      const analysis = engine.analyzeFailure(episode);

      expect(analysis.issues.length).toBeGreaterThan(2);
      expect(analysis.severity).toBe('critical');
    });
  });

  describe('Hypothesis Generation', () => {
    test('should generate threshold adjustment hypothesis for high FP', async () => {
      const analysis = {
        issues: ['high_false_positives'],
        currentThreshold: 0.75
      };

      const hypotheses = await engine.generateHypotheses(analysis);

      const thresholdHyp = hypotheses.find(h => h.type === 'threshold_adjustment');
      expect(thresholdHyp).toBeDefined();
      expect(thresholdHyp.action).toBe('increase_threshold');
      expect(thresholdHyp.parameters.suggestedThreshold).toBeGreaterThan(0.75);
    });

    test('should generate method enhancement hypothesis for missed threats', async () => {
      const analysis = {
        issues: ['missed_threats'],
        currentThreshold: 0.75
      };

      const hypotheses = await engine.generateHypotheses(analysis);

      const methodHyp = hypotheses.find(h => h.type === 'method_enhancement');
      expect(methodHyp).toBeDefined();
      expect(methodHyp.action).toBe('enable_advanced_detection');
      expect(methodHyp.parameters.methods).toContain('multimodal');
    });

    test('should generate performance optimization hypothesis for high latency', async () => {
      const analysis = {
        issues: ['high_latency'],
        currentThreshold: 0.75
      };

      const hypotheses = await engine.generateHypotheses(analysis);

      const perfHyp = hypotheses.find(h => h.type === 'performance_optimization');
      expect(perfHyp).toBeDefined();
      expect(perfHyp.action).toBe('optimize_performance');
      expect(perfHyp.parameters.enableCache).toBe(true);
    });

    test('should store generated hypotheses', async () => {
      const analysis = {
        issues: ['high_false_positives', 'high_latency'],
        currentThreshold: 0.75
      };

      const hypotheses = await engine.generateHypotheses(analysis);

      expect(hypotheses.length).toBeGreaterThan(0);

      for (const hyp of hypotheses) {
        expect(engine.hypotheses.has(hyp.id)).toBe(true);
        expect(engine.hypotheses.get(hyp.id).status).toBe('pending');
      }
    });
  });

  describe('Trajectory Optimization', () => {
    test('should optimize trajectory with hypotheses', async () => {
      const episode = {
        id: 'episode-test',
        detection: { method: 'standard' },
        outcome: {
          success: false,
          accuracy: 0.60,
          precision: 0.55,
          recall: 0.50,
          f1Score: 0.52,
          falsePositives: 10,
          falseNegatives: 5,
          latency: 800
        }
      };

      const hypotheses = [
        {
          id: 'hyp-1',
          action: 'increase_threshold',
          parameters: { suggestedThreshold: 0.85 },
          expectedImprovement: 0.15
        },
        {
          id: 'hyp-2',
          action: 'enable_advanced_detection',
          parameters: { methods: ['multimodal'] },
          expectedImprovement: 0.20
        }
      ];

      const trajectory = await engine.optimizeTrajectory(episode, hypotheses);

      expect(trajectory.episodeId).toBe(episode.id);
      expect(trajectory.optimizations).toHaveLength(2);
      expect(trajectory.totalImprovement).toBeGreaterThan(0);
    });

    test('should mark hypotheses as tested', async () => {
      const episode = {
        id: 'episode-test-2',
        detection: { method: 'standard' },
        outcome: {
          success: false,
          accuracy: 0.60,
          f1Score: 0.52
        }
      };

      const hypothesis = {
        id: 'hyp-test',
        action: 'increase_threshold',
        parameters: { suggestedThreshold: 0.85 },
        expectedImprovement: 0.15
      };

      engine.hypotheses.set(hypothesis.id, {
        ...hypothesis,
        status: 'pending'
      });

      await engine.optimizeTrajectory(episode, [hypothesis]);

      const stored = engine.hypotheses.get(hypothesis.id);
      expect(stored.status).toBe('tested');
      expect(stored.testedAt).toBeDefined();
    });

    test('should track improvements in metrics', async () => {
      const episode = {
        id: 'episode-test-3',
        detection: { method: 'standard' },
        outcome: {
          success: false,
          accuracy: 0.60,
          f1Score: 0.52
        }
      };

      const hypothesis = {
        id: 'hyp-test-2',
        action: 'increase_threshold',
        parameters: { suggestedThreshold: 0.85 },
        expectedImprovement: 0.15
      };

      const initialImprovements = engine.metrics.improvements;

      await engine.optimizeTrajectory(episode, [hypothesis]);

      expect(engine.metrics.improvements).toBeGreaterThan(initialImprovements);
      expect(engine.metrics.hypothesesTested).toBeGreaterThan(0);
    });
  });

  describe('Critique Generation', () => {
    test('should generate critique for failed detection', () => {
      const episode = {
        id: 'test',
        detection: {},
        outcome: {
          success: false,
          falsePositives: 8,
          falseNegatives: 4,
          latency: 1500,
          f1Score: 0.45
        }
      };

      const critique = engine.generateCritique(episode);

      expect(critique).toContain('Detection failed');
      expect(critique).toContain('false positive');
      expect(critique).toContain('false negative');
      expect(critique).toContain('latency');
    });

    test('should provide specific metrics in critique', () => {
      const episode = {
        id: 'test',
        detection: {},
        outcome: {
          success: false,
          falsePositives: 12,
          falseNegatives: 0,
          latency: 600,
          f1Score: 0.70
        }
      };

      const critique = engine.generateCritique(episode);

      expect(critique).toContain('12 incorrect detections');
    });
  });

  describe('Insights Extraction', () => {
    test('should extract insights from high-performing episode', () => {
      const episode = {
        id: 'test',
        detection: { method: 'multimodal' },
        outcome: {
          success: true,
          f1Score: 0.92,
          falsePositives: 0,
          falseNegatives: 0
        }
      };

      const insights = engine.extractInsights(episode);

      expect(insights).toContain('Excellent detection performance');
    });

    test('should suggest improvements for poor performance', () => {
      const episode = {
        id: 'test',
        detection: { method: 'standard' },
        outcome: {
          success: false,
          f1Score: 0.55,
          falsePositives: 2,
          falseNegatives: 8
        }
      };

      const insights = engine.extractInsights(episode);

      expect(insights.some(i => i.includes('advanced detection'))).toBe(true);
    });
  });

  describe('Performance Calculation', () => {
    test('should calculate performance score from outcome', () => {
      const outcome = {
        accuracy: 0.90,
        precision: 0.92,
        recall: 0.88,
        f1Score: 0.90
      };

      const performance = engine.calculatePerformance(outcome);

      expect(performance).toBeGreaterThan(0.85);
      expect(performance).toBeLessThan(1.0);
    });

    test('should weight all metrics equally', () => {
      const outcome = {
        accuracy: 1.0,
        precision: 1.0,
        recall: 1.0,
        f1Score: 1.0
      };

      const performance = engine.calculatePerformance(outcome);

      expect(performance).toBe(1.0);
    });
  });

  describe('Metrics', () => {
    test('should track reflexion metrics', async () => {
      const detection = { input: 'test', type: 'test', method: 'standard' };
      const outcome = {
        success: false,
        accuracy: 0.60,
        precision: 0.55,
        recall: 0.50,
        f1Score: 0.52,
        latency: 800
      };

      await engine.recordEpisode(detection, outcome);

      const metrics = engine.getMetrics();

      expect(metrics).toHaveProperty('episodesRecorded');
      expect(metrics).toHaveProperty('reflectionsGenerated');
      expect(metrics).toHaveProperty('hypothesesTested');
      expect(metrics).toHaveProperty('improvements');
      expect(metrics).toHaveProperty('avgImprovementRate');
    });
  });

  describe('Hypothesis Management', () => {
    test('should retrieve all hypotheses', async () => {
      const analysis = {
        issues: ['high_false_positives', 'high_latency'],
        currentThreshold: 0.75
      };

      await engine.generateHypotheses(analysis);

      const allHypotheses = engine.getAllHypotheses();
      expect(allHypotheses.length).toBeGreaterThan(0);
    });

    test('should filter hypotheses by status', async () => {
      const analysis = {
        issues: ['high_false_positives'],
        currentThreshold: 0.75
      };

      await engine.generateHypotheses(analysis);

      const pendingHypotheses = engine.getAllHypotheses('pending');
      expect(pendingHypotheses.every(h => h.status === 'pending')).toBe(true);
    });
  });
});

console.log('✅ ReflexionEngine tests complete');
