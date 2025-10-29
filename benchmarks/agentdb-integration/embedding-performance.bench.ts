/**
 * Embedding Bridge Performance Benchmarks
 * Tests all 4 embedding methods with variable sequence lengths
 * Target: <10ms per embedding generation
 */

import { BenchmarkRunner, validateTarget } from './utils/benchmark-runner';

// Mock embedding methods (simulating AgentDB integration)
class EmbeddingBridge {
  /**
   * Method 1: Direct state vector embedding (fastest)
   */
  async embedStateVector(stateVector: Float32Array): Promise<Float32Array> {
    // Simulate minimal processing - just normalization
    const norm = Math.sqrt(stateVector.reduce((sum, val) => sum + val * val, 0));
    return new Float32Array(stateVector.map(val => val / norm));
  }

  /**
   * Method 2: Token-based embedding (moderate)
   */
  async embedTokenSequence(tokens: number[], vocabSize: number = 10000): Promise<Float32Array> {
    // Simulate tokenization + embedding lookup
    const embedding = new Float32Array(512); // 512-dim embeddings

    for (const token of tokens) {
      const tokenEmbed = this.getTokenEmbedding(token, vocabSize);
      for (let i = 0; i < 512; i++) {
        embedding[i] += tokenEmbed[i];
      }
    }

    // Average pooling
    const scale = 1 / tokens.length;
    for (let i = 0; i < 512; i++) {
      embedding[i] *= scale;
    }

    return embedding;
  }

  /**
   * Method 3: Pattern-based embedding (complex)
   */
  async embedPattern(pattern: any): Promise<Float32Array> {
    // Simulate pattern analysis + feature extraction
    const features = this.extractPatternFeatures(pattern);
    const embedding = new Float32Array(768); // 768-dim for patterns

    // Simulate neural encoding
    for (let i = 0; i < 768; i++) {
      embedding[i] = Math.tanh(features.reduce((sum, f) => sum + f * Math.sin(i * 0.1), 0));
    }

    return embedding;
  }

  /**
   * Method 4: Hybrid temporal embedding (most complex)
   */
  async embedTemporalSequence(sequence: Float32Array[], windowSize: number = 10): Promise<Float32Array> {
    // Simulate temporal convolution + attention
    const embedding = new Float32Array(1024); // 1024-dim for temporal

    for (let t = 0; t < sequence.length; t++) {
      const weight = Math.exp(-0.1 * (sequence.length - t)); // Temporal decay
      const state = sequence[t];

      for (let i = 0; i < Math.min(state.length, 1024); i++) {
        embedding[i] += state[i] * weight;
      }
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < 1024; i++) {
      embedding[i] /= norm;
    }

    return embedding;
  }

  // Helper methods
  private getTokenEmbedding(token: number, vocabSize: number): Float32Array {
    const embedding = new Float32Array(512);
    // Simulate pre-trained embedding lookup
    for (let i = 0; i < 512; i++) {
      embedding[i] = Math.sin(token * i * 0.01) * Math.cos(token * 0.1);
    }
    return embedding;
  }

  private extractPatternFeatures(pattern: any): number[] {
    // Simulate feature extraction
    const features: number[] = [];
    const keys = Object.keys(pattern);

    for (const key of keys) {
      const value = pattern[key];
      if (typeof value === 'number') {
        features.push(value);
      } else if (typeof value === 'string') {
        features.push(value.length * 0.1);
      }
    }

    return features;
  }
}

// Test data generators
function generateStateVector(size: number): Float32Array {
  const vector = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    vector[i] = Math.random() * 2 - 1;
  }
  return vector;
}

function generateTokenSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10000));
}

function generatePattern(complexity: number): any {
  const pattern: any = {};
  for (let i = 0; i < complexity; i++) {
    pattern[`field_${i}`] = Math.random() > 0.5 ? Math.random() : `value_${i}`;
  }
  return pattern;
}

function generateTemporalSequence(length: number, stateSize: number): Float32Array[] {
  return Array.from({ length }, () => generateStateVector(stateSize));
}

async function main() {
  console.log('='.repeat(80));
  console.log('EMBEDDING BRIDGE PERFORMANCE BENCHMARKS');
  console.log('='.repeat(80));
  console.log('Target: <10ms per embedding generation\n');

  const runner = new BenchmarkRunner();
  const bridge = new EmbeddingBridge();
  const sequenceLengths = [10, 50, 100, 500, 1000];

  // Test 1: Direct State Vector Embedding
  console.log('\n📊 Test 1: Direct State Vector Embedding');
  console.log('-'.repeat(80));

  for (const length of sequenceLengths) {
    const testData = generateStateVector(length);
    const result = await runner.runBenchmark(
      `State Vector (dim=${length})`,
      async () => {
        await bridge.embedStateVector(testData);
      },
      { iterations: 1000, measureMemory: true }
    );

    runner.printResults(result);
    const validation = validateTarget(result, 10);
    console.log(validation.summary);
  }

  // Test 2: Token-based Embedding
  console.log('\n\n📊 Test 2: Token-based Embedding');
  console.log('-'.repeat(80));

  for (const length of sequenceLengths) {
    const testData = generateTokenSequence(length);
    const result = await runner.runBenchmark(
      `Token Sequence (length=${length})`,
      async () => {
        await bridge.embedTokenSequence(testData);
      },
      { iterations: 1000, measureMemory: true }
    );

    runner.printResults(result);
    const validation = validateTarget(result, 10);
    console.log(validation.summary);
  }

  // Test 3: Pattern-based Embedding
  console.log('\n\n📊 Test 3: Pattern-based Embedding');
  console.log('-'.repeat(80));

  for (const complexity of [5, 10, 20, 50, 100]) {
    const testData = generatePattern(complexity);
    const result = await runner.runBenchmark(
      `Pattern (complexity=${complexity})`,
      async () => {
        await bridge.embedPattern(testData);
      },
      { iterations: 1000, measureMemory: true }
    );

    runner.printResults(result);
    const validation = validateTarget(result, 10);
    console.log(validation.summary);
  }

  // Test 4: Temporal Sequence Embedding
  console.log('\n\n📊 Test 4: Temporal Sequence Embedding');
  console.log('-'.repeat(80));

  for (const seqLength of [10, 20, 50]) {
    const testData = generateTemporalSequence(seqLength, 128);
    const result = await runner.runBenchmark(
      `Temporal (sequence=${seqLength}, state=128)`,
      async () => {
        await bridge.embedTemporalSequence(testData);
      },
      { iterations: 500, measureMemory: true }
    );

    runner.printResults(result);
    const validation = validateTarget(result, 10);
    console.log(validation.summary);
  }

  // CPU and Memory Analysis
  console.log('\n\n📊 CPU and Memory Analysis');
  console.log('-'.repeat(80));

  const cpuIntensiveTest = generateStateVector(1000);
  const cpuResult = await runner.runBenchmark(
    'CPU Intensive (1000-dim state)',
    async () => {
      await bridge.embedStateVector(cpuIntensiveTest);
    },
    { iterations: 5000, measureMemory: true, gc: true }
  );

  runner.printResults(cpuResult);

  // Generate report
  console.log('\n\n📄 Generating Report...');
  const report = runner.generateMarkdownReport();
  const fs = require('fs');
  const path = require('path');

  const reportPath = path.join(__dirname, 'results', 'embedding-performance-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);

  const jsonPath = path.join(__dirname, 'results', 'embedding-performance.json');
  fs.writeFileSync(jsonPath, runner.exportToJSON());

  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log(`✅ JSON data saved to: ${jsonPath}`);

  // Summary
  const results = runner.getResults();
  const passedTests = results.filter(r => r.avgTime <= 10).length;
  const totalTests = results.length;
  const passRate = (passedTests / totalTests) * 100;

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Tests Passed: ${passedTests}/${totalTests} (${passRate.toFixed(1)}%)`);
  console.log(`Average Latency: ${(results.reduce((sum, r) => sum + r.avgTime, 0) / results.length).toFixed(3)}ms`);
  console.log(`Best Performance: ${Math.min(...results.map(r => r.avgTime)).toFixed(3)}ms`);
  console.log(`Worst Performance: ${Math.max(...results.map(r => r.avgTime)).toFixed(3)}ms`);
}

// Run benchmarks
if (require.main === module) {
  main().catch(console.error);
}

export { EmbeddingBridge, main as runEmbeddingBenchmarks };
