/**
 * Worker Thread for Parallel Detection
 *
 * Executes detector logic in isolated thread for:
 * - Non-blocking parallel execution
 * - CPU-intensive pattern matching
 * - Independent detector processing
 * - Graceful error isolation
 */

const { parentPort } = require('worker_threads');
const path = require('path');

// Import detection engines
let DetectionEngineAgentDB;
let neuroSymbolicDetector;
let multimodalDetector;

try {
  DetectionEngineAgentDB = require('./detection-engine-agentdb');
} catch (error) {
  console.error('Failed to load detection engine:', error.message);
}

try {
  const neuroPath = path.join(__dirname, 'detectors', 'neurosymbolic-detector.js');
  neuroSymbolicDetector = require(neuroPath);
} catch (error) {
  console.warn('Neuro-symbolic detector not available:', error.message);
}

try {
  const multiPath = path.join(__dirname, 'detectors', 'multimodal-detector.js');
  multimodalDetector = require(multiPath);
} catch (error) {
  console.warn('Multimodal detector not available:', error.message);
}

/**
 * Main worker message handler
 */
parentPort.on('message', async (message) => {
  if (message.type === 'detect') {
    try {
      const result = await detectWithEngine(message.input);
      parentPort.postMessage(result);
    } catch (error) {
      // Send error response but don't crash worker
      parentPort.postMessage({
        detected: false,
        confidence: 0,
        error: error.message,
        detectorType: message.input.detectorType || 'unknown'
      });
    }
  }
});

/**
 * Route to appropriate detector based on type
 */
async function detectWithEngine(input) {
  const { detectorType, content, options = {} } = input;

  switch (detectorType) {
    case 'vector-search':
      return await detectVectorSearch(content, options);

    case 'neuro-symbolic':
      return await detectNeuroSymbolic(content, options);

    case 'multimodal':
      return await detectMultimodal(content, options);

    default:
      // Default to vector search (most comprehensive)
      return await detectVectorSearch(content, options);
  }
}

/**
 * Vector search detection (primary detector)
 */
async function detectVectorSearch(content, options) {
  if (!DetectionEngineAgentDB) {
    throw new Error('Detection engine not available');
  }

  const engine = new DetectionEngineAgentDB({
    threshold: options.threshold || 0.8,
    enablePII: options.enablePII !== false,
    enableJailbreak: options.enableJailbreak !== false,
    enablePatternMatching: options.enablePatternMatching !== false,
    integrations: options.integrations || {}
  });

  try {
    await engine.initialize();
    const result = await engine.detect(content, options);

    return {
      detected: result.shouldBlock || result.threats.length > 0,
      confidence: result.threats.length > 0
        ? Math.max(...result.threats.map(t => t.confidence || 0.8))
        : 0,
      category: result.severity,
      threatType: result.threats.length > 0
        ? result.threats[0].type
        : null,
      threats: result.threats,
      detectionTime: result.detectionTime,
      detectorType: 'vector-search',
      agentdbEnabled: result.agentdbEnabled
    };
  } finally {
    await engine.close();
  }
}

/**
 * Neuro-symbolic detection
 */
async function detectNeuroSymbolic(content, options) {
  if (!neuroSymbolicDetector || !neuroSymbolicDetector.detect) {
    // Fallback to basic pattern matching
    return detectBasicPatterns(content, 'neuro-symbolic');
  }

  try {
    const result = await neuroSymbolicDetector.detect(content, options);

    return {
      detected: result.isThreat || false,
      confidence: result.confidence || 0.75,
      category: result.category || 'unknown',
      threatType: result.threatType || 'symbolic_match',
      reasoning: result.reasoning,
      detectorType: 'neuro-symbolic'
    };
  } catch (error) {
    console.error('Neuro-symbolic detection error:', error.message);
    return detectBasicPatterns(content, 'neuro-symbolic');
  }
}

/**
 * Multimodal detection
 */
async function detectMultimodal(content, options) {
  if (!multimodalDetector || !multimodalDetector.detect) {
    // Fallback to basic pattern matching
    return detectBasicPatterns(content, 'multimodal');
  }

  try {
    const result = await multimodalDetector.detect(content, options);

    return {
      detected: result.isThreat || false,
      confidence: result.confidence || 0.7,
      category: result.category || 'unknown',
      threatType: result.threatType || 'multimodal_anomaly',
      modalities: result.modalities,
      detectorType: 'multimodal'
    };
  } catch (error) {
    console.error('Multimodal detection error:', error.message);
    return detectBasicPatterns(content, 'multimodal');
  }
}

/**
 * Basic pattern matching fallback
 */
function detectBasicPatterns(content, detectorType) {
  const lowerContent = content.toLowerCase();

  // Critical threat patterns
  const criticalPatterns = [
    { pattern: /ignore.*(previous|prior|above).*instruction/i, severity: 'high', type: 'prompt_injection' },
    { pattern: /exec\s*\(|eval\s*\(|system\s*\(/i, severity: 'critical', type: 'code_execution' },
    { pattern: /drop\s+table|delete\s+from|union\s+select/i, severity: 'high', type: 'sql_injection' },
    { pattern: /<script|javascript:|onerror\s*=/i, severity: 'high', type: 'xss_attempt' },
    { pattern: /dan.*mode|jailbreak.*mode/i, severity: 'critical', type: 'jailbreak' }
  ];

  for (const { pattern, severity, type } of criticalPatterns) {
    if (pattern.test(lowerContent)) {
      return {
        detected: true,
        confidence: 0.85,
        category: severity,
        threatType: type,
        detectorType,
        fallback: true
      };
    }
  }

  return {
    detected: false,
    confidence: 0,
    detectorType,
    fallback: true
  };
}

/**
 * Worker initialization
 */
console.log('[Worker] Detector worker initialized');
