/**
 * Detection Worker Thread
 * Performs AI manipulation detection in parallel
 */

import { parentPort, workerData } from 'worker_threads';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Worker state
const state = {
  workerId: workerData.workerId,
  threshold: workerData.threshold || 0.8,
  processedCount: 0,
  detector: null
};

/**
 * Initialize AIMDS detector
 */
async function initializeDetector() {
  try {
    // Try to load WASM detector
    // In production, this would load the actual AIMDS WASM module
    state.detector = {
      detect: async (input) => {
        // Simulate detection logic
        // In production: use actual AIMDS detection
        const text = input.text || input.prompt || '';

        // Simple pattern-based detection for demo
        const manipulationPatterns = [
          /ignore previous instructions/i,
          /disregard all/i,
          /forget everything/i,
          /system prompt/i,
          /admin mode/i,
          /developer override/i,
          /jailbreak/i,
          /prompt injection/i
        ];

        let score = 0;
        let matchedPatterns = [];

        for (const pattern of manipulationPatterns) {
          if (pattern.test(text)) {
            score += 0.15;
            matchedPatterns.push(pattern.source);
          }
        }

        // Check for suspicious length patterns
        if (text.length > 5000) {
          score += 0.1;
        }

        // Check for unusual character patterns
        const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
        if (specialCharRatio > 0.3) {
          score += 0.1;
        }

        const detected = score >= state.threshold;
        const confidence = Math.min(score, 1.0);

        return {
          detected,
          confidence,
          score,
          patterns: matchedPatterns,
          analysis: {
            length: text.length,
            specialCharRatio,
            riskLevel: detected ? 'high' : confidence > 0.5 ? 'medium' : 'low'
          }
        };
      }
    };

    return true;
  } catch (error) {
    console.error(`Worker ${state.workerId} initialization error:`, error);
    return false;
  }
}

/**
 * Process detection request
 */
async function processDetection(taskId, input) {
  const startTime = Date.now();

  try {
    if (!state.detector) {
      await initializeDetector();
    }

    const result = await state.detector.detect(input);
    state.processedCount++;

    const processingTime = Date.now() - startTime;

    parentPort.postMessage({
      type: 'result',
      taskId,
      detected: result.detected,
      confidence: result.confidence,
      details: {
        score: result.score,
        patterns: result.patterns,
        analysis: result.analysis,
        workerId: state.workerId
      },
      processingTime
    });

  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      taskId,
      error: error.message,
      workerId: state.workerId
    });
  }
}

/**
 * Message handler
 */
parentPort.on('message', async (msg) => {
  if (msg.type === 'detect') {
    await processDetection(msg.taskId, msg.input);
  } else if (msg.type === 'stats') {
    parentPort.postMessage({
      type: 'stats',
      workerId: state.workerId,
      processedCount: state.processedCount
    });
  } else if (msg.type === 'shutdown') {
    process.exit(0);
  }
});

// Initialize on startup
initializeDetector().then(() => {
  parentPort.postMessage({
    type: 'ready',
    workerId: state.workerId
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error(`Worker ${state.workerId} uncaught exception:`, error);
  parentPort.postMessage({
    type: 'error',
    workerId: state.workerId,
    error: error.message
  });
});
