/**
 * Memory Profiling Benchmarks
 * Tests embedding storage growth, quantization impact, and HNSW index memory
 * Target: <2GB memory with quantization
 */

import { BenchmarkRunner } from './utils/benchmark-runner';
import { performance } from 'perf_hooks';

// Quantization utilities
class Quantizer {
  /**
   * Quantize float32 to 8-bit
   */
  quantize8bit(values: Float32Array): { quantized: Uint8Array; scale: number; offset: number } {
    let min = Infinity;
    let max = -Infinity;

    for (const val of values) {
      if (val < min) min = val;
      if (val > max) max = val;
    }

    const scale = (max - min) / 255;
    const offset = min;
    const quantized = new Uint8Array(values.length);

    for (let i = 0; i < values.length; i++) {
      quantized[i] = Math.round((values[i] - offset) / scale);
    }

    return { quantized, scale, offset };
  }

  /**
   * Dequantize 8-bit to float32
   */
  dequantize8bit(quantized: Uint8Array, scale: number, offset: number): Float32Array {
    const values = new Float32Array(quantized.length);
    for (let i = 0; i < quantized.length; i++) {
      values[i] = quantized[i] * scale + offset;
    }
    return values;
  }

  /**
   * Quantize float32 to 4-bit (packed in Uint8Array)
   */
  quantize4bit(values: Float32Array): { quantized: Uint8Array; scale: number; offset: number } {
    let min = Infinity;
    let max = -Infinity;

    for (const val of values) {
      if (val < min) min = val;
      if (val > max) max = val;
    }

    const scale = (max - min) / 15; // 4 bits = 0-15
    const offset = min;
    const quantized = new Uint8Array(Math.ceil(values.length / 2));

    for (let i = 0; i < values.length; i += 2) {
      const val1 = Math.round((values[i] - offset) / scale);
      const val2 = i + 1 < values.length ? Math.round((values[i + 1] - offset) / scale) : 0;
      quantized[i / 2] = (val1 << 4) | val2;
    }

    return { quantized, scale, offset };
  }

  /**
   * Calculate quantization error
   */
  calculateError(original: Float32Array, reconstructed: Float32Array): number {
    let sumSquaredError = 0;
    for (let i = 0; i < original.length; i++) {
      const error = original[i] - reconstructed[i];
      sumSquaredError += error * error;
    }
    return Math.sqrt(sumSquaredError / original.length); // RMSE
  }
}

// Mock vector database with memory tracking
class VectorDatabase {
  private vectors: Float32Array[] = [];
  private metadata: any[] = [];
  private quantized8bit: Array<{ data: Uint8Array; scale: number; offset: number }> = [];
  private quantized4bit: Array<{ data: Uint8Array; scale: number; offset: number }> = [];

  addVector(vector: Float32Array, meta: any = {}): void {
    this.vectors.push(vector);
    this.metadata.push(meta);
  }

  addQuantized8bit(quantized: Uint8Array, scale: number, offset: number): void {
    this.quantized8bit.push({ data: quantized, scale, offset });
  }

  addQuantized4bit(quantized: Uint8Array, scale: number, offset: number): void {
    this.quantized4bit.push({ data: quantized, scale, offset });
  }

  getMemoryUsage(): {
    fullPrecision: number;
    quantized8bit: number;
    quantized4bit: number;
    metadata: number;
    total: number;
  } {
    const fullPrecision = this.vectors.reduce((sum, v) => sum + v.length * 4, 0); // 4 bytes per float32
    const quantized8bit = this.quantized8bit.reduce((sum, q) => sum + q.data.length + 8, 0); // +8 for scale/offset
    const quantized4bit = this.quantized4bit.reduce((sum, q) => sum + q.data.length + 8, 0);

    // Estimate metadata size (rough approximation)
    const metadataStr = JSON.stringify(this.metadata);
    const metadata = metadataStr.length;

    return {
      fullPrecision,
      quantized8bit,
      quantized4bit,
      metadata,
      total: fullPrecision + quantized8bit + quantized4bit + metadata,
    };
  }

  getVectorCount(): number {
    return this.vectors.length;
  }

  clear(): void {
    this.vectors = [];
    this.metadata = [];
    this.quantized8bit = [];
    this.quantized4bit = [];
  }
}

// HNSW index simulation (simplified)
class HNSWIndex {
  private layers: Map<number, Set<number>>[] = [];
  private vectors: Float32Array[] = [];
  private maxLayers: number = 5;
  private M: number = 16; // Max connections per node

  addVector(vector: Float32Array): void {
    const id = this.vectors.length;
    this.vectors.push(vector);

    // Add to random layers (simplified)
    const numLayers = Math.floor(Math.random() * this.maxLayers) + 1;

    for (let layer = 0; layer < numLayers; layer++) {
      if (!this.layers[layer]) {
        this.layers[layer] = new Map();
      }

      if (!this.layers[layer].has(id)) {
        this.layers[layer].set(id, new Set());
      }

      // Connect to M random neighbors (simplified)
      const connections = Math.min(this.M, id);
      for (let i = 0; i < connections; i++) {
        const neighbor = Math.floor(Math.random() * id);
        this.layers[layer].get(id)!.add(neighbor);
      }
    }
  }

  getMemoryUsage(): {
    vectors: number;
    graphStructure: number;
    total: number;
  } {
    const vectors = this.vectors.reduce((sum, v) => sum + v.length * 4, 0);

    // Calculate graph structure memory
    let graphStructure = 0;
    for (const layer of this.layers) {
      for (const [id, connections] of layer) {
        graphStructure += 4 + connections.size * 4; // node ID + connection IDs
      }
    }

    return {
      vectors,
      graphStructure,
      total: vectors + graphStructure,
    };
  }

  getNodeCount(): number {
    return this.vectors.length;
  }

  getEdgeCount(): number {
    let edges = 0;
    for (const layer of this.layers) {
      for (const connections of layer.values()) {
        edges += connections.size;
      }
    }
    return edges;
  }

  clear(): void {
    this.layers = [];
    this.vectors = [];
  }
}

// Generate test vectors
function generateVector(dim: number): Float32Array {
  const vector = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    vector[i] = Math.random() * 2 - 1;
  }
  return vector;
}

async function main() {
  console.log('='.repeat(80));
  console.log('MEMORY PROFILING BENCHMARKS');
  console.log('='.repeat(80));
  console.log('Target: <2GB memory with quantization\n');

  const runner = new BenchmarkRunner();
  const quantizer = new Quantizer();

  // Test 1: Quantization Performance and Accuracy
  console.log('\n📊 Test 1: Quantization Performance and Accuracy');
  console.log('-'.repeat(80));

  const testVector = generateVector(512);

  // 8-bit quantization
  const quant8Result = await runner.runBenchmark(
    '8-bit Quantization',
    () => {
      quantizer.quantize8bit(testVector);
    },
    { iterations: 10000, measureMemory: true }
  );

  runner.printResults(quant8Result);

  // 4-bit quantization
  const quant4Result = await runner.runBenchmark(
    '4-bit Quantization',
    () => {
      quantizer.quantize4bit(testVector);
    },
    { iterations: 10000, measureMemory: true }
  );

  runner.printResults(quant4Result);

  // Measure accuracy
  const { quantized: q8, scale: s8, offset: o8 } = quantizer.quantize8bit(testVector);
  const reconstructed8 = quantizer.dequantize8bit(q8, s8, o8);
  const error8 = quantizer.calculateError(testVector, reconstructed8);

  const { quantized: q4, scale: s4, offset: o4 } = quantizer.quantize4bit(testVector);
  const reconstructed4 = new Float32Array(testVector.length);
  for (let i = 0; i < testVector.length; i += 2) {
    const packed = q4[i / 2];
    const val1 = (packed >> 4) * s4 + o4;
    const val2 = (packed & 0xF) * s4 + o4;
    reconstructed4[i] = val1;
    if (i + 1 < testVector.length) reconstructed4[i + 1] = val2;
  }
  const error4 = quantizer.calculateError(testVector, reconstructed4);

  console.log(`\nQuantization Accuracy:`);
  console.log(`  8-bit RMSE: ${error8.toFixed(6)}`);
  console.log(`  4-bit RMSE: ${error4.toFixed(6)}`);

  // Test 2: Storage Growth Analysis
  console.log('\n\n📊 Test 2: Storage Growth Analysis');
  console.log('-'.repeat(80));

  const db = new VectorDatabase();
  const vectorCounts = [1000, 5000, 10000, 50000, 100000];
  const vectorDim = 512;

  console.log('Adding vectors and measuring memory...\n');

  for (const count of vectorCounts) {
    db.clear();
    if (global.gc) global.gc();

    const startMem = process.memoryUsage();

    // Add vectors in all three formats
    for (let i = 0; i < count; i++) {
      const vector = generateVector(vectorDim);
      db.addVector(vector, { id: i, timestamp: Date.now() });

      const { quantized: q8, scale: s8, offset: o8 } = quantizer.quantize8bit(vector);
      db.addQuantized8bit(q8, s8, o8);

      const { quantized: q4, scale: s4, offset: o4 } = quantizer.quantize4bit(vector);
      db.addQuantized4bit(q4, s4, o4);
    }

    const endMem = process.memoryUsage();
    const dbMem = db.getMemoryUsage();

    console.log(`${count} vectors (${vectorDim}-dim):`);
    console.log(`  Full precision: ${(dbMem.fullPrecision / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  8-bit quantized: ${(dbMem.quantized8bit / 1024 / 1024).toFixed(2)}MB (${(dbMem.quantized8bit / dbMem.fullPrecision * 100).toFixed(1)}% of original)`);
    console.log(`  4-bit quantized: ${(dbMem.quantized4bit / 1024 / 1024).toFixed(2)}MB (${(dbMem.quantized4bit / dbMem.fullPrecision * 100).toFixed(1)}% of original)`);
    console.log(`  Metadata: ${(dbMem.metadata / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Process RSS: ${((endMem.rss - startMem.rss) / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Process Heap: ${((endMem.heapUsed - startMem.heapUsed) / 1024 / 1024).toFixed(2)}MB\n`);
  }

  // Test 3: HNSW Index Memory Overhead
  console.log('\n📊 Test 3: HNSW Index Memory Overhead');
  console.log('-'.repeat(80));

  const hnswIndex = new HNSWIndex();
  const indexCounts = [1000, 5000, 10000, 50000];

  console.log('Building HNSW index and measuring memory...\n');

  for (const count of indexCounts) {
    hnswIndex.clear();
    if (global.gc) global.gc();

    const startMem = process.memoryUsage();
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      const vector = generateVector(vectorDim);
      hnswIndex.addVector(vector);
    }

    const buildTime = performance.now() - startTime;
    const endMem = process.memoryUsage();
    const indexMem = hnswIndex.getMemoryUsage();

    console.log(`${count} nodes:`);
    console.log(`  Build time: ${buildTime.toFixed(2)}ms (${(buildTime / count).toFixed(3)}ms per node)`);
    console.log(`  Vectors: ${(indexMem.vectors / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Graph structure: ${(indexMem.graphStructure / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Total: ${(indexMem.total / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Edges: ${hnswIndex.getEdgeCount()}`);
    console.log(`  Avg degree: ${(hnswIndex.getEdgeCount() / count).toFixed(2)}`);
    console.log(`  Process RSS: ${((endMem.rss - startMem.rss) / 1024 / 1024).toFixed(2)}MB\n`);
  }

  // Test 4: Combined System Memory Projection
  console.log('\n📊 Test 4: Combined System Memory Projection');
  console.log('-'.repeat(80));

  const projections = [
    { name: '10K patterns', count: 10000 },
    { name: '100K patterns', count: 100000 },
    { name: '1M patterns', count: 1000000 },
    { name: '10M patterns', count: 10000000 },
  ];

  console.log('Memory projections for full system:\n');

  for (const projection of projections) {
    const { count, name } = projection;

    // Calculate memory for each component
    const vectorSize = vectorDim * 4; // bytes
    const fullPrecisionMem = count * vectorSize;
    const quant8Mem = count * (vectorDim + 8); // 1 byte per dim + scale/offset
    const quant4Mem = count * (vectorDim / 2 + 8); // 0.5 bytes per dim + scale/offset
    const metadataMem = count * 100; // Estimate 100 bytes per entry
    const hnswGraphMem = count * 16 * 4; // Estimate 16 connections * 4 bytes

    const fullSystem = fullPrecisionMem + metadataMem + hnswGraphMem;
    const quant8System = quant8Mem + metadataMem + hnswGraphMem;
    const quant4System = quant4Mem + metadataMem + hnswGraphMem;

    console.log(`${name}:`);
    console.log(`  Full precision: ${(fullSystem / 1024 / 1024 / 1024).toFixed(2)}GB`);
    console.log(`  8-bit quantized: ${(quant8System / 1024 / 1024 / 1024).toFixed(2)}GB (${(quant8System / fullSystem * 100).toFixed(1)}% of full)`);
    console.log(`  4-bit quantized: ${(quant4System / 1024 / 1024 / 1024).toFixed(2)}GB (${(quant4System / fullSystem * 100).toFixed(1)}% of full)`);

    if (quant4System / 1024 / 1024 / 1024 < 2) {
      console.log(`  ✅ Under 2GB target with 4-bit quantization`);
    } else if (quant8System / 1024 / 1024 / 1024 < 2) {
      console.log(`  ✅ Under 2GB target with 8-bit quantization`);
    } else {
      console.log(`  ❌ Exceeds 2GB target even with quantization`);
    }
    console.log();
  }

  // Test 5: Memory Access Performance
  console.log('\n📊 Test 5: Memory Access Performance (Quantized vs Full)');
  console.log('-'.repeat(80));

  const accessTestSize = 10000;
  const accessDb = new VectorDatabase();
  const accessVectors: Float32Array[] = [];
  const accessQuant8: Array<{ data: Uint8Array; scale: number; offset: number }> = [];

  // Populate
  for (let i = 0; i < accessTestSize; i++) {
    const vector = generateVector(vectorDim);
    accessVectors.push(vector);

    const { quantized, scale, offset } = quantizer.quantize8bit(vector);
    accessQuant8.push({ data: quantized, scale, offset });
  }

  // Test random access - full precision
  const fullAccessResult = await runner.runBenchmark(
    'Full Precision Random Access',
    () => {
      const idx = Math.floor(Math.random() * accessTestSize);
      const vector = accessVectors[idx];
      let sum = 0;
      for (let i = 0; i < vector.length; i++) {
        sum += vector[i];
      }
      return sum;
    },
    { iterations: 10000, measureMemory: true }
  );

  runner.printResults(fullAccessResult);

  // Test random access - quantized (with dequantization)
  const quantAccessResult = await runner.runBenchmark(
    'Quantized Random Access (with dequant)',
    () => {
      const idx = Math.floor(Math.random() * accessTestSize);
      const { data, scale, offset } = accessQuant8[idx];
      const vector = quantizer.dequantize8bit(data, scale, offset);
      let sum = 0;
      for (let i = 0; i < vector.length; i++) {
        sum += vector[i];
      }
      return sum;
    },
    { iterations: 10000, measureMemory: true }
  );

  runner.printResults(quantAccessResult);

  const accessOverhead = ((quantAccessResult.avgTime - fullAccessResult.avgTime) / fullAccessResult.avgTime) * 100;
  console.log(`\nDequantization overhead: ${accessOverhead.toFixed(1)}%`);

  // Generate report
  console.log('\n\n📄 Generating Report...');
  const report = runner.generateMarkdownReport();
  const fs = require('fs');
  const path = require('path');

  let enhancedReport = report + '\n## Memory Analysis Summary\n\n';
  enhancedReport += '### Quantization Accuracy\n\n';
  enhancedReport += `- **8-bit RMSE**: ${error8.toFixed(6)}\n`;
  enhancedReport += `- **4-bit RMSE**: ${error4.toFixed(6)}\n\n`;

  enhancedReport += '### Memory Savings\n\n';
  enhancedReport += `- **8-bit quantization**: ~75% memory reduction\n`;
  enhancedReport += `- **4-bit quantization**: ~87.5% memory reduction\n`;
  enhancedReport += `- **Dequantization overhead**: ${accessOverhead.toFixed(1)}%\n\n`;

  enhancedReport += '### System Capacity (with 2GB target)\n\n';
  enhancedReport += '| Configuration | Max Patterns | Memory |\n';
  enhancedReport += '|---------------|--------------|--------|\n';

  for (const proj of projections) {
    const vectorSize = vectorDim * 4;
    const quant4Mem = proj.count * (vectorDim / 2 + 8);
    const metadataMem = proj.count * 100;
    const hnswGraphMem = proj.count * 16 * 4;
    const total = (quant4Mem + metadataMem + hnswGraphMem) / 1024 / 1024 / 1024;
    const fits = total < 2 ? '✅' : '❌';

    enhancedReport += `| ${proj.name} | ${proj.count.toLocaleString()} | ${total.toFixed(2)}GB ${fits} |\n`;
  }

  const reportPath = path.join(__dirname, 'results', 'memory-profiling-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, enhancedReport);

  const jsonPath = path.join(__dirname, 'results', 'memory-profiling.json');
  const jsonData = {
    benchmarks: runner.getResults(),
    quantizationAccuracy: { '8bit': error8, '4bit': error4 },
    dequantizationOverhead: accessOverhead,
    projections: projections.map(proj => {
      const vectorSize = vectorDim * 4;
      const quant4Mem = proj.count * (vectorDim / 2 + 8);
      const metadataMem = proj.count * 100;
      const hnswGraphMem = proj.count * 16 * 4;
      const total = (quant4Mem + metadataMem + hnswGraphMem) / 1024 / 1024 / 1024;
      return {
        name: proj.name,
        count: proj.count,
        memoryGB: total,
        underTarget: total < 2,
      };
    }),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log(`✅ JSON data saved to: ${jsonPath}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Quantization: 8-bit RMSE=${error8.toFixed(6)}, 4-bit RMSE=${error4.toFixed(6)}`);
  console.log(`Memory savings: 8-bit=75%, 4-bit=87.5%`);
  console.log(`Access overhead: ${accessOverhead.toFixed(1)}%`);
  console.log(`2GB target: Achievable with 4-bit quantization for <500K patterns`);
}

// Run benchmarks
if (require.main === module) {
  main().catch(console.error);
}

export { Quantizer, VectorDatabase, HNSWIndex, main as runMemoryBenchmarks };
