/**
 * Benchmark Suite for AIMDS Performance Comparison
 * Compares AIMDS with alternative approaches
 */

import Benchmark from 'benchmark';
import { AgentDBClient } from '../../AIMDS/src/agentdb/client';
import { LeanAgenticVerifier } from '../../AIMDS/src/lean-agentic/verifier';
import { Logger } from '../../AIMDS/src/utils/logger';
import {
  mockAgentDBConfig,
  mockVerifierConfig,
  mockDefaultPolicy,
  generateMockEmbedding
} from '../tests/fixtures/mock-data';

// Mock dependencies
jest.mock('agentdb');
jest.mock('lean-agentic');

const logger = new Logger('benchmark');

/**
 * Benchmark: Vector Search Performance
 */
export async function benchmarkVectorSearch() {
  console.log('\n=== Vector Search Benchmark ===\n');

  const client = new AgentDBClient(mockAgentDBConfig, logger);
  await client.initialize();

  const suite = new Benchmark.Suite();

  suite
    .add('AIMDS HNSW Search (k=10)', {
      defer: true,
      fn: async (deferred: any) => {
        await client.vectorSearch(generateMockEmbedding(), { k: 10 });
        deferred.resolve();
      }
    })
    .add('AIMDS HNSW Search (k=100)', {
      defer: true,
      fn: async (deferred: any) => {
        await client.vectorSearch(generateMockEmbedding(), { k: 100 });
        deferred.resolve();
      }
    })
    .add('AIMDS with MMR Diversity', {
      defer: true,
      fn: async (deferred: any) => {
        await client.vectorSearch(generateMockEmbedding(), {
          k: 10,
          diversityFactor: 0.5
        });
        deferred.resolve();
      }
    })
    .on('cycle', (event: any) => {
      console.log(String(event.target));
      const hz = event.target.hz;
      const ms = 1000 / hz;
      console.log(`  Average: ${ms.toFixed(2)}ms per operation\n`);
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run({ async: true });

  await client.shutdown();
}

/**
 * Benchmark: Policy Verification Performance
 */
export async function benchmarkVerification() {
  console.log('\n=== Policy Verification Benchmark ===\n');

  const verifier = new LeanAgenticVerifier(mockVerifierConfig, logger);
  await verifier.initialize();

  const mockAction = {
    type: 'read',
    resource: '/api/data',
    parameters: {},
    context: { timestamp: Date.now() }
  };

  const suite = new Benchmark.Suite();

  suite
    .add('Hash-cons Fast Path', {
      defer: true,
      fn: async (deferred: any) => {
        const engine = (verifier as any).engine;
        engine.hashConsEquals = jest.fn().mockResolvedValue(true);
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        deferred.resolve();
      }
    })
    .add('Dependent Type Checking', {
      defer: true,
      fn: async (deferred: any) => {
        const engine = (verifier as any).engine;
        engine.hashConsEquals = jest.fn().mockResolvedValue(false);
        engine.typeCheck = jest.fn().mockResolvedValue({ valid: true });
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        deferred.resolve();
      }
    })
    .add('Full Theorem Proving', {
      defer: true,
      fn: async (deferred: any) => {
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        deferred.resolve();
      }
    })
    .on('cycle', (event: any) => {
      console.log(String(event.target));
      const hz = event.target.hz;
      const ms = 1000 / hz;
      console.log(`  Average: ${ms.toFixed(2)}ms per operation\n`);
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run({ async: true });

  await verifier.shutdown();
}

/**
 * Benchmark: Complete Pipeline Performance
 */
export async function benchmarkPipeline() {
  console.log('\n=== Complete Pipeline Benchmark ===\n');

  const client = new AgentDBClient(mockAgentDBConfig, logger);
  const verifier = new LeanAgenticVerifier(mockVerifierConfig, logger);

  await Promise.all([client.initialize(), verifier.initialize()]);

  const mockAction = {
    type: 'read',
    resource: '/api/data',
    parameters: {},
    context: { timestamp: Date.now() }
  };

  const suite = new Benchmark.Suite();

  suite
    .add('Fast Path (Vector Search Only)', {
      defer: true,
      fn: async (deferred: any) => {
        const embedding = generateMockEmbedding();
        await client.vectorSearch(embedding, { k: 10 });
        deferred.resolve();
      }
    })
    .add('Deep Path (Vector + Verification)', {
      defer: true,
      fn: async (deferred: any) => {
        const embedding = generateMockEmbedding();
        await client.vectorSearch(embedding, { k: 10 });
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        deferred.resolve();
      }
    })
    .add('Deep Path + Storage', {
      defer: true,
      fn: async (deferred: any) => {
        const embedding = generateMockEmbedding();
        await client.vectorSearch(embedding, { k: 10 });
        await verifier.verifyPolicy(mockAction, mockDefaultPolicy);
        await client.storeIncident({
          id: `bench_${Date.now()}`,
          timestamp: Date.now(),
          request: {} as any,
          result: {} as any,
          embedding
        });
        deferred.resolve();
      }
    })
    .on('cycle', (event: any) => {
      console.log(String(event.target));
      const hz = event.target.hz;
      const ms = 1000 / hz;
      console.log(`  Average: ${ms.toFixed(2)}ms per operation\n`);
    })
    .on('complete', function (this: any) {
      console.log('Fastest is ' + this.filter('fastest').map('name'));
    })
    .run({ async: true });

  await Promise.all([client.shutdown(), verifier.shutdown()]);
}

/**
 * Memory Profiling
 */
export async function profileMemory() {
  console.log('\n=== Memory Profiling ===\n');

  const client = new AgentDBClient(mockAgentDBConfig, logger);
  await client.initialize();

  const iterations = 10000;
  const checkpoints = [1000, 5000, 10000];

  console.log('Starting memory profile...');
  const initialMemory = process.memoryUsage();
  console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB\n`);

  for (let i = 1; i <= iterations; i++) {
    const embedding = generateMockEmbedding(i);
    await client.vectorSearch(embedding, { k: 10 });

    if (checkpoints.includes(i)) {
      const currentMemory = process.memoryUsage();
      const heapGrowth = (currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`After ${i} operations:`);
      console.log(`  Heap: ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)}MB (+ ${heapGrowth.toFixed(2)}MB)`);
      console.log(`  External: ${(currentMemory.external / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  RSS: ${(currentMemory.rss / 1024 / 1024).toFixed(2)}MB\n`);
    }
  }

  await client.shutdown();
}

/**
 * Latency Distribution Analysis
 */
export async function analyzeLatencyDistribution() {
  console.log('\n=== Latency Distribution Analysis ===\n');

  const client = new AgentDBClient(mockAgentDBConfig, logger);
  await client.initialize();

  const iterations = 1000;
  const latencies: number[] = [];

  console.log(`Running ${iterations} vector searches...`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await client.vectorSearch(generateMockEmbedding(i), { k: 10 });
    const latency = performance.now() - start;
    latencies.push(latency);
  }

  latencies.sort((a, b) => a - b);

  const percentiles = [50, 75, 90, 95, 99, 99.9];
  const stats = {
    min: latencies[0],
    max: latencies[latencies.length - 1],
    mean: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
    percentiles: {} as Record<string, number>
  };

  percentiles.forEach(p => {
    const index = Math.floor((latencies.length * p) / 100);
    stats.percentiles[`p${p}`] = latencies[index];
  });

  console.log('Latency Statistics:');
  console.log(`  Min: ${stats.min.toFixed(2)}ms`);
  console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
  console.log(`  Max: ${stats.max.toFixed(2)}ms`);
  console.log('  Percentiles:');
  Object.entries(stats.percentiles).forEach(([key, value]) => {
    console.log(`    ${key}: ${value.toFixed(2)}ms`);
  });

  await client.shutdown();
}

/**
 * Run all benchmarks
 */
export async function runAllBenchmarks() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     AIMDS Performance Benchmark Suite          ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    await benchmarkVectorSearch();
    await benchmarkVerification();
    await benchmarkPipeline();
    await profileMemory();
    await analyzeLatencyDistribution();

    console.log('\n✅ All benchmarks completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run benchmarks if executed directly
if (require.main === module) {
  runAllBenchmarks().catch(console.error);
}
