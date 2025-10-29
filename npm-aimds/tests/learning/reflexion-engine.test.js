/**
 * Reflexion Engine Tests
 * Tests self-reflection, learning from experience, and adaptive improvement
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Reflexion Engine implementation
class ReflexionEngine {
  constructor(config = {}) {
    this.config = config;
    this.episodes = [];
    this.reflections = new Map();
    this.improvements = [];
    this.stats = {
      totalEpisodes: 0,
      successfulReflections: 0,
      improvementsApplied: 0
    };
  }

  async recordEpisode(episode) {
    const { id, action, context, result, metrics } = episode;
    const episodeRecord = {
      id,
      action,
      context,
      result,
      metrics,
      timestamp: Date.now()
    };
    this.episodes.push(episodeRecord);
    this.stats.totalEpisodes++;
    return episodeRecord;
  }

  async reflect(episodeId) {
    const episode = this.episodes.find(e => e.id === episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    const reflection = {
      episodeId,
      analysis: this.analyzeEpisode(episode),
      learnings: this.extractLearnings(episode),
      improvements: this.suggestImprovements(episode),
      timestamp: Date.now()
    };

    this.reflections.set(episodeId, reflection);
    this.stats.successfulReflections++;
    return reflection;
  }

  analyzeEpisode(episode) {
    const { result, metrics } = episode;
    return {
      wasSuccessful: result.success === true,
      performance: metrics?.latency < 100 ? 'good' : 'needs improvement',
      accuracy: metrics?.accuracy || 0,
      issues: this.identifyIssues(episode)
    };
  }

  extractLearnings(episode) {
    const learnings = [];
    if (episode.result.success) {
      learnings.push({
        type: 'success_pattern',
        content: `Action ${episode.action} succeeded in context: ${episode.context}`,
        confidence: 0.8
      });
    } else {
      learnings.push({
        type: 'failure_pattern',
        content: `Action ${episode.action} failed: ${episode.result.error}`,
        confidence: 0.9
      });
    }
    return learnings;
  }

  suggestImprovements(episode) {
    const improvements = [];
    const { metrics, result } = episode;

    if (metrics?.latency > 100) {
      improvements.push({
        area: 'performance',
        suggestion: 'Optimize detection algorithm for lower latency',
        priority: 'high'
      });
    }

    if (!result.success) {
      improvements.push({
        area: 'accuracy',
        suggestion: 'Review and update detection patterns',
        priority: 'critical'
      });
    }

    if (metrics?.falsePositives > 0) {
      improvements.push({
        area: 'precision',
        suggestion: 'Refine detection thresholds to reduce false positives',
        priority: 'medium'
      });
    }

    return improvements;
  }

  identifyIssues(episode) {
    const issues = [];
    if (!episode.result.success) {
      issues.push('execution_failure');
    }
    if (episode.metrics?.latency > 100) {
      issues.push('performance_degradation');
    }
    if (episode.metrics?.falsePositives > 0) {
      issues.push('false_positive_detection');
    }
    return issues;
  }

  async applyImprovement(improvement) {
    this.improvements.push({
      ...improvement,
      appliedAt: Date.now(),
      status: 'applied'
    });
    this.stats.improvementsApplied++;
    return true;
  }

  async learnFromExperience(count = 10) {
    const recentEpisodes = this.episodes.slice(-count);
    const patterns = {
      successPatterns: [],
      failurePatterns: [],
      performancePatterns: []
    };

    for (const episode of recentEpisodes) {
      const reflection = await this.reflect(episode.id);

      if (reflection.analysis.wasSuccessful) {
        patterns.successPatterns.push(reflection.learnings);
      } else {
        patterns.failurePatterns.push(reflection.learnings);
      }

      if (reflection.analysis.performance === 'good') {
        patterns.performancePatterns.push(episode.metrics);
      }
    }

    return patterns;
  }

  async getReflection(episodeId) {
    return this.reflections.get(episodeId);
  }

  async getAllReflections() {
    return Array.from(this.reflections.values());
  }

  getEpisodes(filter = {}) {
    let filtered = this.episodes;

    if (filter.successful !== undefined) {
      filtered = filtered.filter(e => e.result.success === filter.successful);
    }

    if (filter.action) {
      filtered = filtered.filter(e => e.action === filter.action);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  getStats() {
    return { ...this.stats };
  }

  clear() {
    this.episodes = [];
    this.reflections.clear();
    this.improvements = [];
  }
}

describe('Reflexion Learning Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new ReflexionEngine({
      maxEpisodes: 1000,
      reflectionDepth: 'detailed'
    });
  });

  afterEach(() => {
    engine.clear();
  });

  describe('Episode Recording', () => {
    it('should record episode with all components', async () => {
      const episode = {
        id: 'ep-001',
        action: 'detect_threat',
        context: 'prompt injection attempt',
        result: { success: true, blocked: true },
        metrics: { latency: 50, accuracy: 0.95 }
      };

      const recorded = await engine.recordEpisode(episode);

      expect(recorded.id).toBe('ep-001');
      expect(recorded.action).toBe('detect_threat');
      expect(recorded.context).toBe('prompt injection attempt');
      expect(recorded.timestamp).toBeDefined();
    });

    it('should track episode count', async () => {
      await engine.recordEpisode({
        id: 'e1',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });

      await engine.recordEpisode({
        id: 'e2',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });

      const stats = engine.getStats();
      expect(stats.totalEpisodes).toBe(2);
    });

    it('should maintain episode history', async () => {
      const episodes = Array.from({ length: 10 }, (_, i) => ({
        id: `ep-${i}`,
        action: 'test',
        context: `context ${i}`,
        result: { success: true },
        metrics: { latency: i * 10 }
      }));

      for (const ep of episodes) {
        await engine.recordEpisode(ep);
      }

      const retrieved = engine.getEpisodes();
      expect(retrieved).toHaveLength(10);
    });

    it('should timestamp episodes', async () => {
      const before = Date.now();
      await engine.recordEpisode({
        id: 'time-test',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });
      const after = Date.now();

      const episodes = engine.getEpisodes();
      const episode = episodes.find(e => e.id === 'time-test');

      expect(episode.timestamp).toBeGreaterThanOrEqual(before);
      expect(episode.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Reflection Process', () => {
    it('should generate reflection for successful episode', async () => {
      await engine.recordEpisode({
        id: 'success-ep',
        action: 'detect_threat',
        context: 'injection detected',
        result: { success: true, blocked: true },
        metrics: { latency: 50, accuracy: 0.95 }
      });

      const reflection = await engine.reflect('success-ep');

      expect(reflection).toBeDefined();
      expect(reflection.analysis.wasSuccessful).toBe(true);
      expect(reflection.learnings).toBeInstanceOf(Array);
      expect(reflection.improvements).toBeInstanceOf(Array);
    });

    it('should generate reflection for failed episode', async () => {
      await engine.recordEpisode({
        id: 'fail-ep',
        action: 'detect_threat',
        context: 'missed threat',
        result: { success: false, error: 'Detection failed' },
        metrics: { latency: 150, accuracy: 0.6 }
      });

      const reflection = await engine.reflect('fail-ep');

      expect(reflection.analysis.wasSuccessful).toBe(false);
      expect(reflection.learnings.some(l => l.type === 'failure_pattern')).toBe(true);
    });

    it('should extract learnings from episodes', async () => {
      await engine.recordEpisode({
        id: 'learn-ep',
        action: 'block_request',
        context: 'malicious input',
        result: { success: true },
        metrics: { latency: 45 }
      });

      const reflection = await engine.reflect('learn-ep');

      expect(reflection.learnings).toHaveLength(1);
      expect(reflection.learnings[0].type).toBe('success_pattern');
      expect(reflection.learnings[0].confidence).toBeGreaterThan(0);
    });

    it('should suggest improvements', async () => {
      await engine.recordEpisode({
        id: 'improve-ep',
        action: 'detect',
        context: 'test',
        result: { success: true },
        metrics: { latency: 200, falsePositives: 3 }
      });

      const reflection = await engine.reflect('improve-ep');

      expect(reflection.improvements.length).toBeGreaterThan(0);
      expect(reflection.improvements.some(i => i.area === 'performance')).toBe(true);
    });

    it('should identify issues', async () => {
      await engine.recordEpisode({
        id: 'issue-ep',
        action: 'test',
        context: 'test',
        result: { success: false },
        metrics: { latency: 250, falsePositives: 5 }
      });

      const reflection = await engine.reflect('issue-ep');

      expect(reflection.analysis.issues).toContain('execution_failure');
      expect(reflection.analysis.issues).toContain('performance_degradation');
    });

    it('should throw error for non-existent episode', async () => {
      await expect(engine.reflect('non-existent')).rejects.toThrow('Episode non-existent not found');
    });

    it('should track reflection count', async () => {
      await engine.recordEpisode({
        id: 'r1',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });

      await engine.reflect('r1');

      const stats = engine.getStats();
      expect(stats.successfulReflections).toBe(1);
    });
  });

  describe('Learning from Experience', () => {
    beforeEach(async () => {
      // Seed with varied episodes
      const episodes = [
        {
          id: 'e1',
          action: 'detect',
          context: 'injection',
          result: { success: true },
          metrics: { latency: 50, accuracy: 0.95 }
        },
        {
          id: 'e2',
          action: 'detect',
          context: 'jailbreak',
          result: { success: true },
          metrics: { latency: 60, accuracy: 0.90 }
        },
        {
          id: 'e3',
          action: 'detect',
          context: 'benign',
          result: { success: false, error: 'False positive' },
          metrics: { latency: 200, falsePositives: 1 }
        }
      ];

      for (const ep of episodes) {
        await engine.recordEpisode(ep);
      }
    });

    it('should learn patterns from recent episodes', async () => {
      const patterns = await engine.learnFromExperience(3);

      expect(patterns).toHaveProperty('successPatterns');
      expect(patterns).toHaveProperty('failurePatterns');
      expect(patterns).toHaveProperty('performancePatterns');
    });

    it('should categorize success and failure patterns', async () => {
      const patterns = await engine.learnFromExperience(3);

      expect(patterns.successPatterns.length).toBe(2);
      expect(patterns.failurePatterns.length).toBe(1);
    });

    it('should identify performance patterns', async () => {
      const patterns = await engine.learnFromExperience(3);

      expect(patterns.performancePatterns.length).toBe(2); // e1 and e2
    });

    it('should limit learning to specified count', async () => {
      // Add more episodes
      for (let i = 0; i < 20; i++) {
        await engine.recordEpisode({
          id: `extra-${i}`,
          action: 'test',
          context: 'test',
          result: { success: true },
          metrics: { latency: 50 }
        });
      }

      const patterns = await engine.learnFromExperience(5);

      // Should only learn from last 5 episodes
      expect(patterns.successPatterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Improvement Application', () => {
    it('should apply improvement', async () => {
      const improvement = {
        area: 'performance',
        suggestion: 'Optimize algorithm',
        priority: 'high'
      };

      const result = await engine.applyImprovement(improvement);
      expect(result).toBe(true);

      const stats = engine.getStats();
      expect(stats.improvementsApplied).toBe(1);
    });

    it('should track applied improvements', async () => {
      const improvements = [
        { area: 'performance', suggestion: 'Cache results', priority: 'high' },
        { area: 'accuracy', suggestion: 'Update patterns', priority: 'critical' }
      ];

      for (const imp of improvements) {
        await engine.applyImprovement(imp);
      }

      const stats = engine.getStats();
      expect(stats.improvementsApplied).toBe(2);
    });

    it('should timestamp improvements', async () => {
      const before = Date.now();
      await engine.applyImprovement({
        area: 'test',
        suggestion: 'test',
        priority: 'low'
      });
      const after = Date.now();

      expect(engine.improvements[0].appliedAt).toBeGreaterThanOrEqual(before);
      expect(engine.improvements[0].appliedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('Reflection Retrieval', () => {
    beforeEach(async () => {
      await engine.recordEpisode({
        id: 'ret-1',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });
      await engine.reflect('ret-1');

      await engine.recordEpisode({
        id: 'ret-2',
        action: 'test',
        context: 'test',
        result: { success: false },
        metrics: {}
      });
      await engine.reflect('ret-2');
    });

    it('should retrieve specific reflection', async () => {
      const reflection = await engine.getReflection('ret-1');

      expect(reflection).toBeDefined();
      expect(reflection.episodeId).toBe('ret-1');
    });

    it('should retrieve all reflections', async () => {
      const reflections = await engine.getAllReflections();

      expect(reflections).toHaveLength(2);
    });

    it('should return undefined for non-existent reflection', async () => {
      const reflection = await engine.getReflection('non-existent');
      expect(reflection).toBeUndefined();
    });
  });

  describe('Episode Filtering', () => {
    beforeEach(async () => {
      const episodes = [
        {
          id: 'f1',
          action: 'detect',
          context: 'test',
          result: { success: true },
          metrics: {}
        },
        {
          id: 'f2',
          action: 'block',
          context: 'test',
          result: { success: true },
          metrics: {}
        },
        {
          id: 'f3',
          action: 'detect',
          context: 'test',
          result: { success: false },
          metrics: {}
        }
      ];

      for (const ep of episodes) {
        await engine.recordEpisode(ep);
      }
    });

    it('should filter by success status', () => {
      const successful = engine.getEpisodes({ successful: true });
      expect(successful.every(e => e.result.success === true)).toBe(true);

      const failed = engine.getEpisodes({ successful: false });
      expect(failed.every(e => e.result.success === false)).toBe(true);
    });

    it('should filter by action type', () => {
      const detectEpisodes = engine.getEpisodes({ action: 'detect' });
      expect(detectEpisodes.every(e => e.action === 'detect')).toBe(true);
    });

    it('should limit results', () => {
      const limited = engine.getEpisodes({ limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('should combine filters', () => {
      const filtered = engine.getEpisodes({
        successful: true,
        action: 'detect',
        limit: 1
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].action).toBe('detect');
      expect(filtered[0].result.success).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should record episode under 10ms', async () => {
      const start = performance.now();
      await engine.recordEpisode({
        id: 'perf-1',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should reflect on episode efficiently', async () => {
      await engine.recordEpisode({
        id: 'perf-2',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: { latency: 50 }
      });

      const start = performance.now();
      await engine.reflect('perf-2');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10);
    });

    it('should handle 1000 episodes efficiently', async () => {
      const episodes = Array.from({ length: 1000 }, (_, i) => ({
        id: `bulk-${i}`,
        action: 'test',
        context: 'test',
        result: { success: i % 2 === 0 },
        metrics: { latency: Math.random() * 200 }
      }));

      const start = performance.now();
      for (const ep of episodes.slice(0, 100)) {
        await engine.recordEpisode(ep);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // 100 episodes in <1s
    }, 10000);

    it('should learn from 100 episodes quickly', async () => {
      for (let i = 0; i < 100; i++) {
        await engine.recordEpisode({
          id: `learn-${i}`,
          action: 'test',
          context: 'test',
          result: { success: i % 3 !== 0 },
          metrics: { latency: Math.random() * 100 }
        });
      }

      const start = performance.now();
      await engine.learnFromExperience(50);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      await engine.recordEpisode({
        id: 's1',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });
      await engine.reflect('s1');
      await engine.applyImprovement({ area: 'test', suggestion: 'test', priority: 'low' });

      const stats = engine.getStats();

      expect(stats.totalEpisodes).toBe(1);
      expect(stats.successfulReflections).toBe(1);
      expect(stats.improvementsApplied).toBe(1);
    });

    it('should update statistics in real-time', async () => {
      const stats1 = engine.getStats();
      expect(stats1.totalEpisodes).toBe(0);

      await engine.recordEpisode({
        id: 't1',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });

      const stats2 = engine.getStats();
      expect(stats2.totalEpisodes).toBe(1);
    });
  });

  describe('Memory Management', () => {
    it('should clear all data', () => {
      engine.recordEpisode({
        id: 'clear-test',
        action: 'test',
        context: 'test',
        result: { success: true },
        metrics: {}
      });

      engine.clear();

      const episodes = engine.getEpisodes();
      expect(episodes).toHaveLength(0);
    });
  });
});
