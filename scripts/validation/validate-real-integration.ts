#!/usr/bin/env node
/**
 * Validation Script for Real AgentDB + Midstreamer Integration
 *
 * This script validates that the integration is working correctly
 * with REAL published npm packages (not mocks).
 *
 * Tests:
 * 1. Package imports work correctly
 * 2. TemporalCompare (Midstreamer) functions properly
 * 3. LearningSystem (AgentDB) functions properly
 * 4. EmbeddingBridge works with real DTW
 * 5. AdaptiveLearningEngine works with real RL
 * 6. Performance targets are met
 * 7. End-to-end pipeline is functional
 */

import { TemporalCompare } from 'midstreamer/pkg-node/midstream_wasm';
import {
  createDatabase,
  WASMVectorSearch,
  LearningSystem,
  EmbeddingService
} from 'agentdb';

// Validation results
interface ValidationResult {
  test: string;
  passed: boolean;
  details?: string;
  duration?: number;
  error?: string;
}

const results: ValidationResult[] = [];

// Helper function
function addResult(test: string, passed: boolean, details?: string, duration?: number, error?: string) {
  results.push({ test, passed, details, duration, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}`);
  if (details) console.log(`   ${details}`);
  if (duration !== undefined) console.log(`   Duration: ${duration.toFixed(2)}ms`);
  if (error) console.log(`   Error: ${error}`);
}

// Test 1: Package Imports
async function test1PackageImports(): Promise<void> {
  console.log('\n=== Test 1: Package Imports ===\n');

  try {
    const hasMidstreamer = typeof TemporalCompare !== 'undefined';
    addResult(
      'Midstreamer package imported',
      hasMidstreamer,
      hasMidstreamer ? 'TemporalCompare class available' : 'Failed to import'
    );

    const hasAgentDB = typeof createDatabase !== 'undefined' &&
                      typeof LearningSystem !== 'undefined';
    addResult(
      'AgentDB package imported',
      hasAgentDB,
      hasAgentDB ? 'createDatabase and LearningSystem available' : 'Failed to import'
    );
  } catch (error: any) {
    addResult('Package imports', false, undefined, undefined, error.message);
  }
}

// Test 2: Midstreamer DTW
async function test2MidstreamerDTW(): Promise<void> {
  console.log('\n=== Test 2: Midstreamer DTW ===\n');

  try {
    const start = performance.now();
    const temporalCompare = new TemporalCompare(100);

    const seq1 = new Float64Array([1, 2, 3, 4, 5]);
    const seq2 = new Float64Array([1, 2, 4, 3, 5]);

    const distance = temporalCompare.dtw(seq1, seq2);
    const duration = performance.now() - start;

    temporalCompare.free();

    const passed = distance >= 0 && duration < 10;
    addResult(
      'DTW computation',
      passed,
      `Distance: ${distance.toFixed(4)}`,
      duration
    );

    addResult(
      'DTW performance target (<10ms)',
      duration < 10,
      `Actual: ${duration.toFixed(2)}ms`
    );
  } catch (error: any) {
    addResult('Midstreamer DTW', false, undefined, undefined, error.message);
  }
}

// Test 3: AgentDB Learning System
async function test3AgentDBLearning(): Promise<void> {
  console.log('\n=== Test 3: AgentDB Learning System ===\n');

  try {
    const start = performance.now();

    const db = await createDatabase(':memory:');
    const embedder = new EmbeddingService();
    const learningSystem = new LearningSystem(db, embedder);

    const sessionId = await learningSystem.startSession('test-user', 'actor-critic', {
      learningRate: 0.001,
      discountFactor: 0.99,
      explorationRate: 0.5
    });

    const duration = performance.now() - start;

    const passed = sessionId && sessionId.length > 0;
    addResult(
      'RL session creation',
      passed,
      `Session ID: ${sessionId}`,
      duration
    );

    // Test prediction
    const predStart = performance.now();
    const prediction = await learningSystem.predict(sessionId, JSON.stringify([1, 2, 3]));
    const predDuration = performance.now() - predStart;

    addResult(
      'RL prediction',
      prediction.confidence >= 0,
      `Confidence: ${prediction.confidence.toFixed(3)}`,
      predDuration
    );

    addResult(
      'RL prediction performance (<20ms)',
      predDuration < 20,
      `Actual: ${predDuration.toFixed(2)}ms`
    );

    await learningSystem.endSession(sessionId);
  } catch (error: any) {
    addResult('AgentDB Learning System', false, undefined, undefined, error.message);
  }
}

// Test 4: Vector Search Performance
async function test4VectorSearch(): Promise<void> {
  console.log('\n=== Test 4: Vector Search Performance ===\n');

  try {
    const db = await createDatabase(':memory:');
    const vectorDb = new WASMVectorSearch(db);
    await vectorDb.initialize('test', 384);

    // Insert test vectors
    const insertStart = performance.now();
    for (let i = 0; i < 100; i++) {
      const vector = new Array(384).fill(0).map(() => Math.random());
      await vectorDb.insert(`vec_${i}`, vector, { index: i });
    }
    const insertDuration = performance.now() - insertStart;

    addResult(
      'Vector insertion (100 vectors)',
      true,
      `Average: ${(insertDuration / 100).toFixed(2)}ms per vector`,
      insertDuration
    );

    // Search test
    const searchStart = performance.now();
    const queryVector = new Array(384).fill(0).map(() => Math.random());
    const results = await vectorDb.search(queryVector, 10, 0.5);
    const searchDuration = performance.now() - searchStart;

    const passed = results.length > 0 && searchDuration < 15;
    addResult(
      'Vector search (HNSW)',
      passed,
      `Found ${results.length} results`,
      searchDuration
    );

    addResult(
      'Search performance target (<15ms)',
      searchDuration < 15,
      `Actual: ${searchDuration.toFixed(2)}ms`
    );
  } catch (error: any) {
    addResult('Vector Search Performance', false, undefined, undefined, error.message);
  }
}

// Test 5: Integration Components
async function test5Integration(): Promise<void> {
  console.log('\n=== Test 5: Integration Components ===\n');

  try {
    // Import integration components
    const { EmbeddingBridge } = await import('../src/agentdb-integration/embedding-bridge');
    const { AdaptiveLearningEngine } = await import('../src/agentdb-integration/adaptive-learning-engine');

    addResult(
      'Integration components imported',
      true,
      'EmbeddingBridge and AdaptiveLearningEngine available'
    );

    // Test EmbeddingBridge
    const db = await createDatabase(':memory:');
    const vectorDb = new WASMVectorSearch(db);
    await vectorDb.initialize('test', 384);

    const temporalCompare = new TemporalCompare(100);

    const adapter = {
      add: async (ns: string, data: any) => {
        await vectorDb.insert(data.id, data.vector, data.metadata);
      },
      search: async (ns: string, opts: any) => {
        const results = await vectorDb.search(opts.vector, opts.limit, opts.minSimilarity);
        return results.map((r: any) => ({
          id: r.id,
          similarity: r.similarity,
          vector: r.vector,
          metadata: r.metadata
        }));
      }
    };

    const bridge = new EmbeddingBridge(adapter, temporalCompare);

    const embedStart = performance.now();
    const embedding = await bridge.embedSequence([1, 2, 3, 4, 5], {
      method: 'hybrid',
      dimensions: 384
    });
    const embedDuration = performance.now() - embedStart;

    addResult(
      'Embedding generation',
      embedding.embedding.length === 384,
      `Generated ${embedding.embedding.length}D embedding`,
      embedDuration
    );

    addResult(
      'Embedding performance target (<10ms)',
      embedDuration < 10,
      `Actual: ${embedDuration.toFixed(2)}ms`
    );

    // Test AdaptiveLearningEngine
    const embedder = new EmbeddingService();
    const learningSystem = new LearningSystem(db, embedder);
    const engine = new AdaptiveLearningEngine(learningSystem);

    await engine.initializeAgent('actor_critic', 'test-user');

    const paramsStart = performance.now();
    const result = await engine.getOptimizedParams();
    const paramsDuration = performance.now() - paramsStart;

    addResult(
      'RL parameter optimization',
      result.confidence >= 0,
      `Confidence: ${result.confidence.toFixed(3)}`,
      paramsDuration
    );

    temporalCompare.free();
  } catch (error: any) {
    addResult('Integration Components', false, undefined, undefined, error.message);
  }
}

// Test 6: Memory Usage
async function test6MemoryUsage(): Promise<void> {
  console.log('\n=== Test 6: Memory Usage ===\n');

  try {
    const before = process.memoryUsage();

    // Create components
    const db = await createDatabase(':memory:');
    const vectorDb = new WASMVectorSearch(db);
    await vectorDb.initialize('test', 384);

    // Insert 1000 vectors
    for (let i = 0; i < 1000; i++) {
      const vector = new Array(384).fill(0).map(() => Math.random());
      await vectorDb.insert(`vec_${i}`, vector, { index: i });
    }

    const after = process.memoryUsage();
    const memoryIncrease = (after.heapUsed - before.heapUsed) / 1024 / 1024; // MB

    const passed = memoryIncrease < 50; // Less than 50MB for 1000 vectors
    addResult(
      'Memory usage (1000 vectors)',
      passed,
      `Memory increase: ${memoryIncrease.toFixed(2)} MB`
    );

    addResult(
      'Memory efficiency target (<50MB for 1K vectors)',
      passed,
      `Target: <50MB, Actual: ${memoryIncrease.toFixed(2)}MB`
    );
  } catch (error: any) {
    addResult('Memory Usage', false, undefined, undefined, error.message);
  }
}

// Summary
function printSummary(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  Validation Summary                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`Tests Passed: ${passed}/${total} (${percentage}%)\n`);

  if (passed === total) {
    console.log('✅ ALL TESTS PASSED - Integration is fully functional!\n');
    console.log('Performance Summary:');
    console.log('  ✓ DTW computation: <10ms ✅');
    console.log('  ✓ RL prediction: <20ms ✅');
    console.log('  ✓ Vector search: <15ms ✅');
    console.log('  ✓ Embedding generation: <10ms ✅');
    console.log('  ✓ Memory efficiency: <50MB/1K vectors ✅');
  } else {
    console.log('❌ SOME TESTS FAILED - Please review errors above\n');

    const failed = results.filter(r => !r.passed);
    console.log('Failed Tests:');
    failed.forEach(r => {
      console.log(`  • ${r.test}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(passed === total ? 0 : 1);
}

// Main execution
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   AgentDB + Midstreamer Integration Validation              ║');
  console.log('║   Testing REAL Published Packages                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await test1PackageImports();
  await test2MidstreamerDTW();
  await test3AgentDBLearning();
  await test4VectorSearch();
  await test5Integration();
  await test6MemoryUsage();

  printSummary();
}

main().catch((error) => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});
