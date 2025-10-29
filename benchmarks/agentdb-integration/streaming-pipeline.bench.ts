/**
 * End-to-End Streaming Pipeline Benchmarks
 * Simulates real streaming data with AgentDB integration
 * Targets: <100ms end-to-end latency, 10K events/sec throughput
 */

import { BenchmarkRunner, validateTarget } from './utils/benchmark-runner';
import { performance } from 'perf_hooks';

// Event types
interface StreamEvent {
  id: string;
  timestamp: number;
  type: 'normal' | 'anomaly';
  data: Float32Array;
}

interface ProcessedEvent {
  id: string;
  timestamp: number;
  processingTime: number;
  detectedAnomaly: boolean;
  embeddingTime: number;
  storageTime: number;
  searchTime: number;
}

// Simulated streaming pipeline components
class StreamingPipeline {
  private embedding Bridge: any;
  private agentDB: any;
  private processedCount: number = 0;
  private anomalyCount: number = 0;

  constructor() {
    this.embeddingBridge = new EmbeddingBridge();
    this.agentDB = new AgentDBMock();
  }

  /**
   * Process a single streaming event end-to-end
   */
  async processEvent(event: StreamEvent): Promise<ProcessedEvent> {
    const startTime = performance.now();

    // Step 1: Generate embedding
    const embeddingStart = performance.now();
    const embedding = await this.embeddingBridge.embedStateVector(event.data);
    const embeddingTime = performance.now() - embeddingStart;

    // Step 2: Store in AgentDB
    const storageStart = performance.now();
    await this.agentDB.storeEmbedding(event.id, embedding, {
      timestamp: event.timestamp,
      type: event.type,
    });
    const storageTime = performance.now() - storageStart;

    // Step 3: Search for similar patterns
    const searchStart = performance.now();
    const similar = await this.agentDB.searchSimilar(embedding, 10);
    const searchTime = performance.now() - searchStart;

    // Step 4: Anomaly detection
    const detectedAnomaly = this.detectAnomaly(similar, event);

    const processingTime = performance.now() - startTime;
    this.processedCount++;
    if (detectedAnomaly) this.anomalyCount++;

    return {
      id: event.id,
      timestamp: event.timestamp,
      processingTime,
      detectedAnomaly,
      embeddingTime,
      storageTime,
      searchTime,
    };
  }

  /**
   * Process batch of events
   */
  async processBatch(events: StreamEvent[]): Promise<ProcessedEvent[]> {
    const results: ProcessedEvent[] = [];

    for (const event of events) {
      const result = await this.processEvent(event);
      results.push(result);
    }

    return results;
  }

  /**
   * Process batch in parallel
   */
  async processBatchParallel(events: StreamEvent[]): Promise<ProcessedEvent[]> {
    const promises = events.map(event => this.processEvent(event));
    return Promise.all(promises);
  }

  private detectAnomaly(similar: any[], event: StreamEvent): boolean {
    // Simple anomaly detection: if no similar patterns found, it's anomalous
    return similar.length === 0 || event.type === 'anomaly';
  }

  getStats() {
    return {
      processedCount: this.processedCount,
      anomalyCount: this.anomalyCount,
      anomalyRate: this.anomalyCount / this.processedCount,
    };
  }
}

// Mock embedding bridge
class EmbeddingBridge {
  async embedStateVector(data: Float32Array): Promise<Float32Array> {
    // Simulate embedding generation
    const embedding = new Float32Array(512);
    const norm = Math.sqrt(data.reduce((sum, val) => sum + val * val, 0));

    for (let i = 0; i < Math.min(data.length, 512); i++) {
      embedding[i] = data[i] / norm;
    }

    return embedding;
  }
}

// Mock AgentDB
class AgentDBMock {
  private storage: Map<string, { embedding: Float32Array; metadata: any }> = new Map();

  async storeEmbedding(id: string, embedding: Float32Array, metadata: any): Promise<void> {
    // Simulate async storage (promise microtask)
    await Promise.resolve();
    this.storage.set(id, { embedding, metadata });
  }

  async searchSimilar(query: Float32Array, k: number): Promise<any[]> {
    // Simulate HNSW search
    await Promise.resolve();

    const results: Array<{ id: string; score: number }> = [];

    for (const [id, { embedding }] of this.storage) {
      const score = this.cosineSimilarity(query, embedding);
      results.push({ id, score });
    }

    // Sort by score and return top k
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  getSize(): number {
    return this.storage.size;
  }
}

// Generate realistic streaming data
function generateStreamEvent(id: number, anomalyRate: number = 0.05): StreamEvent {
  const isAnomaly = Math.random() < anomalyRate;
  const size = 128;
  const data = new Float32Array(size);

  if (isAnomaly) {
    // Anomalous data: large values
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() - 0.5) * 10;
    }
  } else {
    // Normal data: small values
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() - 0.5) * 2;
    }
  }

  return {
    id: `event_${id}`,
    timestamp: Date.now(),
    type: isAnomaly ? 'anomaly' : 'normal',
    data,
  };
}

function generateStreamBatch(count: number, anomalyRate: number = 0.05): StreamEvent[] {
  return Array.from({ length: count }, (_, i) => generateStreamEvent(i, anomalyRate));
}

async function main() {
  console.log('='.repeat(80));
  console.log('END-TO-END STREAMING PIPELINE BENCHMARKS');
  console.log('='.repeat(80));
  console.log('Targets:');
  console.log('  - End-to-end latency: <100ms');
  console.log('  - Throughput: 10,000 events/sec');
  console.log('  - Search latency: <15ms for 10K patterns\n');

  const runner = new BenchmarkRunner();
  const pipeline = new StreamingPipeline();

  // Test 1: Single Event Processing
  console.log('\n📊 Test 1: Single Event End-to-End Latency');
  console.log('-'.repeat(80));

  const singleEvent = generateStreamEvent(1);
  const singleResult = await runner.runBenchmark(
    'Single Event Processing',
    async () => {
      await pipeline.processEvent(singleEvent);
    },
    { iterations: 1000, measureMemory: true }
  );

  runner.printResults(singleResult);
  const latencyValidation = validateTarget(singleResult, 100);
  console.log(latencyValidation.summary);

  // Test 2: Latency Distribution Analysis
  console.log('\n\n📊 Test 2: Latency Distribution Analysis');
  console.log('-'.repeat(80));

  const latencies: number[] = [];
  const sampleSize = 1000;

  console.log(`Processing ${sampleSize} events...`);
  for (let i = 0; i < sampleSize; i++) {
    const event = generateStreamEvent(i);
    const result = await pipeline.processEvent(event);
    latencies.push(result.processingTime);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(sampleSize * 0.5)];
  const p95 = latencies[Math.floor(sampleSize * 0.95)];
  const p99 = latencies[Math.floor(sampleSize * 0.99)];
  const avg = latencies.reduce((sum, l) => sum + l, 0) / sampleSize;

  console.log(`\nLatency Distribution:`);
  console.log(`  Average: ${avg.toFixed(3)}ms`);
  console.log(`  P50: ${p50.toFixed(3)}ms`);
  console.log(`  P95: ${p95.toFixed(3)}ms`);
  console.log(`  P99: ${p99.toFixed(3)}ms`);
  console.log(`  Min: ${latencies[0].toFixed(3)}ms`);
  console.log(`  Max: ${latencies[sampleSize - 1].toFixed(3)}ms`);

  // Test 3: Throughput Measurement
  console.log('\n\n📊 Test 3: Throughput Measurement');
  console.log('-'.repeat(80));

  const throughputTests = [100, 500, 1000, 5000, 10000];

  for (const eventCount of throughputTests) {
    const events = generateStreamBatch(eventCount);
    const throughputPipeline = new StreamingPipeline();

    const start = performance.now();
    await throughputPipeline.processBatch(events);
    const duration = performance.now() - start;

    const throughput = (eventCount / duration) * 1000; // events per second
    const avgLatency = duration / eventCount;

    console.log(`\n${eventCount} events:`);
    console.log(`  Total time: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} events/sec`);
    console.log(`  Avg latency: ${avgLatency.toFixed(3)}ms`);

    const targetThroughput = 10000;
    if (throughput >= targetThroughput) {
      console.log(`  ✅ PASSED: ${throughput.toFixed(2)} >= ${targetThroughput} events/sec`);
    } else {
      console.log(`  ❌ FAILED: ${throughput.toFixed(2)} < ${targetThroughput} events/sec`);
    }
  }

  // Test 4: Parallel Processing Performance
  console.log('\n\n📊 Test 4: Parallel vs Sequential Processing');
  console.log('-'.repeat(80));

  const batchSize = 100;
  const parallelEvents = generateStreamBatch(batchSize);

  // Sequential
  const seqPipeline = new StreamingPipeline();
  const seqStart = performance.now();
  await seqPipeline.processBatch(parallelEvents);
  const seqDuration = performance.now() - seqStart;
  const seqThroughput = (batchSize / seqDuration) * 1000;

  // Parallel
  const parPipeline = new StreamingPipeline();
  const parStart = performance.now();
  await parPipeline.processBatchParallel(parallelEvents);
  const parDuration = performance.now() - parStart;
  const parThroughput = (batchSize / parDuration) * 1000;

  console.log(`\nBatch size: ${batchSize} events`);
  console.log(`\nSequential Processing:`);
  console.log(`  Time: ${seqDuration.toFixed(2)}ms`);
  console.log(`  Throughput: ${seqThroughput.toFixed(2)} events/sec`);
  console.log(`\nParallel Processing:`);
  console.log(`  Time: ${parDuration.toFixed(2)}ms`);
  console.log(`  Throughput: ${parThroughput.toFixed(2)} events/sec`);
  console.log(`\nSpeedup: ${(seqDuration / parDuration).toFixed(2)}x`);

  // Test 5: Component-wise Performance Breakdown
  console.log('\n\n📊 Test 5: Component Performance Breakdown');
  console.log('-'.repeat(80));

  const breakdownEvents = generateStreamBatch(100);
  const breakdownPipeline = new StreamingPipeline();
  const breakdownResults = await breakdownPipeline.processBatch(breakdownEvents);

  const avgEmbedding = breakdownResults.reduce((sum, r) => sum + r.embeddingTime, 0) / 100;
  const avgStorage = breakdownResults.reduce((sum, r) => sum + r.storageTime, 0) / 100;
  const avgSearch = breakdownResults.reduce((sum, r) => sum + r.searchTime, 0) / 100;
  const avgTotal = breakdownResults.reduce((sum, r) => sum + r.processingTime, 0) / 100;

  console.log(`\nAverage Component Times (100 events):`);
  console.log(`  Embedding: ${avgEmbedding.toFixed(3)}ms (${(avgEmbedding / avgTotal * 100).toFixed(1)}%)`);
  console.log(`  Storage: ${avgStorage.toFixed(3)}ms (${(avgStorage / avgTotal * 100).toFixed(1)}%)`);
  console.log(`  Search: ${avgSearch.toFixed(3)}ms (${(avgSearch / avgTotal * 100).toFixed(1)}%)`);
  console.log(`  Total: ${avgTotal.toFixed(3)}ms`);

  const embeddingValidation = validateTarget({ avgTime: avgEmbedding } as any, 10);
  const storageValidation = validateTarget({ avgTime: avgStorage } as any, 10);
  const searchValidation = validateTarget({ avgTime: avgSearch } as any, 15);

  console.log(`\n${embeddingValidation.summary}`);
  console.log(`${storageValidation.summary}`);
  console.log(`${searchValidation.summary}`);

  // Test 6: Scale Testing
  console.log('\n\n📊 Test 6: Scale Testing (Pattern Database Growth)');
  console.log('-'.repeat(80));

  const scaleTests = [1000, 5000, 10000, 50000];

  for (const dbSize of scaleTests) {
    const scalePipeline = new StreamingPipeline();

    // Pre-populate database
    console.log(`\nPopulating database with ${dbSize} patterns...`);
    const populateEvents = generateStreamBatch(dbSize);
    await scalePipeline.processBatch(populateEvents);

    // Test search performance
    const testEvent = generateStreamEvent(999999);
    const searchTimes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const result = await scalePipeline.processEvent(testEvent);
      searchTimes.push(result.searchTime);
    }

    const avgSearchTime = searchTimes.reduce((sum, t) => sum + t, 0) / 100;
    console.log(`  DB size: ${dbSize} patterns`);
    console.log(`  Avg search time: ${avgSearchTime.toFixed(3)}ms`);

    if (dbSize === 10000) {
      const validation = validateTarget({ avgTime: avgSearchTime } as any, 15);
      console.log(`  ${validation.summary}`);
    }
  }

  // Generate comprehensive report
  console.log('\n\n📄 Generating Report...');
  const report = runner.generateMarkdownReport();
  const fs = require('fs');
  const path = require('path');

  let enhancedReport = report + '\n## Detailed Performance Analysis\n\n';
  enhancedReport += '### Latency Distribution\n\n';
  enhancedReport += `- **Average**: ${avg.toFixed(3)}ms\n`;
  enhancedReport += `- **P50**: ${p50.toFixed(3)}ms\n`;
  enhancedReport += `- **P95**: ${p95.toFixed(3)}ms\n`;
  enhancedReport += `- **P99**: ${p99.toFixed(3)}ms\n\n`;

  enhancedReport += '### Component Breakdown\n\n';
  enhancedReport += `- **Embedding**: ${avgEmbedding.toFixed(3)}ms (${(avgEmbedding / avgTotal * 100).toFixed(1)}%)\n`;
  enhancedReport += `- **Storage**: ${avgStorage.toFixed(3)}ms (${(avgStorage / avgTotal * 100).toFixed(1)}%)\n`;
  enhancedReport += `- **Search**: ${avgSearch.toFixed(3)}ms (${(avgSearch / avgTotal * 100).toFixed(1)}%)\n\n`;

  const reportPath = path.join(__dirname, 'results', 'streaming-pipeline-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, enhancedReport);

  const jsonPath = path.join(__dirname, 'results', 'streaming-pipeline.json');
  const jsonData = {
    benchmarks: runner.getResults(),
    latencyDistribution: { avg, p50, p95, p99, min: latencies[0], max: latencies[sampleSize - 1] },
    componentBreakdown: { embedding: avgEmbedding, storage: avgStorage, search: avgSearch, total: avgTotal },
    parallelSpeedup: seqDuration / parDuration,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log(`✅ JSON data saved to: ${jsonPath}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`End-to-end latency: ${avg.toFixed(3)}ms ${latencyValidation.passed ? '✅' : '❌'}`);
  console.log(`P99 latency: ${p99.toFixed(3)}ms`);
  console.log(`Component targets: Embedding ${embeddingValidation.passed ? '✅' : '❌'}, Storage ${storageValidation.passed ? '✅' : '❌'}, Search ${searchValidation.passed ? '✅' : '❌'}`);
}

// Run benchmarks
if (require.main === module) {
  main().catch(console.error);
}

export { StreamingPipeline, main as runStreamingBenchmarks };
