/**
 * Memory Pooling Integration Example
 * Shows how to integrate memory-optimized detector into existing AI Defence proxy
 */

const express = require('express');
const MemoryOptimizedDetector = require('./detectors/memory-optimized-detector');
const { createStandardPools, poolManager } = require('../utils/memory-pool');

// Initialize standard pools once at startup
createStandardPools();
console.log('✓ Memory pools initialized');

// Create detector instance
const detector = new MemoryOptimizedDetector();

const app = express();
app.use(express.json());

/**
 * Memory-optimized middleware for threat detection
 */
app.use(async (req, res, next) => {
  try {
    // Analyze request with pooled buffers
    const startTime = Date.now();
    const result = await detector.analyzeRequest(req, req.body);
    const processingTime = Date.now() - startTime;

    // Add detection info to request
    req.threatDetection = result;
    req.detectionTime = processingTime;

    // Block if threats detected
    if (result.threats.length > 0) {
      return res.status(403).json({
        error: 'Threat detected',
        threats: result.threats,
        confidence: result.confidence,
        processingTime: processingTime
      });
    }

    next();
  } catch (err) {
    console.error('Detection error:', err);
    // Fail open (or fail closed based on security policy)
    next();
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  const detectorHealth = detector.healthCheck();
  const poolHealth = poolManager.healthCheck();

  const isHealthy = detectorHealth.detector.healthy && poolHealth.healthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    detector: detectorHealth,
    pools: poolHealth
  });
});

/**
 * Metrics endpoint
 */
app.get('/metrics', (req, res) => {
  const stats = detector.getStats();

  res.json({
    detector: stats.detector,
    pools: stats.pools,
    memory: {
      process: process.memoryUsage(),
      poolManager: stats.memory
    }
  });
});

/**
 * Pool statistics endpoint
 */
app.get('/metrics/pools', (req, res) => {
  res.json(poolManager.getStats());
});

/**
 * Example protected API endpoint
 */
app.post('/api/data', (req, res) => {
  res.json({
    message: 'Data processed successfully',
    threatDetection: req.threatDetection,
    processingTime: req.detectionTime
  });
});

/**
 * Cleanup on shutdown
 */
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');

  // Get final stats
  const stats = detector.getStats();
  console.log('Final statistics:', JSON.stringify(stats, null, 2));

  // Cleanup
  detector.destroy();
  poolManager.destroyAll();

  process.exit(0);
});

// Example usage
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`\n🚀 AI Defence with Memory Pooling running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Metrics: http://localhost:${PORT}/metrics`);
    console.log(`   Pool Stats: http://localhost:${PORT}/metrics/pools`);

    // Log initial pool stats
    setTimeout(() => {
      console.log('\n📊 Initial Pool Statistics:');
      const stats = poolManager.getStats();
      for (const [name, poolStats] of Object.entries(stats.pools)) {
        console.log(`   ${name}: ${poolStats.totalAllocated} buffers, ${poolStats.memoryUsageMB}MB`);
      }
    }, 1000);
  });
}

module.exports = { app, detector, poolManager };
