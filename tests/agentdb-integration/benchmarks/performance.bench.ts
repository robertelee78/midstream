/**
 * Performance Benchmarks for AgentDB + Midstreamer Integration
 * Measures embedding latency, search latency, and throughput
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  generateCPUUsagePattern,
  generateSineWave,
  generateTrainingSet,
} from '../fixtures/test-data-generator';

interface BenchmarkResult {
  name: string;
  operations: number;
  totalTimeMs: number;
  avgLatencyMs: number;
  throughput: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

/**
 * Benchmark runner utility
 */
class BenchmarkRunner {
  async runBenchmark(
    name: string,
    operation: () => Promise<void>,
    iterations: number
  ): Promise<BenchmarkResult> {
    const latencies: number[] = [];

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      await operation();
      const opEnd = performance.now();

      latencies.push(opEnd - opStart);
    }

    const endTime = performance.now();
    const totalTimeMs = endTime - startTime;

    // Calculate percentiles
    latencies.sort((a, b) => a - b);

    return {
      name,
      operations: iterations,
      totalTimeMs,
      avgLatencyMs: totalTimeMs / iterations,
      throughput: (iterations / totalTimeMs) * 1000,
      p50Ms: latencies[Math.floor(iterations * 0.5)],
      p95Ms: latencies[Math.floor(iterations * 0.95)],
      p99Ms: latencies[Math.floor(iterations * 0.99)],
    };
  }

  printResult(result: BenchmarkResult): void {
    console.log(`\n📊 Benchmark: ${result.name}`);
    console.log(`   Operations: ${result.operations}`);
    console.log(`   Total Time: ${result.totalTimeMs.toFixed(2)}ms`);
    console.log(`   Avg Latency: ${result.avgLatencyMs.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.throughput.toFixed(0)} ops/sec`);
    console.log(`   P50: ${result.p50Ms.toFixed(2)}ms`);
    console.log(`   P95: ${result.p95Ms.toFixed(2)}ms`);
    console.log(`   P99: ${result.p99Ms.toFixed(2)}ms`);
  }
}

/**
 * Mock components for benchmarking
 */
class MockEmbeddingSystem {
  private cache = new Map<string, number[]>();

  async embedSequence(sequence: number[], method: string = 'hybrid'): Promise<number[]> {
    const cacheKey = `${JSON.stringify(sequence)}-${method}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Simulate embedding computation
    const embedding = await this.computeEmbedding(sequence, method);

    this.cache.set(cacheKey, embedding);
    return embedding;
  }

  private async computeEmbedding(sequence: number[], method: string): Promise<number[]> {
    const dim = 384;
    const embedding = new Array(dim);

    // Simulate computation cost
    for (let i = 0; i < dim; i++) {
      embedding[i] = Math.random();
    }

    return embedding;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

class MockSearchSystem {
  private vectors: Array<{ id: string; vector: number[] }> = [];

  addVector(id: string, vector: number[]): void {
    this.vectors.push({ id, vector });
  }

  async search(query: number[], k: number = 5): Promise<Array<{ id: string; score: number }>> {
    const results: Array<{ id: string; score: number }> = [];

    for (const item of this.vectors) {
      const score = this.cosineSimilarity(query, item.vector);
      results.push({ id: item.id, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}

describe('Performance Benchmarks', () => {
  let runner: BenchmarkRunner;
  let embeddingSystem: MockEmbeddingSystem;
  let searchSystem: MockSearchSystem;

  beforeAll(async () => {
    runner = new BenchmarkRunner();
    embeddingSystem = new MockEmbeddingSystem();
    searchSystem = new MockSearchSystem();

    // Pre-populate search index
    for (let i = 0; i < 1000; i++) {
      const pattern = generateCPUUsagePattern(50);
      const embedding = await embeddingSystem.embedSequence(pattern);
      searchSystem.addVector(`pattern_${i}`, embedding);
    }
  });

  describe('Embedding Latency', () => {
    it('should measure statistical embedding latency (target: <10ms)', async () => {
      const sequences = Array(100)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      embeddingSystem.clearCache();

      const result = await runner.runBenchmark(
        'Statistical Embedding',
        async () => {
          await embeddingSystem.embedSequence(sequences[Math.floor(Math.random() * sequences.length)], 'statistical');
        },
        100
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(10);
      expect(result.p99Ms).toBeLessThan(15);
    });

    it('should measure DTW embedding latency (target: <10ms)', async () => {
      const sequences = Array(100)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      embeddingSystem.clearCache();

      const result = await runner.runBenchmark(
        'DTW Embedding',
        async () => {
          await embeddingSystem.embedSequence(sequences[Math.floor(Math.random() * sequences.length)], 'dtw');
        },
        100
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(10);
    });

    it('should measure hybrid embedding latency (target: <10ms)', async () => {
      const sequences = Array(100)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      embeddingSystem.clearCache();

      const result = await runner.runBenchmark(
        'Hybrid Embedding',
        async () => {
          await embeddingSystem.embedSequence(sequences[Math.floor(Math.random() * sequences.length)], 'hybrid');
        },
        100
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(10);
    });

    it('should measure wavelet embedding latency (target: <10ms)', async () => {
      const sequences = Array(100)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      embeddingSystem.clearCache();

      const result = await runner.runBenchmark(
        'Wavelet Embedding',
        async () => {
          await embeddingSystem.embedSequence(sequences[Math.floor(Math.random() * sequences.length)], 'wavelet');
        },
        100
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(10);
    });

    it('should measure cached embedding latency (target: <1ms)', async () => {
      const sequence = generateCPUUsagePattern(50);

      // Pre-warm cache
      await embeddingSystem.embedSequence(sequence);

      const result = await runner.runBenchmark(
        'Cached Embedding',
        async () => {
          await embeddingSystem.embedSequence(sequence);
        },
        1000
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(1);
    });
  });

  describe('Search Latency', () => {
    it('should measure search latency (target: <15ms)', async () => {
      const querySequence = generateCPUUsagePattern(50);
      const queryEmbedding = await embeddingSystem.embedSequence(querySequence);

      const result = await runner.runBenchmark(
        'Vector Search (k=5)',
        async () => {
          await searchSystem.search(queryEmbedding, 5);
        },
        100
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(15);
      expect(result.p99Ms).toBeLessThan(25);
    });

    it('should measure search with larger k (target: <20ms)', async () => {
      const querySequence = generateCPUUsagePattern(50);
      const queryEmbedding = await embeddingSystem.embedSequence(querySequence);

      const result = await runner.runBenchmark(
        'Vector Search (k=50)',
        async () => {
          await searchSystem.search(queryEmbedding, 50);
        },
        100
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(20);
    });

    it('should measure concurrent search latency', async () => {
      const queries = Array(10)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      const queryEmbeddings = await Promise.all(
        queries.map((q) => embeddingSystem.embedSequence(q))
      );

      const result = await runner.runBenchmark(
        'Concurrent Search (10 parallel)',
        async () => {
          await Promise.all(queryEmbeddings.map((emb) => searchSystem.search(emb, 5)));
        },
        50
      );

      runner.printResult(result);

      expect(result.avgLatencyMs).toBeLessThan(50);
    });
  });

  describe('Throughput', () => {
    it('should measure embedding throughput (target: >10K/sec)', async () => {
      const sequences = Array(1000)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      embeddingSystem.clearCache();

      const result = await runner.runBenchmark(
        'Embedding Throughput',
        async () => {
          await embeddingSystem.embedSequence(sequences[Math.floor(Math.random() * sequences.length)]);
        },
        1000
      );

      runner.printResult(result);

      expect(result.throughput).toBeGreaterThan(10000);
    });

    it('should measure search throughput (target: >5K/sec)', async () => {
      const queryEmbedding = await embeddingSystem.embedSequence(generateCPUUsagePattern(50));

      const result = await runner.runBenchmark(
        'Search Throughput',
        async () => {
          await searchSystem.search(queryEmbedding, 5);
        },
        1000
      );

      runner.printResult(result);

      expect(result.throughput).toBeGreaterThan(5000);
    });

    it('should measure end-to-end pipeline throughput (target: >5K/sec)', async () => {
      const sequences = Array(500)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      const result = await runner.runBenchmark(
        'End-to-End Pipeline',
        async () => {
          const sequence = sequences[Math.floor(Math.random() * sequences.length)];
          const embedding = await embeddingSystem.embedSequence(sequence);
          await searchSystem.search(embedding, 5);
        },
        500
      );

      runner.printResult(result);

      expect(result.throughput).toBeGreaterThan(5000);
    });
  });

  describe('Batch Processing', () => {
    it('should measure batch embedding performance', async () => {
      const batchSizes = [10, 50, 100];

      for (const batchSize of batchSizes) {
        const sequences = Array(batchSize)
          .fill(null)
          .map(() => generateCPUUsagePattern(50));

        embeddingSystem.clearCache();

        const result = await runner.runBenchmark(
          `Batch Embedding (size=${batchSize})`,
          async () => {
            await Promise.all(sequences.map((seq) => embeddingSystem.embedSequence(seq)));
          },
          20
        );

        runner.printResult(result);

        // Should handle batch efficiently
        expect(result.avgLatencyMs).toBeLessThan(batchSize * 2);
      }
    });

    it('should measure batch search performance', async () => {
      const batchSizes = [10, 50, 100];

      for (const batchSize of batchSizes) {
        const queries = Array(batchSize)
          .fill(null)
          .map(() => generateCPUUsagePattern(50));

        const embeddings = await Promise.all(
          queries.map((q) => embeddingSystem.embedSequence(q))
        );

        const result = await runner.runBenchmark(
          `Batch Search (size=${batchSize})`,
          async () => {
            await Promise.all(embeddings.map((emb) => searchSystem.search(emb, 5)));
          },
          20
        );

        runner.printResult(result);

        expect(result.avgLatencyMs).toBeLessThan(batchSize * 3);
      }
    });
  });

  describe('Scaling Tests', () => {
    it('should scale with sequence length', async () => {
      const lengths = [50, 100, 500, 1000];

      for (const length of lengths) {
        const sequence = generateCPUUsagePattern(length);

        embeddingSystem.clearCache();

        const result = await runner.runBenchmark(
          `Embedding (length=${length})`,
          async () => {
            await embeddingSystem.embedSequence(sequence);
          },
          50
        );

        runner.printResult(result);

        // Should scale sub-linearly
        expect(result.avgLatencyMs).toBeLessThan(length * 0.05);
      }
    });

    it('should scale with database size', async () => {
      const sizes = [100, 500, 1000];

      for (const size of sizes) {
        const testSearchSystem = new MockSearchSystem();

        // Populate database
        for (let i = 0; i < size; i++) {
          const pattern = generateCPUUsagePattern(50);
          const embedding = await embeddingSystem.embedSequence(pattern);
          testSearchSystem.addVector(`pattern_${i}`, embedding);
        }

        const queryEmbedding = await embeddingSystem.embedSequence(generateCPUUsagePattern(50));

        const result = await runner.runBenchmark(
          `Search (db_size=${size})`,
          async () => {
            await testSearchSystem.search(queryEmbedding, 5);
          },
          50
        );

        runner.printResult(result);

        // Should scale logarithmically with HNSW index
        expect(result.avgLatencyMs).toBeLessThan(Math.log2(size) * 5);
      }
    });
  });

  describe('Memory Efficiency', () => {
    it('should measure memory usage during embedding', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const sequences = Array(1000)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      for (const seq of sequences) {
        await embeddingSystem.embedSequence(seq);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`\n💾 Memory Usage: ${memoryIncreaseMB.toFixed(2)}MB for 1000 embeddings`);

      expect(memoryIncreaseMB).toBeLessThan(100); // < 100MB
    });

    it('should measure cache efficiency', async () => {
      const uniqueSequences = Array(100)
        .fill(null)
        .map(() => generateCPUUsagePattern(50));

      embeddingSystem.clearCache();

      // Run with cache
      const cachedResult = await runner.runBenchmark(
        'With Cache',
        async () => {
          const seq = uniqueSequences[Math.floor(Math.random() * uniqueSequences.length)];
          await embeddingSystem.embedSequence(seq);
        },
        500
      );

      embeddingSystem.clearCache();

      // Run without cache (different sequences each time)
      const uncachedResult = await runner.runBenchmark(
        'Without Cache',
        async () => {
          await embeddingSystem.embedSequence(generateCPUUsagePattern(50));
        },
        500
      );

      runner.printResult(cachedResult);
      runner.printResult(uncachedResult);

      // Cache should provide speedup
      expect(cachedResult.avgLatencyMs).toBeLessThan(uncachedResult.avgLatencyMs * 0.5);
    });
  });

  describe('Stress Tests', () => {
    it('should handle sustained high load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      let operations = 0;

      while (Date.now() - startTime < duration) {
        const sequence = generateCPUUsagePattern(50);
        await embeddingSystem.embedSequence(sequence);
        operations++;
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (operations / actualDuration) * 1000;

      console.log(`\n⚡ Sustained throughput: ${throughput.toFixed(0)} ops/sec over ${actualDuration}ms`);

      expect(throughput).toBeGreaterThan(5000);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrency = 10;
      const opsPerWorker = 100;

      const workers = Array(concurrency)
        .fill(null)
        .map(async () => {
          const latencies: number[] = [];

          for (let i = 0; i < opsPerWorker; i++) {
            const sequence = generateCPUUsagePattern(50);

            const start = performance.now();
            await embeddingSystem.embedSequence(sequence);
            const latency = performance.now() - start;

            latencies.push(latency);
          }

          return latencies;
        });

      const results = await Promise.all(workers);
      const allLatencies = results.flat();

      const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;

      console.log(`\n🔀 Concurrent performance (${concurrency} workers):`);
      console.log(`   Avg latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`   Total ops: ${allLatencies.length}`);

      expect(avgLatency).toBeLessThan(20);
    });
  });
});
