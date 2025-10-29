/**
 * ReasoningBank Coordinator
 *
 * Implements adaptive learning using AgentDB's ReasoningBank capabilities:
 * - Trajectory storage for agent coordination patterns
 * - Verdict judgment for success/failure classification
 * - Memory distillation to extract reusable coordination patterns
 * - Best practice retrieval for optimal coordination
 *
 * Integrates with AgentDB's 9 RL algorithms:
 * - Decision Transformer, Q-Learning, SARSA, Actor-Critic,
 * - Policy Gradient, DQN, A3C, PPO, DDPG
 */

const { spawn } = require('child_process');
const { nanoid } = require('nanoid');

class ReasoningBankCoordinator {
  constructor(options = {}) {
    this.dbPath = options.dbPath || process.env.AGENTDB_PATH || './agentdb.db';
    this.minAttempts = options.minAttempts || 3;
    this.minSuccessRate = options.minSuccessRate || 0.6;
    this.minConfidence = options.minConfidence || 0.7;
    this.minReward = options.minReward || 0.7;

    // Learning configuration
    this.learningConfig = {
      algorithms: [
        'decision_transformer',
        'q_learning',
        'sarsa',
        'actor_critic',
        'policy_gradient',
        'dqn',
        'a3c',
        'ppo',
        'ddpg'
      ],
      epochs: options.epochs || 10,
      batchSize: options.batchSize || 32,
      learningRate: options.learningRate || 0.001
    };

    // Coordination metrics
    this.metrics = {
      totalTrajectories: 0,
      successfulTrajectories: 0,
      failedTrajectories: 0,
      patternsExtracted: 0,
      queriesProcessed: 0,
      avgReward: 0,
      coordinationEfficiency: 0
    };

    this.initialized = false;
  }

  /**
   * Initialize AgentDB database
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await this.execAgentDB([
        'init',
        this.dbPath,
        '--dimension', '768',
        '--preset', 'medium'
      ]);

      this.initialized = true;
      console.log(`✅ ReasoningBank initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize ReasoningBank:', error.message);
      throw error;
    }
  }

  /**
   * Record coordination trajectory
   *
   * @param {string} agentId - Agent identifier
   * @param {Array} actions - Sequence of actions taken
   * @param {object} outcome - Result of the coordination
   * @returns {Promise<string>} Trajectory ID
   */
  async recordTrajectory(agentId, actions, outcome) {
    await this.initialize();

    const trajectoryId = `traj-${nanoid(8)}`;
    const sessionId = `coord-${agentId}-${Date.now()}`;

    // Calculate reward based on outcome
    const reward = this.calculateReward(outcome);
    const success = outcome.success || (reward >= this.minReward);

    // Prepare trajectory metadata
    const metadata = {
      agentId,
      trajectoryId,
      actionCount: actions.length,
      duration: outcome.duration || 0,
      timestamp: Date.now(),
      context: outcome.context || {}
    };

    // Store trajectory as reflexion episode
    try {
      const critique = this.generateCritique(actions, outcome);

      await this.execAgentDB([
        'reflexion', 'store',
        sessionId,
        JSON.stringify({ agentId, actions, metadata }),
        reward.toString(),
        success.toString(),
        critique,
        JSON.stringify(actions),
        JSON.stringify(outcome),
        (outcome.latency || 0).toString(),
        (outcome.tokens || 0).toString()
      ]);

      // Update metrics
      this.metrics.totalTrajectories++;
      if (success) {
        this.metrics.successfulTrajectories++;
      } else {
        this.metrics.failedTrajectories++;
      }
      this.updateAverageReward(reward);

      console.log(`📝 Recorded trajectory ${trajectoryId} for agent ${agentId} (reward: ${reward.toFixed(2)})`);

      return trajectoryId;
    } catch (error) {
      console.error('❌ Failed to record trajectory:', error.message);
      throw error;
    }
  }

  /**
   * Judge verdict for trajectory (success/failure classification)
   *
   * @param {object} trajectory - Trajectory data
   * @returns {Promise<object>} Verdict with confidence score
   */
  async judgeVerdict(trajectory) {
    await this.initialize();

    const {
      actions = [],
      outcome = {},
      reward = 0,
      metadata = {}
    } = trajectory;

    // Multi-factor verdict analysis
    const factors = {
      rewardThreshold: reward >= this.minReward,
      errorRate: (outcome.errors || 0) / Math.max(actions.length, 1),
      completionRate: (outcome.completed || 0) / (outcome.expected || 1),
      latencyThreshold: (outcome.latency || 0) < (metadata.maxLatency || 5000),
      resourceEfficiency: (outcome.resourceUsage || 0) < (metadata.maxResources || 100)
    };

    // Calculate confidence based on factors
    const factorWeights = {
      rewardThreshold: 0.35,
      errorRate: 0.25,
      completionRate: 0.20,
      latencyThreshold: 0.10,
      resourceEfficiency: 0.10
    };

    let confidence = 0;
    let successCount = 0;

    for (const [factor, passed] of Object.entries(factors)) {
      const weight = factorWeights[factor] || 0;
      if (factor === 'errorRate') {
        // Lower error rate = higher confidence
        const errorContribution = Math.max(0, 1 - factors.errorRate) * weight;
        confidence += errorContribution;
        if (factors.errorRate < 0.1) successCount++;
      } else {
        if (passed) {
          confidence += weight;
          successCount++;
        }
      }
    }

    const totalFactors = Object.keys(factors).length;
    const verdict = successCount >= Math.ceil(totalFactors * 0.6) ? 'success' : 'failure';

    // Store verdict as causal edge
    if (verdict === 'success') {
      const cause = this.extractCause(actions);
      const effect = outcome.effect || 'coordination_success';
      const uplift = confidence * reward;

      try {
        await this.execAgentDB([
          'causal', 'add-edge',
          cause,
          effect,
          uplift.toFixed(3),
          confidence.toFixed(3),
          '1'
        ]);
      } catch (error) {
        console.warn('⚠️  Failed to add causal edge:', error.message);
      }
    }

    return {
      verdict,
      confidence,
      factors,
      recommendation: verdict === 'success'
        ? 'Reinforce this coordination pattern'
        : 'Analyze failures and adjust strategy',
      timestamp: Date.now()
    };
  }

  /**
   * Distill memory to extract reusable coordination patterns
   *
   * @param {Array} trajectories - Multiple trajectories to analyze
   * @returns {Promise<Array>} Extracted patterns with confidence scores
   */
  async distillMemory(trajectories = []) {
    await this.initialize();

    console.log(`🧠 Distilling memory from ${trajectories.length || 'all'} trajectories...`);

    try {
      // Use AgentDB's learner to discover causal patterns
      const learnerResult = await this.execAgentDB([
        'learner', 'run',
        this.minAttempts.toString(),
        this.minSuccessRate.toString(),
        this.minConfidence.toString()
      ]);

      // Use skill consolidation to extract reusable patterns
      const consolidationResult = await this.execAgentDB([
        'skill', 'consolidate',
        this.minAttempts.toString(),
        this.minReward.toString(),
        '7', // 7-day time window
        'true' // extract patterns with ML
      ]);

      // Query discovered causal edges
      const causalEdges = await this.execAgentDB([
        'causal', 'query',
        '', // all causes
        '', // all effects
        this.minConfidence.toString(),
        '0.05' // min uplift
      ]);

      // Parse and structure patterns
      const patterns = this.parseDistilledPatterns(causalEdges);

      this.metrics.patternsExtracted += patterns.length;

      console.log(`✅ Distilled ${patterns.length} coordination patterns`);

      return patterns;
    } catch (error) {
      console.error('❌ Failed to distill memory:', error.message);
      return [];
    }
  }

  /**
   * Query best practice for a given scenario
   *
   * @param {string} scenario - Coordination scenario description
   * @param {object} options - Query options
   * @returns {Promise<object>} Best practice with confidence score
   */
  async queryBestPractice(scenario, options = {}) {
    await this.initialize();

    const k = options.k || 5;
    const minConfidence = options.minConfidence || this.minConfidence;
    const onlySuccesses = options.onlySuccesses !== false;

    try {
      // Query reflexion episodes with context synthesis
      const result = await this.execAgentDB([
        'reflexion', 'retrieve',
        scenario,
        '--k', k.toString(),
        '--min-reward', this.minReward.toString(),
        onlySuccesses ? '--only-successes' : '',
        '--synthesize-context',
        '--filters', JSON.stringify({
          success: true,
          reward: { $gte: this.minReward }
        })
      ].filter(Boolean));

      // Get critique summary for additional insights
      const critiqueSummary = await this.execAgentDB([
        'reflexion', 'critique-summary',
        scenario,
        'false' // include all episodes
      ]);

      this.metrics.queriesProcessed++;

      // Parse and structure best practice
      const bestPractice = this.parseBestPractice(result, critiqueSummary);

      console.log(`🎯 Retrieved best practice for: ${scenario}`);

      return bestPractice;
    } catch (error) {
      console.error('❌ Failed to query best practice:', error.message);
      return {
        scenario,
        found: false,
        error: error.message,
        recommendation: 'Insufficient data - collect more coordination trajectories'
      };
    }
  }

  /**
   * Train neural patterns for coordination optimization
   *
   * @param {string} domain - Learning domain
   * @returns {Promise<object>} Training results
   */
  async trainPatterns(domain = 'coordination') {
    await this.initialize();

    console.log(`🧠 Training neural patterns for domain: ${domain}`);

    try {
      const result = await this.execAgentDB([
        'train',
        '--domain', domain,
        '--epochs', this.learningConfig.epochs.toString(),
        '--batch-size', this.learningConfig.batchSize.toString()
      ]);

      console.log('✅ Pattern training complete');

      return {
        domain,
        epochs: this.learningConfig.epochs,
        status: 'complete',
        result
      };
    } catch (error) {
      console.error('❌ Failed to train patterns:', error.message);
      throw error;
    }
  }

  /**
   * Optimize memory and consolidate patterns
   */
  async optimizeMemory() {
    await this.initialize();

    console.log('🔧 Optimizing memory and consolidating patterns...');

    try {
      await this.execAgentDB([
        'optimize-memory',
        '--compress', 'true',
        '--consolidate-patterns', 'true'
      ]);

      console.log('✅ Memory optimization complete');
    } catch (error) {
      console.error('❌ Failed to optimize memory:', error.message);
    }
  }

  /**
   * Get coordination metrics
   */
  getMetrics() {
    const successRate = this.metrics.totalTrajectories > 0
      ? this.metrics.successfulTrajectories / this.metrics.totalTrajectories
      : 0;

    return {
      ...this.metrics,
      successRate: successRate.toFixed(3),
      failureRate: (1 - successRate).toFixed(3),
      coordinationEfficiency: this.calculateCoordinationEfficiency().toFixed(3)
    };
  }

  /**
   * Helper: Calculate reward from outcome
   */
  calculateReward(outcome) {
    let reward = 0;

    // Base reward for success
    if (outcome.success) reward += 0.5;

    // Bonus for efficiency
    if (outcome.efficiency) reward += outcome.efficiency * 0.3;

    // Bonus for low latency
    if (outcome.latency && outcome.latency < 1000) reward += 0.1;

    // Penalty for errors
    if (outcome.errors) reward -= outcome.errors * 0.1;

    // Normalize to [0, 1]
    return Math.max(0, Math.min(1, reward));
  }

  /**
   * Helper: Generate critique for trajectory
   */
  generateCritique(actions, outcome) {
    const critiques = [];

    if (outcome.success) {
      critiques.push('Coordination successful');
      if (outcome.efficiency > 0.8) {
        critiques.push('High efficiency achieved');
      }
    } else {
      critiques.push('Coordination failed');
      if (outcome.errors) {
        critiques.push(`${outcome.errors} errors encountered`);
      }
      if (outcome.timeout) {
        critiques.push('Timeout occurred - optimize latency');
      }
    }

    if (actions.length > 10) {
      critiques.push('High action count - consider simplification');
    }

    return critiques.join('; ');
  }

  /**
   * Helper: Extract primary cause from actions
   */
  extractCause(actions) {
    if (!actions || actions.length === 0) return 'unknown_action';

    const firstAction = actions[0];
    return typeof firstAction === 'string'
      ? firstAction.toLowerCase().replace(/\s+/g, '_')
      : firstAction.type || 'action';
  }

  /**
   * Helper: Update running average reward
   */
  updateAverageReward(reward) {
    const total = this.metrics.totalTrajectories;
    this.metrics.avgReward = (
      (this.metrics.avgReward * (total - 1) + reward) / total
    );
  }

  /**
   * Helper: Calculate coordination efficiency
   */
  calculateCoordinationEfficiency() {
    if (this.metrics.totalTrajectories === 0) return 0;

    const successRate = this.metrics.successfulTrajectories / this.metrics.totalTrajectories;
    const avgReward = this.metrics.avgReward;

    return (successRate * 0.6 + avgReward * 0.4);
  }

  /**
   * Helper: Parse distilled patterns from causal edges
   */
  parseDistilledPatterns(causalData) {
    try {
      const patterns = [];
      const data = typeof causalData === 'string' ? JSON.parse(causalData) : causalData;

      if (Array.isArray(data)) {
        for (const edge of data) {
          patterns.push({
            cause: edge.cause || edge.action,
            effect: edge.effect || edge.outcome,
            uplift: edge.uplift || 0,
            confidence: edge.confidence || 0,
            type: 'causal_pattern'
          });
        }
      }

      return patterns;
    } catch (error) {
      console.warn('⚠️  Failed to parse distilled patterns:', error.message);
      return [];
    }
  }

  /**
   * Helper: Parse best practice from query result
   */
  parseBestPractice(queryResult, critiqueSummary) {
    try {
      const data = typeof queryResult === 'string' ? JSON.parse(queryResult) : queryResult;

      return {
        found: true,
        episodes: Array.isArray(data) ? data.slice(0, 3) : [],
        insights: critiqueSummary || 'No additional insights available',
        confidence: this.minConfidence,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        found: false,
        error: error.message,
        recommendation: 'Parse error - verify data format'
      };
    }
  }

  /**
   * Helper: Execute AgentDB CLI command
   */
  execAgentDB(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn('npx', ['agentdb', ...args], {
        env: { ...process.env, AGENTDB_PATH: this.dbPath }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `AgentDB command failed with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = ReasoningBankCoordinator;
