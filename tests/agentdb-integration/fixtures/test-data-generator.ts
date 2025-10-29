/**
 * Test Data Generator for AgentDB + Midstreamer Integration Tests
 * Generates synthetic temporal sequences for testing
 */

export interface TimeSeriesOptions {
  length: number;
  frequency?: number;
  amplitude?: number;
  noise?: number;
  trend?: number;
}

export interface AnomalyOptions {
  position: number;
  magnitude: number;
  duration?: number;
  type?: 'spike' | 'dip' | 'plateau' | 'oscillation';
}

/**
 * Generate sine wave sequence
 */
export function generateSineWave(options: TimeSeriesOptions): number[] {
  const {
    length,
    frequency = 0.1,
    amplitude = 1.0,
    noise = 0,
    trend = 0,
  } = options;

  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    const sineValue = amplitude * Math.sin(2 * Math.PI * frequency * i);
    const trendValue = trend * i;
    const noiseValue = noise > 0 ? (Math.random() - 0.5) * noise : 0;
    data.push(sineValue + trendValue + noiseValue);
  }
  return data;
}

/**
 * Generate random walk sequence
 */
export function generateRandomWalk(options: TimeSeriesOptions): number[] {
  const { length, amplitude = 1.0, noise = 0.1 } = options;

  const data: number[] = [0];
  for (let i = 1; i < length; i++) {
    const step = (Math.random() - 0.5) * amplitude;
    const noiseValue = noise > 0 ? (Math.random() - 0.5) * noise : 0;
    data.push(data[i - 1] + step + noiseValue);
  }
  return data;
}

/**
 * Generate CPU usage pattern (realistic)
 */
export function generateCPUUsagePattern(length: number): number[] {
  const data: number[] = [];
  let currentLoad = 30 + Math.random() * 20; // Start at 30-50%

  for (let i = 0; i < length; i++) {
    // Natural variation
    const variation = (Math.random() - 0.5) * 5;
    currentLoad += variation;

    // Keep within bounds
    currentLoad = Math.max(10, Math.min(95, currentLoad));

    // Add occasional spikes
    if (Math.random() > 0.95) {
      currentLoad += Math.random() * 20;
    }

    data.push(Math.round(currentLoad * 10) / 10);
  }
  return data;
}

/**
 * Inject anomaly into sequence
 */
export function injectAnomaly(
  data: number[],
  anomaly: AnomalyOptions
): number[] {
  const result = [...data];
  const { position, magnitude, duration = 1, type = 'spike' } = anomaly;

  for (let i = 0; i < duration; i++) {
    const idx = position + i;
    if (idx >= result.length) break;

    switch (type) {
      case 'spike':
        result[idx] += magnitude;
        break;
      case 'dip':
        result[idx] -= magnitude;
        break;
      case 'plateau':
        result[idx] = magnitude;
        break;
      case 'oscillation':
        result[idx] += magnitude * Math.sin(i * Math.PI / 2);
        break;
    }
  }
  return result;
}

/**
 * Generate sequence with known anomaly
 */
export function generateAnomalySequence(
  normalLength: number,
  anomalyOptions: AnomalyOptions
): { data: number[]; anomalyIndices: number[] } {
  const normal = generateCPUUsagePattern(normalLength);
  const data = injectAnomaly(normal, anomalyOptions);

  const anomalyIndices: number[] = [];
  for (let i = 0; i < (anomalyOptions.duration || 1); i++) {
    anomalyIndices.push(anomalyOptions.position + i);
  }

  return { data, anomalyIndices };
}

/**
 * Generate multiple similar patterns with variations
 */
export function generateSimilarPatterns(
  basePattern: number[],
  count: number,
  variationPercent: number = 10
): number[][] {
  const patterns: number[][] = [];

  for (let i = 0; i < count; i++) {
    const pattern = basePattern.map((val) => {
      const variation = (Math.random() - 0.5) * 2 * (variationPercent / 100);
      return val * (1 + variation);
    });
    patterns.push(pattern);
  }

  return patterns;
}

/**
 * Generate diverse pattern set for training
 */
export function generateTrainingSet(size: number): Array<{
  pattern: number[];
  label: string;
  features: Record<string, number>;
}> {
  const dataset: Array<{
    pattern: number[];
    label: string;
    features: Record<string, number>;
  }> = [];

  const patterns = [
    { label: 'low-load', generator: () => generateCPUUsagePattern(50).map(v => v * 0.5) },
    { label: 'high-load', generator: () => generateCPUUsagePattern(50).map(v => v * 1.5) },
    { label: 'spike', generator: () => injectAnomaly(generateCPUUsagePattern(50), {
      position: 25,
      magnitude: 40,
      type: 'spike'
    })},
    { label: 'oscillating', generator: () => generateSineWave({
      length: 50,
      frequency: 0.1,
      amplitude: 30,
      noise: 5
    })},
  ];

  for (let i = 0; i < size; i++) {
    const patternType = patterns[i % patterns.length];
    const pattern = patternType.generator();

    dataset.push({
      pattern,
      label: patternType.label,
      features: {
        mean: pattern.reduce((a, b) => a + b, 0) / pattern.length,
        max: Math.max(...pattern),
        min: Math.min(...pattern),
        variance: calculateVariance(pattern),
      },
    });
  }

  return dataset;
}

/**
 * Calculate variance of a sequence
 */
function calculateVariance(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
}

/**
 * Example sequences from quick-start guide
 */
export const EXAMPLE_SEQUENCES = {
  cpuUsage: [45, 47, 50, 55, 62, 70, 78, 85, 90, 88, 82, 75, 68],
  similarCpuUsage: [43, 48, 53, 58, 65, 72, 79, 84, 89, 87, 80, 72],
  normalLoad: [30, 32, 35, 33, 31, 34, 36, 35, 33, 32, 30, 31],
  spikePattern: [30, 32, 35, 92, 95, 98, 40, 35, 33, 32, 30, 31],
};
