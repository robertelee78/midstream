# AgentDB + Midstream Integration: Adaptive Learning Engine

## Overview

The Adaptive Learning Engine provides RL-based parameter optimization for Midstream streaming analysis using AgentDB's reinforcement learning capabilities.

## Features

### 🧠 Reinforcement Learning
- **Algorithm**: Actor-Critic (recommended for continuous action spaces)
- **Alternative algorithms**: Q-Learning, SARSA, DQN
- **Neural network**: 128→64 hidden layers for actor and critic

### 📊 State Space (20 dimensions)
1. **Parameters (6 dims)**:
   - Window size (10-1000)
   - Slide size (1-500)
   - Threshold (0.1-10.0)
   - Sensitivity (0.5-2.0)
   - Adaptive threshold (boolean)
   - Detection method (dtw/statistical/hybrid)

2. **Metrics (8 dims)**:
   - Accuracy, precision, recall
   - False positive rate
   - Latency (ms)
   - Throughput (events/sec)
   - Memory usage (MB)
   - CPU usage (%)

3. **Data Characteristics (5 dims)**:
   - Variance
   - Trend (increasing/decreasing/stable/oscillating)
   - Seasonality
   - Outlier rate
   - Missing data rate

4. **Historical Performance (1 dim)**:
   - Rolling average reward

### 🎯 Action Space (5 dimensions)
- Window size adjustment: ±50
- Slide size adjustment: ±25
- Threshold adjustment: ±0.5
- Sensitivity adjustment: ±0.2
- Method/adaptive toggle

### 🎁 Multi-Objective Reward Function
Default weights:
- **Accuracy**: +1.0 (primary objective)
- **Latency**: -0.3 (minimize processing time)
- **Memory**: -0.2 (minimize memory usage)
- **False Positives**: -0.8 (heavily penalize)
- **Throughput**: +0.5 (maximize processing rate)

Customizable for different optimization goals.

### 💾 Experience Replay
- Buffer size: 10,000 transitions
- Batch size: 32 (configurable)
- Target network updates: every 100 steps

### ⚙️ Auto-Tuning Mode
- Configurable evaluation intervals
- Continuous parameter optimization
- Automatic feedback loop
- Overhead monitoring (<5% target)

### 💾 State Persistence
- Export/import learning state
- Resume training across sessions
- Versioned state format
- Includes RL agent weights

## Installation

```bash
# Install dependencies
npm install agentdb

# Or if using AgentDB locally
# (See AgentDB documentation)
```

## Quick Start

### 1. Basic Integration

```typescript
import { AdaptiveLearningEngine } from './adaptive-learning-engine';
import { AgentDB } from 'agentdb';

// Initialize AgentDB
const agentdb = new AgentDB('./data');
await agentdb.initialize();

// Create learning engine
const engine = new AdaptiveLearningEngine(agentdb);
await engine.initializeAgent('actor_critic');

// Training loop
for (let i = 0; i < 100; i++) {
  // Get optimized parameters
  const result = await engine.getOptimizedParams();

  // Apply to Midstreamer
  midstreamer.updateParameters(result.params);

  // Run analysis and collect metrics
  const metrics = await midstreamer.analyze();

  // Update agent with feedback
  await engine.updateFromMetrics(metrics, result.params);
}

// Check results
const stats = engine.getStatistics();
console.log('Best reward:', stats.bestReward);
console.log('Best params:', stats.bestParams);
```

### 2. Auto-Tuning Mode

```typescript
// Enable auto-tuning with 5-second intervals
await engine.enableAutoTuning(5000, async (params) => {
  // Apply parameters
  midstreamer.updateParameters(params);

  // Run analysis
  const results = await midstreamer.analyze();

  // Return metrics
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

// Let it learn...
await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes

// Stop and check results
engine.disableAutoTuning();
const stats = engine.getStatistics();
```

### 3. State Persistence

```typescript
import * as fs from 'fs';

// After training
const state = await engine.exportState();
fs.writeFileSync('learning-state.json', JSON.stringify(state));

// In next session
const savedState = JSON.parse(fs.readFileSync('learning-state.json', 'utf8'));
await engine.importState(savedState);
// Continue learning from where you left off
```

### 4. Custom Reward Function

```typescript
// Optimize for low latency and high throughput
const customReward = {
  weights: {
    accuracy: 0.8,
    latency: -0.6,      // Heavy penalty
    memory: -0.1,
    falsePositives: -0.5,
    throughput: 0.9     // High reward
  },
  normalize: true
};

const engine = new AdaptiveLearningEngine(agentdb, {}, customReward);
```

## Configuration Options

### Learning Config

```typescript
interface LearningConfig {
  algorithm: 'actor_critic' | 'q_learning' | 'sarsa' | 'dqn';
  learningRate: number;           // 0.0001-0.01 (default: 0.001)
  discountFactor: number;         // 0.9-0.99 (default: 0.99)
  explorationRate: number;        // 0-1 (default: 1.0)
  explorationDecay: number;       // 0.99-0.999 (default: 0.995)
  minExplorationRate: number;     // 0.01-0.1 (default: 0.01)
  batchSize: number;              // 16-128 (default: 32)
  replayBufferSize: number;       // 1000-10000 (default: 10000)
  targetUpdateFrequency: number;  // 50-500 (default: 100)
}
```

### Reward Function

```typescript
interface RewardFunction {
  weights: {
    accuracy: number;        // Typically positive
    latency: number;         // Typically negative
    memory: number;          // Typically negative
    falsePositives: number;  // Typically negative
    throughput: number;      // Typically positive
  };
  normalize: boolean;        // Normalize metrics to 0-1
}
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Convergence** | <500 episodes | Time to stable policy |
| **Improvement** | >15% over baseline | Performance gain |
| **Overhead** | <5% | Learning overhead |
| **Memory** | <500MB | Total memory usage |

## API Reference

### AdaptiveLearningEngine

#### Constructor
```typescript
constructor(
  agentdb: AgentDB,
  config?: Partial<LearningConfig>,
  rewardFunction?: Partial<RewardFunction>
)
```

#### Methods

- **`initializeAgent(algorithm?: string): Promise<void>`**
  - Initialize RL agent with AgentDB
  - Algorithm: 'actor_critic' (default), 'q_learning', 'sarsa', 'dqn'

- **`getOptimizedParams(): Promise<OptimizationResult>`**
  - Get optimized parameters from current policy
  - Returns: params, confidence, expectedReward, explorationRate

- **`updateFromMetrics(metrics: StreamingMetrics, currentParams: StreamingParameters): Promise<void>`**
  - Update agent with feedback from streaming analysis
  - Trains agent and updates state

- **`enableAutoTuning(interval: number, callback: (params) => Promise<StreamingMetrics>): Promise<void>`**
  - Enable continuous auto-tuning mode
  - Interval: milliseconds between evaluations
  - Callback: function to apply params and return metrics

- **`disableAutoTuning(): void`**
  - Disable auto-tuning mode

- **`getStatistics(): LearningStatistics`**
  - Get current learning statistics
  - Returns: episodeCount, totalSteps, bestReward, bestParams, convergenceProgress

- **`exportState(): Promise<any>`**
  - Export complete learning state for persistence
  - Includes config, statistics, history, RL agent weights

- **`importState(state: any): Promise<void>`**
  - Import learning state from previous session
  - Resume training from saved state

- **`reset(): void`**
  - Reset learning state (start fresh)

## Examples

See `/workspaces/midstream/src/agentdb-integration/adaptive-learning-example.ts` for complete examples:

1. **Basic Integration**: Manual feedback loop
2. **Auto-Tuning**: Continuous optimization
3. **State Persistence**: Save/resume learning
4. **Custom Reward**: Optimize for specific goals

Run examples:
```bash
npx ts-node src/agentdb-integration/adaptive-learning-example.ts
```

## Integration with Midstream

### Step 1: Connect to Midstreamer

```typescript
import { Midstreamer } from '../midstream-analyzer'; // Your Midstream module

const midstreamer = new Midstreamer(config);
```

### Step 2: Create Metrics Adapter

```typescript
function createMetricsFromAnalysis(results: any): StreamingMetrics {
  return {
    accuracy: results.detectionAccuracy,
    precision: results.precision,
    recall: results.recall,
    falsePositiveRate: results.falsePositiveRate,
    latency: results.processingTimeMs,
    throughput: results.eventsPerSecond,
    memoryUsage: results.memoryUsageMB,
    cpuUsage: results.cpuPercent
  };
}
```

### Step 3: Apply Parameters

```typescript
function applyParametersToMidstream(params: StreamingParameters) {
  midstreamer.setWindowSize(params.windowSize);
  midstreamer.setSlideSize(params.slideSize);
  midstreamer.setThreshold(params.threshold);
  midstreamer.setSensitivity(params.sensitivity);
  midstreamer.setAdaptiveThreshold(params.adaptiveThreshold);
  midstreamer.setDetectionMethod(params.anomalyDetectionMethod);
}
```

### Step 4: Run Optimization Loop

```typescript
await engine.enableAutoTuning(5000, async (params) => {
  applyParametersToMidstream(params);
  const results = await midstreamer.analyze();
  return createMetricsFromAnalysis(results);
});
```

## Monitoring

### Real-time Statistics

```typescript
setInterval(() => {
  const stats = engine.getStatistics();
  console.log('Episodes:', stats.episodeCount);
  console.log('Best Reward:', stats.bestReward);
  console.log('Convergence:', (stats.convergenceProgress * 100).toFixed(1) + '%');
  console.log('Exploration:', stats.currentExplorationRate.toFixed(4));
}, 10000); // Every 10 seconds
```

### Convergence Monitoring

```typescript
const stats = engine.getStatistics();
if (stats.convergenceProgress > 0.95) {
  console.log('✅ Converged! Using best parameters:', stats.bestParams);
  engine.disableAutoTuning();
}
```

## Troubleshooting

### Slow Convergence
- Increase learning rate: `learningRate: 0.005`
- Decrease exploration decay: `explorationDecay: 0.99`
- Reduce batch size: `batchSize: 16`

### High Variance
- Decrease learning rate: `learningRate: 0.0001`
- Increase batch size: `batchSize: 64`
- Increase discount factor: `discountFactor: 0.995`

### Memory Issues
- Reduce replay buffer: `replayBufferSize: 5000`
- Reduce history tracking
- Use state compression

### Poor Performance
- Adjust reward function weights
- Increase training episodes
- Check metric quality
- Verify parameter ranges

## Best Practices

1. **Start with defaults**: Use default config for initial testing
2. **Monitor convergence**: Track convergence progress regularly
3. **Save states**: Export state periodically for recovery
4. **Custom rewards**: Tailor reward function to your goals
5. **Validate metrics**: Ensure metrics are accurate and representative
6. **Gradual deployment**: Test in staging before production
7. **Monitor overhead**: Keep learning overhead <5%

## Advanced Usage

### Multi-Objective Optimization

```typescript
// Pareto-optimal solutions
const configs = [
  { weights: { accuracy: 1.0, latency: -0.5, ... } },
  { weights: { accuracy: 0.8, latency: -0.8, ... } },
  { weights: { accuracy: 0.9, latency: -0.3, ... } }
];

for (const config of configs) {
  const engine = new AdaptiveLearningEngine(agentdb, {}, config);
  // Train and compare results
}
```

### Transfer Learning

```typescript
// Train on dataset A
const engineA = new AdaptiveLearningEngine(agentdb);
await trainOnDatasetA(engineA);

// Export state
const stateA = await engineA.exportState();

// Transfer to dataset B
const engineB = new AdaptiveLearningEngine(agentdb);
await engineB.importState(stateA);
await trainOnDatasetB(engineB); // Start from pre-trained state
```

### Ensemble Methods

```typescript
// Train multiple agents
const agents = await Promise.all([
  trainEngine({ explorationRate: 0.5 }),
  trainEngine({ explorationRate: 0.7 }),
  trainEngine({ explorationRate: 0.3 })
]);

// Aggregate predictions
const params = aggregateParams(
  agents.map(a => a.getStatistics().bestParams)
);
```

## References

- [AgentDB Documentation](https://github.com/ruvnet/agentdb)
- [Midstream Documentation](../README.md)
- [Actor-Critic Algorithm](https://arxiv.org/abs/1602.01783)
- [Experience Replay](https://arxiv.org/abs/1312.5602)

## License

MIT License - See main project LICENSE file
