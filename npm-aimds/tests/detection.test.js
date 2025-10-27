/**
 * Detection module tests
 */

const { describe, it, expect } = require('vitest');
const { Detector } = require('../src/detection');

describe('Detector', () => {
  it('should create detector instance', () => {
    const detector = new Detector();
    expect(detector).toBeDefined();
    expect(detector.threshold).toBe(0.8);
  });

  it('should detect safe text', async () => {
    const detector = new Detector();
    const result = await detector.detect('What is the weather today?');
    expect(result.status).toBe('safe');
  });

  it('should accept custom threshold', () => {
    const detector = new Detector({ threshold: 0.9 });
    expect(detector.threshold).toBe(0.9);
  });
});
