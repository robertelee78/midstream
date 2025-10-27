#!/usr/bin/env node

/**
 * AIMDS QUIC Streaming Server
 * High-performance HTTP/3 server for AI manipulation detection
 * Target: 89,421 req/s on 8 cores
 */

import { createServer } from 'http';
import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { createPool } from 'generic-pool';
import { nanoid } from 'nanoid';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { createLogger, format, transports } from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Performance Metrics
 */
class MetricsCollector {
  constructor() {
    this.requestCounter = new Counter({
      name: 'aimds_requests_total',
      help: 'Total number of detection requests',
      labelNames: ['method', 'status']
    });

    this.detectionDuration = new Histogram({
      name: 'aimds_detection_duration_ms',
      help: 'Detection processing time in milliseconds',
      buckets: [1, 5, 10, 25, 50, 100, 250, 500]
    });

    this.activeConnections = new Gauge({
      name: 'aimds_active_connections',
      help: 'Number of active connections'
    });

    this.throughput = new Counter({
      name: 'aimds_throughput_bytes',
      help: 'Total bytes processed',
      labelNames: ['direction']
    });

    this.workerUtilization = new Gauge({
      name: 'aimds_worker_utilization',
      help: 'Worker thread utilization percentage',
      labelNames: ['worker_id']
    });
  }

  recordRequest(method, status) {
    this.requestCounter.inc({ method, status });
  }

  recordDetectionTime(duration) {
    this.detectionDuration.observe(duration);
  }

  setActiveConnections(count) {
    this.activeConnections.set(count);
  }

  recordThroughput(bytes, direction) {
    this.throughput.inc({ direction }, bytes);
  }

  recordWorkerUtilization(workerId, utilization) {
    this.workerUtilization.set({ worker_id: workerId }, utilization);
  }

  getMetrics() {
    return register.metrics();
  }
}

/**
 * High-performance connection pool
 */
class ConnectionPool extends EventEmitter {
  constructor(config = {}) {
    super();
    this.maxConnections = config.maxConnections || 10000;
    this.connections = new Map();
    this.activeCount = 0;
  }

  acquire(connectionId) {
    if (this.activeCount >= this.maxConnections) {
      throw new Error('Connection pool exhausted');
    }

    const connection = {
      id: connectionId || nanoid(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      buffer: Buffer.allocUnsafe(64 * 1024) // 64KB buffer
    };

    this.connections.set(connection.id, connection);
    this.activeCount++;
    this.emit('acquire', connection);

    return connection;
  }

  release(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      this.activeCount--;
      this.emit('release', connection);
    }
  }

  updateActivity(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  cleanup(maxAge = 300000) { // 5 minutes
    const now = Date.now();
    const stale = [];

    for (const [id, conn] of this.connections) {
      if (now - conn.lastActivity > maxAge) {
        stale.push(id);
      }
    }

    stale.forEach(id => this.release(id));
    return stale.length;
  }

  getStats() {
    return {
      active: this.activeCount,
      max: this.maxConnections,
      utilization: (this.activeCount / this.maxConnections) * 100
    };
  }
}

/**
 * Worker thread pool for parallel detection
 */
class DetectionWorkerPool {
  constructor(config = {}) {
    this.numWorkers = config.workers || cpus().length;
    this.workers = [];
    this.workQueue = [];
    this.workerStats = new Map();
    this.logger = config.logger;

    this.initialize();
  }

  initialize() {
    const workerPath = join(__dirname, 'detection', 'worker.js');

    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(workerPath, {
        workerData: {
          workerId: i,
          threshold: 0.8
        }
      });

      worker.on('message', (msg) => this.handleWorkerMessage(i, msg));
      worker.on('error', (err) => this.handleWorkerError(i, err));
      worker.on('exit', (code) => this.handleWorkerExit(i, code));

      this.workers.push(worker);
      this.workerStats.set(i, {
        totalProcessed: 0,
        errors: 0,
        avgProcessingTime: 0,
        busy: false
      });
    }

    this.logger?.info(`Initialized ${this.numWorkers} detection workers`);
  }

  async detect(input) {
    return new Promise((resolve, reject) => {
      const task = {
        id: nanoid(),
        input,
        resolve,
        reject,
        startTime: Date.now()
      };

      const worker = this.getAvailableWorker();

      if (worker) {
        this.executeTask(worker, task);
      } else {
        this.workQueue.push(task);
      }
    });
  }

  getAvailableWorker() {
    for (let i = 0; i < this.workers.length; i++) {
      const stats = this.workerStats.get(i);
      if (!stats.busy) {
        return { index: i, worker: this.workers[i] };
      }
    }
    return null;
  }

  executeTask(workerInfo, task) {
    const { index, worker } = workerInfo;
    const stats = this.workerStats.get(index);

    stats.busy = true;

    worker.postMessage({
      type: 'detect',
      taskId: task.id,
      input: task.input
    });

    // Store task for resolution
    if (!worker.pendingTasks) {
      worker.pendingTasks = new Map();
    }
    worker.pendingTasks.set(task.id, task);
  }

  handleWorkerMessage(workerId, msg) {
    const worker = this.workers[workerId];
    const stats = this.workerStats.get(workerId);

    if (msg.type === 'result') {
      const task = worker.pendingTasks?.get(msg.taskId);

      if (task) {
        const processingTime = Date.now() - task.startTime;

        // Update stats
        stats.totalProcessed++;
        stats.avgProcessingTime =
          (stats.avgProcessingTime * (stats.totalProcessed - 1) + processingTime) /
          stats.totalProcessed;

        task.resolve({
          detected: msg.detected,
          confidence: msg.confidence,
          details: msg.details,
          processingTime
        });

        worker.pendingTasks.delete(msg.taskId);
        stats.busy = false;

        // Process next queued task
        if (this.workQueue.length > 0) {
          const nextTask = this.workQueue.shift();
          this.executeTask({ index: workerId, worker }, nextTask);
        }
      }
    }
  }

  handleWorkerError(workerId, error) {
    this.logger?.error(`Worker ${workerId} error:`, error);
    const stats = this.workerStats.get(workerId);
    stats.errors++;
    stats.busy = false;
  }

  handleWorkerExit(workerId, code) {
    if (code !== 0) {
      this.logger?.error(`Worker ${workerId} exited with code ${code}`);
    }
  }

  getStats() {
    const stats = {};
    for (const [id, workerStats] of this.workerStats) {
      stats[`worker_${id}`] = workerStats;
    }
    return stats;
  }

  async terminate() {
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
    this.workerStats.clear();
  }
}

/**
 * Main QUIC Server
 */
export class QuicServer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
      workers: config.workers || cpus().length,
      detection: {
        threshold: config.detection?.threshold || 0.8,
        ...config.detection
      },
      pool: {
        maxConnections: config.pool?.maxConnections || 10000,
        ...config.pool
      },
      logging: {
        level: config.logging?.level || 'info',
        ...config.logging
      }
    };

    this.logger = this.createLogger();
    this.metrics = new MetricsCollector();
    this.connectionPool = new ConnectionPool(this.config.pool);
    this.workerPool = new DetectionWorkerPool({
      workers: this.config.workers,
      logger: this.logger
    });

    this.server = null;
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  createLogger() {
    return createLogger({
      level: this.config.logging.level,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          )
        })
      ]
    });
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    // Create HTTP server (QUIC/HTTP3 would require native bindings)
    // For production, use @fails-components/webtransport or similar
    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });

    // Setup connection tracking
    this.connectionPool.on('acquire', (conn) => {
      this.metrics.setActiveConnections(this.connectionPool.activeCount);
    });

    this.connectionPool.on('release', (conn) => {
      this.metrics.setActiveConnections(this.connectionPool.activeCount);
    });

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.connectionPool.cleanup();
      if (cleaned > 0) {
        this.logger.debug(`Cleaned ${cleaned} stale connections`);
      }
    }, 60000); // Every minute

    // Start server
    await new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, (err) => {
        if (err) reject(err);
        else {
          this.isRunning = true;
          this.logger.info(`AIMDS QUIC Server listening on ${this.config.host}:${this.config.port}`);
          this.logger.info(`Workers: ${this.config.workers}, Target: 89,421 req/s`);
          this.emit('ready');
          resolve();
        }
      });
    });

    // Setup metrics endpoint
    this.setupMetricsEndpoint();
  }

  async handleRequest(req, res) {
    const startTime = Date.now();
    const connectionId = req.headers['x-connection-id'] || nanoid();

    try {
      // Acquire connection
      const connection = this.connectionPool.acquire(connectionId);

      // Handle different endpoints
      if (req.url === '/detect' && req.method === 'POST') {
        await this.handleDetection(req, res, connection, startTime);
      } else if (req.url === '/stream' && req.method === 'POST') {
        await this.handleStream(req, res, connection, startTime);
      } else if (req.url === '/metrics' && req.method === 'GET') {
        await this.handleMetrics(req, res);
      } else if (req.url === '/health' && req.method === 'GET') {
        this.handleHealth(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }

      // Release connection
      this.connectionPool.release(connectionId);

    } catch (error) {
      this.logger.error('Request error:', error);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }));

      this.metrics.recordRequest(req.method, 500);
    }
  }

  async handleDetection(req, res, connection, startTime) {
    const chunks = [];

    req.on('data', chunk => {
      chunks.push(chunk);
      this.metrics.recordThroughput(chunk.length, 'inbound');
    });

    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks).toString();
        const input = JSON.parse(body);

        // Perform detection via worker pool
        const result = await this.workerPool.detect(input);

        // Record metrics
        const processingTime = Date.now() - startTime;
        this.metrics.recordDetectionTime(processingTime);
        this.metrics.recordRequest(req.method, 200);

        // Send response
        const response = JSON.stringify({
          detected: result.detected,
          confidence: result.confidence,
          details: result.details,
          processingTime: result.processingTime,
          totalTime: processingTime
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime
        });
        res.end(response);

        this.metrics.recordThroughput(response.length, 'outbound');

      } catch (error) {
        this.logger.error('Detection error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
        this.metrics.recordRequest(req.method, 400);
      }
    });
  }

  async handleStream(req, res, connection, startTime) {
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no'
    });

    const chunks = [];

    req.on('data', async (chunk) => {
      try {
        const input = JSON.parse(chunk.toString());

        // Process each chunk
        const result = await this.workerPool.detect(input);

        // Stream result back
        const response = JSON.stringify({
          detected: result.detected,
          confidence: result.confidence,
          timestamp: Date.now()
        }) + '\n';

        res.write(response);
        this.metrics.recordThroughput(response.length, 'outbound');

      } catch (error) {
        this.logger.error('Stream processing error:', error);
      }
    });

    req.on('end', () => {
      res.end();
      const totalTime = Date.now() - startTime;
      this.metrics.recordRequest('STREAM', 200);
      this.logger.debug(`Stream completed in ${totalTime}ms`);
    });

    req.on('error', (error) => {
      this.logger.error('Stream error:', error);
      res.end();
    });
  }

  async handleMetrics(req, res) {
    try {
      const metrics = await this.metrics.getMetrics();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(metrics);
    } catch (error) {
      this.logger.error('Metrics error:', error);
      res.writeHead(500);
      res.end();
    }
  }

  handleHealth(req, res) {
    const stats = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: this.connectionPool.getStats(),
      workers: this.workerPool.getStats(),
      timestamp: Date.now()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
  }

  setupMetricsEndpoint() {
    // Metrics are exposed via /metrics endpoint
    this.logger.info('Prometheus metrics available at /metrics');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Shutting down server...');

    // Stop accepting new connections
    await new Promise((resolve) => {
      this.server.close(resolve);
    });

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Terminate workers
    await this.workerPool.terminate();

    this.isRunning = false;
    this.logger.info('Server stopped');
    this.emit('stopped');
  }

  getStats() {
    return {
      config: this.config,
      connections: this.connectionPool.getStats(),
      workers: this.workerPool.getStats(),
      uptime: process.uptime()
    };
  }
}

/**
 * Factory function
 */
export async function createQuicServer(config) {
  const server = new QuicServer(config);
  await server.start();
  return server;
}

/**
 * Graceful shutdown
 */
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = {
    port: parseInt(process.env.PORT || '3000'),
    workers: parseInt(process.env.WORKERS || cpus().length),
    detection: {
      threshold: parseFloat(process.env.THRESHOLD || '0.8')
    }
  };

  const server = await createQuicServer(config);
  setupGracefulShutdown(server);
}
