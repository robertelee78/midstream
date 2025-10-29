/**
 * Reinforcement Learning Performance Benchmarks
 * Tests convergence speed, inference latency, and learning overhead
 * Targets: <500 episodes convergence, <5ms inference, <20ms learning step
 */

import { BenchmarkRunner, validateTarget } from './utils/benchmark-runner';

// Mock RL Agent (simulating AgentDB adaptive learning)
class RLAgent {
  private qTable: Map<string, Map<string, number>> = new Map();
  private learningRate: number = 0.1;
  private discountFactor: number = 0.95;
  private epsilon: number = 0.1;
  private episodeCount: number = 0;

  /**
   * Q-Learning update step
   */
  learn(state: string, action: string, reward: number, nextState: string): number {
    const start = performance.now();

    // Get current Q-value
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map());
    }
    const stateActions = this.qTable.get(state)!;
    const currentQ = stateActions.get(action) || 0;

    // Get max Q-value for next state
    const nextStateActions = this.qTable.get(nextState);
    let maxNextQ = 0;
    if (nextStateActions) {
      maxNextQ = Math.max(...Array.from(nextStateActions.values()));
    }

    // Q-learning update
    const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
    stateActions.set(action, newQ);

    return performance.now() - start;
  }

  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(state: string, possibleActions: string[]): { action: string; time: number } {
    const start = performance.now();

    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
      return { action, time: performance.now() - start };
    }

    // Exploit best action
    const stateActions = this.qTable.get(state);
    if (!stateActions) {
      const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
      return { action, time: performance.now() - start };
    }

    let bestAction = possibleActions[0];
    let bestValue = stateActions.get(bestAction) || 0;

    for (const action of possibleActions) {
      const value = stateActions.get(action) || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return { action: bestAction, time: performance.now() - start };
  }

  /**
   * Run a single episode
   */
  runEpisode(env: Environment): { reward: number; steps: number } {
    let state = env.reset();
    let totalReward = 0;
    let steps = 0;
    const maxSteps = 100;

    while (!env.isDone() && steps < maxSteps) {
      const { action } = this.selectAction(state, env.getActions());
      const { nextState, reward, done } = env.step(action);

      this.learn(state, action, reward, nextState);

      state = nextState;
      totalReward += reward;
      steps++;

      if (done) break;
    }

    this.episodeCount++;
    return { reward: totalReward, steps };
  }

  /**
   * Decay epsilon over time
   */
  decayEpsilon(minEpsilon: number = 0.01, decayRate: number = 0.995): void {
    this.epsilon = Math.max(minEpsilon, this.epsilon * decayRate);
  }

  getEpisodeCount(): number {
    return this.episodeCount;
  }

  getQTableSize(): number {
    let size = 0;
    for (const stateActions of this.qTable.values()) {
      size += stateActions.size;
    }
    return size;
  }
}

// Mock environment for testing
class Environment {
  private state: number = 0;
  private goal: number = 10;
  private done: boolean = false;

  reset(): string {
    this.state = 0;
    this.done = false;
    return this.state.toString();
  }

  step(action: string): { nextState: string; reward: number; done: boolean } {
    if (action === 'forward') {
      this.state++;
    } else if (action === 'backward' && this.state > 0) {
      this.state--;
    }

    const reward = this.state === this.goal ? 100 : -1;
    this.done = this.state === this.goal;

    return {
      nextState: this.state.toString(),
      reward,
      done: this.done,
    };
  }

  isDone(): boolean {
    return this.done;
  }

  getActions(): string[] {
    return ['forward', 'backward', 'stay'];
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('REINFORCEMENT LEARNING PERFORMANCE BENCHMARKS');
  console.log('='.repeat(80));
  console.log('Targets:');
  console.log('  - Convergence: <500 episodes');
  console.log('  - Inference: <5ms');
  console.log('  - Learning step: <20ms\n');

  const runner = new BenchmarkRunner();

  // Test 1: Convergence Speed
  console.log('\n📊 Test 1: Convergence Speed Analysis');
  console.log('-'.repeat(80));

  const agent = new RLAgent();
  const env = new Environment();
  const convergenceThreshold = 90; // Average reward threshold
  const maxEpisodes = 1000;
  const windowSize = 50;

  let rewardHistory: number[] = [];
  let convergedAt = -1;
  const convergenceStart = performance.now();

  for (let episode = 0; episode < maxEpisodes; episode++) {
    const { reward } = agent.runEpisode(env);
    rewardHistory.push(reward);

    if (rewardHistory.length > windowSize) {
      rewardHistory.shift();
    }

    const avgReward = rewardHistory.reduce((sum, r) => sum + r, 0) / rewardHistory.length;

    if (avgReward >= convergenceThreshold && convergedAt === -1) {
      convergedAt = episode + 1;
      break;
    }

    agent.decayEpsilon();

    if ((episode + 1) % 100 === 0) {
      console.log(`Episode ${episode + 1}: Avg Reward = ${avgReward.toFixed(2)}, Epsilon = ${agent['epsilon'].toFixed(4)}`);
    }
  }

  const convergenceTime = performance.now() - convergenceStart;

  console.log(`\n✅ Converged at episode: ${convergedAt}`);
  console.log(`   Time to convergence: ${convergenceTime.toFixed(2)}ms`);
  console.log(`   Q-Table size: ${agent.getQTableSize()} entries`);

  const convergenceValidation = convergedAt <= 500 && convergedAt > 0;
  console.log(convergenceValidation
    ? `✅ PASSED: Converged in ${convergedAt} episodes (<= 500)`
    : `❌ FAILED: Converged in ${convergedAt} episodes (> 500)`
  );

  // Test 2: Inference Latency
  console.log('\n\n📊 Test 2: Inference Latency (Action Selection)');
  console.log('-'.repeat(80));

  const trainedAgent = new RLAgent();
  const trainEnv = new Environment();

  // Train agent first
  for (let i = 0; i < 200; i++) {
    trainedAgent.runEpisode(trainEnv);
    trainedAgent.decayEpsilon();
  }

  const inferenceResult = await runner.runBenchmark(
    'Action Selection (Inference)',
    () => {
      trainedAgent.selectAction('5', ['forward', 'backward', 'stay']);
    },
    { iterations: 10000, measureMemory: true }
  );

  runner.printResults(inferenceResult);
  const inferenceValidation = validateTarget(inferenceResult, 5);
  console.log(inferenceValidation.summary);

  // Test 3: Learning Step Overhead
  console.log('\n\n📊 Test 3: Learning Step Overhead');
  console.log('-'.repeat(80));

  const learningAgent = new RLAgent();

  const learningResult = await runner.runBenchmark(
    'Q-Learning Update',
    () => {
      learningAgent.learn('state_1', 'action_1', 1.0, 'state_2');
    },
    { iterations: 10000, measureMemory: true }
  );

  runner.printResults(learningResult);
  const learningValidation = validateTarget(learningResult, 20);
  console.log(learningValidation.summary);

  // Test 4: Batch Learning Performance
  console.log('\n\n📊 Test 4: Batch Learning Performance');
  console.log('-'.repeat(80));

  const batchSizes = [10, 50, 100, 500, 1000];

  for (const batchSize of batchSizes) {
    const batchAgent = new RLAgent();
    const experiences: Array<{ state: string; action: string; reward: number; nextState: string }> = [];

    // Generate batch of experiences
    for (let i = 0; i < batchSize; i++) {
      experiences.push({
        state: `state_${i}`,
        action: `action_${i % 3}`,
        reward: Math.random(),
        nextState: `state_${i + 1}`,
      });
    }

    const batchResult = await runner.runBenchmark(
      `Batch Learning (size=${batchSize})`,
      () => {
        for (const exp of experiences) {
          batchAgent.learn(exp.state, exp.action, exp.reward, exp.nextState);
        }
      },
      { iterations: 100, measureMemory: true }
    );

    runner.printResults(batchResult);
    console.log(`   Avg per sample: ${(batchResult.avgTime / batchSize).toFixed(3)}ms`);
  }

  // Test 5: Memory Growth Analysis
  console.log('\n\n📊 Test 5: Memory Growth During Training');
  console.log('-'.repeat(80));

  const memoryAgent = new RLAgent();
  const memoryEnv = new Environment();
  const checkpoints = [100, 200, 500, 1000];

  console.log('Training episodes and measuring memory...');
  let lastEpisode = 0;

  for (const checkpoint of checkpoints) {
    for (let i = lastEpisode; i < checkpoint; i++) {
      memoryAgent.runEpisode(memoryEnv);
      memoryAgent.decayEpsilon();
    }

    const mem = process.memoryUsage();
    console.log(`\nAfter ${checkpoint} episodes:`);
    console.log(`  Q-Table size: ${memoryAgent.getQTableSize()} entries`);
    console.log(`  Heap used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  RSS: ${(mem.rss / 1024 / 1024).toFixed(2)}MB`);

    lastEpisode = checkpoint;
  }

  // Generate report
  console.log('\n\n📄 Generating Report...');
  const report = runner.generateMarkdownReport();
  const fs = require('fs');
  const path = require('path');

  // Add convergence data to report
  let enhancedReport = report + '\n## Convergence Analysis\n\n';
  enhancedReport += `- **Converged at episode**: ${convergedAt}\n`;
  enhancedReport += `- **Time to convergence**: ${convergenceTime.toFixed(2)}ms\n`;
  enhancedReport += `- **Final Q-Table size**: ${agent.getQTableSize()} entries\n`;
  enhancedReport += `- **Target met**: ${convergenceValidation ? '✅ Yes' : '❌ No'}\n\n`;

  const reportPath = path.join(__dirname, 'results', 'rl-performance-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, enhancedReport);

  const jsonPath = path.join(__dirname, 'results', 'rl-performance.json');
  const jsonData = {
    benchmarks: runner.getResults(),
    convergence: {
      episodes: convergedAt,
      timeMs: convergenceTime,
      qTableSize: agent.getQTableSize(),
      targetMet: convergenceValidation,
    },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log(`✅ JSON data saved to: ${jsonPath}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Convergence: ${convergedAt} episodes ${convergenceValidation ? '✅' : '❌'}`);
  console.log(`Inference: ${inferenceResult.avgTime.toFixed(3)}ms ${inferenceValidation.passed ? '✅' : '❌'}`);
  console.log(`Learning: ${learningResult.avgTime.toFixed(3)}ms ${learningValidation.passed ? '✅' : '❌'}`);
}

// Run benchmarks
if (require.main === module) {
  main().catch(console.error);
}

export { RLAgent, Environment, main as runRLBenchmarks };
