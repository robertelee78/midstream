# AI Defence Learning Module

This module implements adaptive learning using **AgentDB's ReasoningBank** and **Reflexion** frameworks for continuous improvement of threat detection.

## Components

### 1. ReasoningBankCoordinator (`reasoningbank.js`)

Manages coordination learning using AgentDB's ReasoningBank capabilities:

- **Trajectory Storage**: Records agent coordination patterns with outcomes
- **Verdict Judgment**: Classifies coordination success/failure with confidence scoring
- **Memory Distillation**: Extracts reusable coordination patterns using ML
- **Best Practice Retrieval**: Queries optimal coordination strategies for scenarios
- **Neural Pattern Training**: Leverages AgentDB's 9 RL algorithms

**Supported RL Algorithms**:
- Decision Transformer
- Q-Learning
- SARSA
- Actor-Critic
- Policy Gradient
- DQN (Deep Q-Network)
- A3C (Asynchronous Actor-Critic)
- PPO (Proximal Policy Optimization)
- DDPG (Deep Deterministic Policy Gradient)

### 2. ReflexionEngine (`reflexion-engine.js`)

Implements self-reflection for iterative detection improvement:

- **Episode Recording**: Stores detection attempts with detailed outcomes
- **Failure Analysis**: Identifies root causes of detection failures
- **Hypothesis Generation**: Creates improvement hypotheses based on analysis
- **Trajectory Optimization**: Tests and applies optimizations
- **Critique Generation**: Provides actionable feedback

## Usage

### Basic Setup

```javascript
const { initializeLearning, recordDetectionWithLearning } = require('./learning');

// Initialize learning system
const learningSystem = await initializeLearning({
  dbPath: './agentdb.db',
  minAttempts: 3,
  minSuccessRate: 0.6,
  minConfidence: 0.7,
  epochs: 10
});

const { coordinator, reflexionEngine } = learningSystem;
```

### Record Detection Episodes

```javascript
// Record a detection attempt
const detection = {
  input: 'User prompt to analyze',
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

const result = await recordDetectionWithLearning(
  learningSystem,
  detection,
  outcome
);

console.log(`Episode ${result.episodeId} recorded`);
console.log('Reflection:', result.reflection);
```

### Query Best Practices

```javascript
const { optimizeDetectionStrategy } = require('./learning');

// Get best practices for a scenario
const optimization = await optimizeDetectionStrategy(
  learningSystem,
  'prompt_injection_detection'
);

console.log('Best Practice:', optimization.bestPractice);
console.log('Patterns Extracted:', optimization.patterns.length);
```

### Generate Improvement Hypotheses

```javascript
// Reflexion engine automatically generates hypotheses for failed episodes
const hypotheses = reflexionEngine.getAllHypotheses('pending');

console.log(`${hypotheses.length} improvement hypotheses generated`);

for (const hypothesis of hypotheses) {
  console.log(`- ${hypothesis.description}`);
  console.log(`  Expected improvement: ${hypothesis.expectedImprovement}`);
  console.log(`  Confidence: ${hypothesis.confidence}`);
}
```

### Optimize Detection Trajectory

```javascript
// Apply hypotheses to optimize detection
const episode = reflexionEngine.episodes.get(episodeId);
const hypotheses = reflexionEngine.getAllHypotheses('pending');

const optimizedTrajectory = await reflexionEngine.optimizeTrajectory(
  episode,
  hypotheses
);

console.log(`Total improvement: ${optimizedTrajectory.totalImprovement.toFixed(2)}`);
```

### Train Neural Patterns

```javascript
const { trainModels } = require('./learning');

// Train on accumulated episodes
const trainingResult = await trainModels(
  learningSystem,
  'threat-detection'
);

console.log('Training complete:', trainingResult);
```

### Monitor Learning Metrics

```javascript
const { getLearningMetrics } = require('./learning');

const metrics = getLearningMetrics(learningSystem);

console.log('Coordination Metrics:', metrics.coordination);
console.log('Reflexion Metrics:', metrics.reflexion);
```

## Advanced Features

### Causal Edge Discovery

The ReasoningBankCoordinator automatically discovers causal relationships:

```javascript
// Automatically discovers patterns like:
// "enable_multimodal_detection" → "higher_recall" (uplift: 0.25, confidence: 0.90)
// "increase_threshold" → "fewer_false_positives" (uplift: 0.30, confidence: 0.85)

const patterns = await coordinator.distillMemory();

for (const pattern of patterns) {
  console.log(`${pattern.cause} → ${pattern.effect}`);
  console.log(`  Uplift: ${pattern.uplift.toFixed(2)}, Confidence: ${pattern.confidence.toFixed(2)}`);
}
```

### Skill Consolidation

Successful patterns are automatically consolidated into reusable skills:

```javascript
// AgentDB's skill consolidation extracts:
// - Keyword frequency patterns
// - Critique patterns
// - Reward distributions
// - Metadata correlations
// - Learning curves

// Skills are automatically available for future queries
const bestPractice = await coordinator.queryBestPractice(
  'handle_adversarial_inputs',
  { k: 5, onlySuccesses: true }
);
```

### Memory Optimization

Periodic memory consolidation and compression:

```javascript
// Optimize memory and consolidate patterns
await coordinator.optimizeMemory();

// This performs:
// - Pattern consolidation
// - Memory compression
// - Outdated episode pruning
// - Skill quality assessment
```

## Performance Metrics

The learning system tracks comprehensive metrics:

```javascript
const metrics = getLearningMetrics(learningSystem);

// Coordination metrics
console.log('Success Rate:', metrics.coordination.successRate);
console.log('Avg Reward:', metrics.coordination.avgReward);
console.log('Patterns Extracted:', metrics.coordination.patternsExtracted);

// Reflexion metrics
console.log('Episodes Recorded:', metrics.reflexion.episodesRecorded);
console.log('Hypotheses Tested:', metrics.reflexion.hypothesesTested);
console.log('Avg Improvement:', metrics.reflexion.avgImprovementRate);
```

## Integration with Threat Detection

### Example: Adaptive Threat Detector

```javascript
const { initializeLearning, recordDetectionWithLearning } = require('./learning');

class AdaptiveThreatDetector {
  constructor() {
    this.learningSystem = null;
  }

  async initialize() {
    this.learningSystem = await initializeLearning({
      dbPath: './threat-detection.db'
    });
  }

  async detect(input, options = {}) {
    // Query best practices for this type of input
    const bestPractice = await this.learningSystem.coordinator.queryBestPractice(
      `detect_${options.type || 'general'}`,
      { k: 3 }
    );

    // Use learned parameters if available
    const threshold = bestPractice.found
      ? bestPractice.episodes[0]?.parameters?.threshold || 0.75
      : 0.75;

    // Perform detection
    const detection = {
      input,
      type: options.type,
      method: options.method || 'standard',
      parameters: { threshold, ...options }
    };

    // ... detection logic ...

    const outcome = {
      success: true,
      threats: detectedThreats,
      accuracy: 0.95,
      // ... other metrics ...
    };

    // Record for learning
    await recordDetectionWithLearning(
      this.learningSystem,
      detection,
      outcome
    );

    return outcome;
  }
}
```

## AgentDB CLI Integration

The learning module uses AgentDB CLI commands:

```bash
# Initialize database
npx agentdb init ./agentdb.db --dimension 768 --preset medium

# Store reflexion episodes
npx agentdb reflexion store <session-id> <task> <reward> <success>

# Retrieve past episodes
npx agentdb reflexion retrieve "authentication" --k 10 --synthesize-context

# Discover causal patterns
npx agentdb learner run 3 0.6 0.7

# Consolidate skills
npx agentdb skill consolidate 3 0.7 7 true

# Query coordination patterns
npx agentdb query --query "successful detection" --k 5 --synthesize-context
```

## Benefits

1. **Continuous Improvement**: System learns from every detection attempt
2. **Pattern Recognition**: Automatically identifies successful strategies
3. **Adaptive Thresholds**: Optimizes detection parameters based on outcomes
4. **Root Cause Analysis**: Identifies why detections fail
5. **Hypothesis Testing**: Systematically tests improvement ideas
6. **Knowledge Transfer**: Shares learned patterns across agents
7. **Performance Optimization**: Reduces false positives/negatives over time

## Requirements

- Node.js >= 18.0.0
- AgentDB >= 2.0.0 (optional dependency)
- nanoid >= 3.3.7

## See Also

- [AgentDB Documentation](https://github.com/yourusername/agentdb)
- [Reflexion Framework Paper](https://arxiv.org/abs/2303.11366)
- [ReasoningBank Overview](../docs/reasoningbank.md)
