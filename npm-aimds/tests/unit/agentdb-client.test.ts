/**
 * Unit Tests for AgentDB Client
 * Tests vector search, HNSW indexing, QUIC sync, and memory management
 */

import { AgentDBClient } from '../../../AIMDS/src/agentdb/client';
import { Logger } from '../../../AIMDS/src/utils/logger';
import { ThreatLevel } from '../../../AIMDS/src/types';
import {
  mockAgentDBConfig,
  mockSafeEmbedding,
  mockMaliciousEmbedding,
  mockSafeRequest,
  mockAllowedResult,
  mockThreatPatterns,
  generateMockEmbedding
} from '../fixtures/mock-data';

// Mock agentdb module
jest.mock('agentdb', () => ({
  createDatabase: jest.fn(() => ({
    createIndex: jest.fn().mockResolvedValue(undefined),
    createCollection: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getMemoryUsage: jest.fn().mockReturnValue(1024 * 1024),
    sync: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('AgentDBClient', () => {
  let client: AgentDBClient;
  let logger: Logger;
  let mockDb: any;

  beforeEach(() => {
    logger = new Logger('test');
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    client = new AgentDBClient(mockAgentDBConfig, logger);
    mockDb = (client as any).db;
  });

  afterEach(async () => {
    await client.shutdown();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with HNSW index', async () => {
      await client.initialize();

      expect(mockDb.createIndex).toHaveBeenCalledWith({
        type: 'hnsw',
        params: {
          m: 16,
          efConstruction: 200,
          efSearch: 50,
          metric: 'cosine'
        }
      });
    });

    test('should create required collections', async () => {
      await client.initialize();

      expect(mockDb.createCollection).toHaveBeenCalledTimes(3);
      expect(mockDb.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'threat_patterns' })
      );
      expect(mockDb.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'incidents' })
      );
      expect(mockDb.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'reflexion_memory' })
      );
    });

    test('should not initialize QUIC sync when disabled', async () => {
      await client.initialize();

      expect(mockDb.sync).not.toHaveBeenCalled();
    });

    test('should handle initialization errors gracefully', async () => {
      mockDb.createIndex.mockRejectedValueOnce(new Error('Index creation failed'));

      await expect(client.initialize()).rejects.toThrow('Index creation failed');
    });
  });

  describe('Vector Search', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should perform fast vector search with HNSW (<2ms target)', async () => {
      const mockResults = [
        {
          id: 'match_001',
          similarity: 0.85,
          metadata: {
            patternId: 'pattern_safe',
            description: 'Safe pattern',
            threatLevel: ThreatLevel.LOW,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            occurrences: 100,
            sources: ['web']
          },
          embedding: mockSafeEmbedding
        }
      ];

      mockDb.search.mockResolvedValueOnce(mockResults);

      const { result, duration } = await testUtils.measurePerformance(() =>
        client.vectorSearch(mockSafeEmbedding, { k: 10, threshold: 0.7 })
      );

      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.85);
      expect(result[0].threatLevel).toBe(ThreatLevel.LOW);
      expect(duration).toBeLessThan(10); // Should be <2ms, allowing buffer for test overhead
    });

    test('should filter results by similarity threshold', async () => {
      const mockResults = [
        {
          id: '1',
          similarity: 0.95,
          metadata: { patternId: 'p1', threatLevel: ThreatLevel.HIGH },
          embedding: []
        },
        {
          id: '2',
          similarity: 0.65,
          metadata: { patternId: 'p2', threatLevel: ThreatLevel.LOW },
          embedding: []
        }
      ];

      mockDb.search.mockResolvedValueOnce(mockResults);

      const matches = await client.vectorSearch(mockSafeEmbedding, {
        k: 10,
        threshold: 0.7
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].similarity).toBeGreaterThanOrEqual(0.7);
    });

    test('should apply MMR for diversity when requested', async () => {
      const mockResults = mockThreatPatterns.map(p => ({
        id: p.id,
        similarity: 0.85,
        metadata: p.metadata,
        embedding: p.embedding
      }));

      mockDb.search.mockResolvedValueOnce(mockResults);

      const matches = await client.vectorSearch(mockSafeEmbedding, {
        k: 10,
        diversityFactor: 0.5
      });

      expect(matches).toBeDefined();
      // MMR should reorder results for diversity
    });

    test('should handle empty search results', async () => {
      mockDb.search.mockResolvedValueOnce([]);

      const matches = await client.vectorSearch(mockSafeEmbedding);

      expect(matches).toEqual([]);
    });

    test('should calculate threat level based on similarity', async () => {
      const mockResults = [
        {
          id: '1',
          similarity: 0.98,
          metadata: { patternId: 'p1', threatLevel: ThreatLevel.LOW },
          embedding: []
        }
      ];

      mockDb.search.mockResolvedValueOnce(mockResults);

      const matches = await client.vectorSearch(mockSafeEmbedding);

      // High similarity should escalate threat level
      expect(matches[0].threatLevel).toBeGreaterThanOrEqual(ThreatLevel.HIGH);
    });
  });

  describe('Incident Storage', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should store incident with embedding', async () => {
      const incident = {
        id: 'inc_001',
        timestamp: Date.now(),
        request: mockSafeRequest,
        result: mockAllowedResult,
        embedding: mockSafeEmbedding
      };

      await client.storeIncident(incident);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'incidents',
          document: expect.objectContaining({
            id: incident.id,
            timestamp: incident.timestamp
          })
        })
      );
    });

    test('should update threat patterns for medium+ threats', async () => {
      const incident = {
        id: 'inc_002',
        timestamp: Date.now(),
        request: mockSafeRequest,
        result: { ...mockAllowedResult, threatLevel: ThreatLevel.MEDIUM },
        embedding: mockMaliciousEmbedding
      };

      await client.storeIncident(incident);

      expect(mockDb.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'threat_patterns'
        })
      );
    });

    test('should store in ReflexionMemory for learning', async () => {
      const incident = {
        id: 'inc_003',
        timestamp: Date.now(),
        request: mockSafeRequest,
        result: mockAllowedResult,
        embedding: mockSafeEmbedding
      };

      await client.storeIncident(incident);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'reflexion_memory',
          document: expect.objectContaining({
            verdict: 'success',
            trajectory: expect.any(String),
            feedback: expect.any(String)
          })
        })
      );
    });

    test('should handle causal links when present', async () => {
      const incident = {
        id: 'inc_004',
        timestamp: Date.now(),
        request: mockSafeRequest,
        result: mockAllowedResult,
        embedding: mockSafeEmbedding,
        causalLinks: ['inc_001', 'inc_002']
      };

      await client.storeIncident(incident);

      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'causal_graph'
        })
      );
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should return accurate statistics', async () => {
      mockDb.count
        .mockResolvedValueOnce(100) // incidents
        .mockResolvedValueOnce(50)  // patterns
        .mockResolvedValueOnce(200); // memory entries

      const stats = await client.getStats();

      expect(stats).toEqual({
        incidents: 100,
        patterns: 50,
        memoryEntries: 200,
        memoryUsage: 1024 * 1024
      });
    });

    test('should handle stats query errors', async () => {
      mockDb.count.mockRejectedValueOnce(new Error('Query failed'));

      await expect(client.getStats()).rejects.toThrow();
    });
  });

  describe('Cleanup and Maintenance', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    test('should cleanup old entries based on TTL', async () => {
      await client.cleanup();

      expect(mockDb.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'incidents',
          filter: expect.objectContaining({
            timestamp: expect.any(Object)
          })
        })
      );

      expect(mockDb.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'reflexion_memory'
        })
      );
    });

    test('should shutdown gracefully', async () => {
      await client.shutdown();

      expect(mockDb.close).toHaveBeenCalled();
    });
  });

  describe('QUIC Synchronization', () => {
    test('should sync with peers when enabled', async () => {
      const syncConfig = {
        ...mockAgentDBConfig,
        quicSync: {
          enabled: true,
          peers: ['peer1.example.com', 'peer2.example.com'],
          port: 4433
        }
      };

      const syncClient = new AgentDBClient(syncConfig, logger);
      await syncClient.initialize();

      const syncDb = (syncClient as any).db;

      // Wait for initial sync
      await testUtils.waitFor(100);

      expect(syncDb.sync).toHaveBeenCalled();

      await syncClient.shutdown();
    });

    test('should handle sync failures gracefully', async () => {
      const syncConfig = {
        ...mockAgentDBConfig,
        quicSync: {
          enabled: true,
          peers: ['peer1.example.com'],
          port: 4433
        }
      };

      const syncClient = new AgentDBClient(syncConfig, logger);
      await syncClient.initialize();

      const syncDb = (syncClient as any).db;
      syncDb.sync.mockRejectedValueOnce(new Error('Sync failed'));

      await syncClient.syncWithPeers();

      // Should not throw - sync failures are logged
      expect(logger.error).toHaveBeenCalled();

      await syncClient.shutdown();
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed embeddings', async () => {
      await client.initialize();

      const invalidEmbedding = [NaN, Infinity, -Infinity];

      mockDb.search.mockResolvedValueOnce([]);

      const matches = await client.vectorSearch(invalidEmbedding);

      expect(matches).toEqual([]);
    });

    test('should handle very large embedding dimensions', async () => {
      const largeConfig = {
        ...mockAgentDBConfig,
        embeddingDim: 4096
      };

      const largeClient = new AgentDBClient(largeConfig, logger);
      await largeClient.initialize();

      const largeEmbedding = generateMockEmbedding(1, 4096);

      mockDb.search.mockResolvedValueOnce([]);

      await expect(
        largeClient.vectorSearch(largeEmbedding)
      ).resolves.toBeDefined();

      await largeClient.shutdown();
    });

    test('should handle concurrent searches efficiently', async () => {
      await client.initialize();

      mockDb.search.mockResolvedValue([]);

      const searches = Array(100).fill(null).map(() =>
        client.vectorSearch(mockSafeEmbedding, { k: 10 })
      );

      const { result, duration } = await testUtils.measurePerformance(() =>
        Promise.all(searches)
      );

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(500); // All 100 searches in <500ms
    });
  });
});
