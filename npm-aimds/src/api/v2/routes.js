/**
 * API v2 Routes - AI Defence
 *
 * Express router for batch detection endpoints
 */

import express from 'express';
import BatchDetectionAPI from './detect-batch.js';

function createV2Router(options = {}) {
  const router = express.Router();
  const batchAPI = new BatchDetectionAPI(options);

  // Initialize on first request
  let initialized = false;
  router.use(async (req, res, next) => {
    if (!initialized) {
      await batchAPI.initialize();
      initialized = true;
    }
    next();
  });

  /**
   * POST /api/v2/detect/batch
   *
   * Process batch detection requests
   *
   * Body:
   * {
   *   requests: Array<{id?, content, contentType?, context?, options?}>,
   *   options?: {
   *     parallelism?: number (1-100, default: 10),
   *     aggregateResults?: boolean (default: true),
   *     async?: boolean (default: false),
   *     enableCache?: boolean (default: true)
   *   }
   * }
   */
  router.post('/detect/batch', async (req, res) => {
    try {
      const result = await batchAPI.processBatch(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/v2/detect/batch/:batchId
   *
   * Get batch processing status and results
   */
  router.get('/detect/batch/:batchId', (req, res) => {
    const { batchId } = req.params;
    const status = batchAPI.getBatchStatus(batchId);

    if (!status) {
      return res.status(404).json({
        error: 'Batch not found',
        batchId,
        timestamp: new Date().toISOString()
      });
    }

    res.json(status);
  });

  /**
   * GET /api/v2/stats
   *
   * Get API statistics
   */
  router.get('/stats', (req, res) => {
    res.json(batchAPI.getStats());
  });

  /**
   * POST /api/v2/cache/clear
   *
   * Clear detection cache
   */
  router.post('/cache/clear', (req, res) => {
    batchAPI.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * POST /api/v2/jobs/cleanup
   *
   * Clean up old completed jobs
   */
  router.post('/jobs/cleanup', (req, res) => {
    batchAPI.cleanupOldJobs();
    res.json({
      success: true,
      message: 'Old jobs cleaned up',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Health check
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  });

  return {
    router,
    batchAPI
  };
}

export default createV2Router;
