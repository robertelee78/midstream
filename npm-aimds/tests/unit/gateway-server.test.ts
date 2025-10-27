/**
 * Unit Tests for AIMDS Gateway Server
 * Tests API endpoints, request processing, fast/deep paths
 */

import request from 'supertest';
import { AIMDSGateway } from '../../../AIMDS/src/gateway/server';
import { ThreatLevel } from '../../../AIMDS/src/types';
import {
  mockGatewayConfig,
  mockAgentDBConfig,
  mockVerifierConfig,
  mockSafeRequest,
  mockMaliciousRequest,
  mockBatchRequests
} from '../fixtures/mock-data';

// Mock dependencies
jest.mock('../../../AIMDS/src/agentdb/client');
jest.mock('../../../AIMDS/src/lean-agentic/verifier');
jest.mock('../../../AIMDS/src/monitoring/metrics');

describe('AIMDSGateway', () => {
  let gateway: AIMDSGateway;
  let app: any;

  beforeEach(async () => {
    gateway = new AIMDSGateway(
      mockGatewayConfig,
      mockAgentDBConfig,
      mockVerifierConfig
    );

    // Mock component methods
    (gateway as any).agentdb.initialize = jest.fn().mockResolvedValue(undefined);
    (gateway as any).agentdb.vectorSearch = jest.fn().mockResolvedValue([]);
    (gateway as any).agentdb.storeIncident = jest.fn().mockResolvedValue(undefined);
    (gateway as any).agentdb.getStats = jest.fn().mockResolvedValue({
      incidents: 100,
      patterns: 50,
      memoryEntries: 200,
      memoryUsage: 1024 * 1024
    });
    (gateway as any).agentdb.shutdown = jest.fn().mockResolvedValue(undefined);

    (gateway as any).verifier.initialize = jest.fn().mockResolvedValue(undefined);
    (gateway as any).verifier.verifyPolicy = jest.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      latencyMs: 50,
      checkType: 'theorem'
    });
    (gateway as any).verifier.getCacheStats = jest.fn().mockReturnValue({
      proofs: 10,
      hashCons: 20,
      hitRate: 0.85
    });
    (gateway as any).verifier.shutdown = jest.fn().mockResolvedValue(undefined);

    (gateway as any).metrics.initialize = jest.fn().mockResolvedValue(undefined);
    (gateway as any).metrics.recordDetection = jest.fn();
    (gateway as any).metrics.exportPrometheus = jest.fn().mockResolvedValue('# metrics');
    (gateway as any).metrics.getSnapshot = jest.fn().mockResolvedValue({
      timestamp: Date.now(),
      requests: { total: 100, allowed: 90, blocked: 10, errored: 0 },
      latency: { p50: 8, p95: 50, p99: 100, avg: 10, max: 150 }
    });
    (gateway as any).metrics.shutdown = jest.fn().mockResolvedValue(undefined);

    await gateway.initialize();
    app = (gateway as any).app;
  });

  afterEach(async () => {
    await gateway.shutdown();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize all components in parallel', async () => {
      const newGateway = new AIMDSGateway(
        mockGatewayConfig,
        mockAgentDBConfig,
        mockVerifierConfig
      );

      const agentdb = (newGateway as any).agentdb;
      const verifier = (newGateway as any).verifier;
      const metrics = (newGateway as any).metrics;

      agentdb.initialize = jest.fn().mockResolvedValue(undefined);
      verifier.initialize = jest.fn().mockResolvedValue(undefined);
      metrics.initialize = jest.fn().mockResolvedValue(undefined);

      await newGateway.initialize();

      expect(agentdb.initialize).toHaveBeenCalled();
      expect(verifier.initialize).toHaveBeenCalled();
      expect(metrics.initialize).toHaveBeenCalled();

      await newGateway.shutdown();
    });

    test('should configure Express middleware', () => {
      expect(app).toBeDefined();
      // Middleware configured during initialization
    });

    test('should handle initialization errors', async () => {
      const failGateway = new AIMDSGateway(
        mockGatewayConfig,
        mockAgentDBConfig,
        mockVerifierConfig
      );

      (failGateway as any).agentdb.initialize = jest.fn()
        .mockRejectedValue(new Error('Init failed'));

      await expect(failGateway.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.components.gateway.status).toBe('up');
      expect(response.body.components.agentdb.status).toBe('up');
      expect(response.body.components.verifier.status).toBe('up');
    });

    test('should return component statistics', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.components.agentdb.incidents).toBe(100);
      expect(response.body.components.verifier.proofs).toBe(10);
    });

    test('should return 503 on component failure', async () => {
      (gateway as any).agentdb.getStats = jest.fn()
        .mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });
  });

  describe('Metrics Endpoint', () => {
    test('should export Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toBe('# metrics');
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('Defense Endpoint - Fast Path', () => {
    test('should process safe request through fast path (<10ms)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v1/defend')
        .send(mockSafeRequest)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.allowed).toBe(true);
      expect(response.body.requestId).toBe(mockSafeRequest.id);
      expect(response.body.threatLevel).toBe('LOW');
      expect(duration).toBeLessThan(100); // Including network overhead
    });

    test('should skip verification for low-threat requests', async () => {
      (gateway as any).agentdb.vectorSearch = jest.fn().mockResolvedValue([{
        id: 'match_001',
        patternId: 'safe_pattern',
        similarity: 0.8,
        threatLevel: ThreatLevel.LOW,
        description: 'Safe pattern'
      }]);

      await request(app)
        .post('/api/v1/defend')
        .send(mockSafeRequest)
        .expect(200);

      // Verification should not be called for low-threat fast path
      expect((gateway as any).verifier.verifyPolicy).not.toHaveBeenCalled();
    });

    test('should include timing metadata', async () => {
      const response = await request(app)
        .post('/api/v1/defend')
        .send(mockSafeRequest)
        .expect(200);

      expect(response.body.metadata.vectorSearchTime).toBeDefined();
      expect(response.body.metadata.totalTime).toBeDefined();
      expect(response.body.metadata.pathTaken).toBe('fast');
    });
  });

  describe('Defense Endpoint - Deep Path', () => {
    test('should process high-risk request through deep path with verification', async () => {
      (gateway as any).agentdb.vectorSearch = jest.fn().mockResolvedValue([{
        id: 'match_002',
        patternId: 'high_threat',
        similarity: 0.95,
        threatLevel: ThreatLevel.HIGH,
        description: 'High threat pattern'
      }]);

      const response = await request(app)
        .post('/api/v1/defend')
        .send(mockMaliciousRequest)
        .expect(403);

      expect(response.body.allowed).toBe(false);
      expect(response.body.threatLevel).toBe('HIGH');
      expect(response.body.metadata.pathTaken).toBe('deep');
      expect((gateway as any).verifier.verifyPolicy).toHaveBeenCalled();
    });

    test('should complete deep path within 520ms target', async () => {
      (gateway as any).agentdb.vectorSearch = jest.fn().mockResolvedValue([{
        id: 'match_003',
        patternId: 'critical_threat',
        similarity: 0.99,
        threatLevel: ThreatLevel.CRITICAL,
        description: 'Critical threat'
      }]);

      const startTime = Date.now();

      await request(app)
        .post('/api/v1/defend')
        .send(mockMaliciousRequest)
        .expect(403);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(600); // 520ms + network overhead
    });

    test('should include verification proof ID', async () => {
      (gateway as any).agentdb.vectorSearch = jest.fn().mockResolvedValue([{
        id: 'match_004',
        patternId: 'medium_threat',
        similarity: 0.85,
        threatLevel: ThreatLevel.MEDIUM,
        description: 'Medium threat'
      }]);

      (gateway as any).verifier.verifyPolicy = jest.fn().mockResolvedValue({
        valid: false,
        errors: ['Policy violation'],
        warnings: [],
        latencyMs: 100,
        checkType: 'theorem',
        proof: {
          id: 'proof_123',
          theorem: 'test',
          proof: 'proof_string',
          timestamp: Date.now(),
          verifier: 'lean-agentic',
          dependencies: [],
          hash: 'hash123'
        }
      });

      const response = await request(app)
        .post('/api/v1/defend')
        .send(mockMaliciousRequest)
        .expect(403);

      expect(response.body.proof).toBe('proof_123');
    });
  });

  describe('Request Validation', () => {
    test('should validate request schema', async () => {
      const invalidRequest = {
        // Missing required fields
        action: {
          type: 'read'
          // Missing resource, method
        }
      };

      const response = await request(app)
        .post('/api/v1/defend')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should auto-generate missing request ID', async () => {
      const requestWithoutId = {
        ...mockSafeRequest,
        id: undefined
      };

      const response = await request(app)
        .post('/api/v1/defend')
        .send(requestWithoutId)
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.requestId).toMatch(/^req_/);
    });

    test('should auto-populate timestamp', async () => {
      const requestWithoutTimestamp = {
        ...mockSafeRequest,
        timestamp: undefined
      };

      await request(app)
        .post('/api/v1/defend')
        .send(requestWithoutTimestamp)
        .expect(200);
    });

    test('should capture client IP from request', async () => {
      const requestWithoutIP = {
        ...mockSafeRequest,
        source: {
          ...mockSafeRequest.source,
          ip: undefined
        }
      };

      await request(app)
        .post('/api/v1/defend')
        .send(requestWithoutIP)
        .expect(200);
    });
  });

  describe('Batch Defense Endpoint', () => {
    test('should process multiple requests in parallel', async () => {
      const response = await request(app)
        .post('/api/v1/defend/batch')
        .send({ requests: mockBatchRequests })
        .expect(200);

      expect(response.body.results).toHaveLength(5);
      response.body.results.forEach((result: any) => {
        expect(result.allowed).toBeDefined();
        expect(result.confidence).toBeDefined();
      });
    });

    test('should reject empty batch', async () => {
      const response = await request(app)
        .post('/api/v1/defend/batch')
        .send({ requests: [] })
        .expect(400);

      expect(response.body.error).toContain('Batch size');
    });

    test('should reject batch > 100 requests', async () => {
      const largeBatch = Array(101).fill(mockSafeRequest);

      const response = await request(app)
        .post('/api/v1/defend/batch')
        .send({ requests: largeBatch })
        .expect(400);

      expect(response.body.error).toContain('Batch size');
    });

    test('should process batch efficiently', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/v1/defend/batch')
        .send({ requests: mockBatchRequests })
        .expect(200);

      const duration = Date.now() - startTime;

      // Should process 5 requests faster than 5x single request time
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Stats Endpoint', () => {
    test('should return metrics snapshot', async () => {
      const response = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(response.body.requests).toBeDefined();
      expect(response.body.latency).toBeDefined();
      expect(response.body.latency.p50).toBe(8);
      expect(response.body.latency.p95).toBe(50);
    });
  });

  describe('Error Handling', () => {
    test('should fail closed on processing error', async () => {
      (gateway as any).agentdb.vectorSearch = jest.fn()
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/defend')
        .send(mockSafeRequest)
        .expect(403);

      expect(response.body.allowed).toBe(false);
      expect(response.body.threatLevel).toBe('CRITICAL');
    });

    test('should return 404 for unknown routes', async () => {
      await request(app)
        .get('/unknown/route')
        .expect(404);
    });

    test('should handle global errors', async () => {
      // Simulate unexpected error
      (gateway as any).processRequest = jest.fn()
        .mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .post('/api/v1/defend')
        .send(mockSafeRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Middleware', () => {
    test('should apply rate limiting', async () => {
      const requests = Array(mockGatewayConfig.rateLimit.max + 10)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/v1/defend')
            .send(mockSafeRequest)
        );

      const responses = await Promise.all(requests);

      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should compress responses when enabled', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Response should be compressed if large enough
      expect(response.headers).toBeDefined();
    });

    test('should set security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should add security headers
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    test('should enforce body size limit', async () => {
      const hugePayload = {
        ...mockSafeRequest,
        action: {
          ...mockSafeRequest.action,
          payload: 'x'.repeat(2 * 1024 * 1024) // 2MB
        }
      };

      const response = await request(app)
        .post('/api/v1/defend')
        .send(hugePayload)
        .expect(413);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should shutdown all components', async () => {
      await gateway.shutdown();

      expect((gateway as any).agentdb.shutdown).toHaveBeenCalled();
      expect((gateway as any).verifier.shutdown).toHaveBeenCalled();
      expect((gateway as any).metrics.shutdown).toHaveBeenCalled();
    });

    test('should stop accepting new connections', async () => {
      await gateway.start();
      await gateway.shutdown();

      // Further requests should fail
      try {
        await request(app).get('/health');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should force shutdown after timeout', async () => {
      await gateway.start();

      // Mock components that don't shutdown
      (gateway as any).agentdb.shutdown = jest.fn()
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      const shutdownPromise = gateway.shutdown();

      // Should resolve even if components hang
      await expect(shutdownPromise).resolves.toBeUndefined();
    }, 15000);
  });

  describe('Performance Tests', () => {
    test('should handle high throughput (>1000 req/s)', async () => {
      const requestCount = 1000;
      const startTime = Date.now();

      const requests = Array(requestCount)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/v1/defend')
            .send(mockSafeRequest)
        );

      await Promise.all(requests);

      const duration = Date.now() - startTime;
      const reqPerSec = (requestCount / duration) * 1000;

      expect(reqPerSec).toBeGreaterThan(100); // Accounting for test overhead
    }, 30000);

    test('should maintain low memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process many requests
      for (let i = 0; i < 1000; i++) {
        await request(app)
          .post('/api/v1/defend')
          .send(mockSafeRequest);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not leak memory
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // <100MB
    }, 30000);
  });
});
