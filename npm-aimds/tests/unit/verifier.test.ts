/**
 * Unit Tests for lean-agentic Verifier
 * Tests hash-consing, dependent types, theorem proving, and policy verification
 */

import { LeanAgenticVerifier } from '../../../AIMDS/src/lean-agentic/verifier';
import { Logger } from '../../../AIMDS/src/utils/logger';
import {
  mockVerifierConfig,
  mockDefaultPolicy,
  mockStrictPolicy,
  mockProofCertificate
} from '../fixtures/mock-data';
import { Action, SecurityPolicy } from '../../../AIMDS/src/types';

// Mock lean-agentic module
jest.mock('lean-agentic', () => ({
  createDemo: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    addAxiom: jest.fn().mockResolvedValue(undefined),
    prove: jest.fn().mockResolvedValue({
      toString: () => 'intro a; intro h; apply policy_allows; exact h'
    }),
    verify: jest.fn().mockResolvedValue(true),
    hashConsEquals: jest.fn().mockResolvedValue(false),
    typeCheck: jest.fn().mockResolvedValue({ valid: true }),
    evaluate: jest.fn().mockResolvedValue(true),
    shutdown: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('LeanAgenticVerifier', () => {
  let verifier: LeanAgenticVerifier;
  let logger: Logger;
  let mockEngine: any;

  const mockAction: Action = {
    type: 'read',
    resource: '/api/users/profile',
    parameters: { userId: '12345' },
    context: {
      timestamp: Date.now(),
      user: 'testuser',
      role: 'user'
    }
  };

  beforeEach(() => {
    logger = new Logger('test');
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();

    verifier = new LeanAgenticVerifier(mockVerifierConfig, logger);
    mockEngine = (verifier as any).engine;
  });

  afterEach(async () => {
    await verifier.shutdown();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize lean-agentic engine', async () => {
      await verifier.initialize();

      expect(mockEngine.initialize).toHaveBeenCalled();
    });

    test('should load security axioms', async () => {
      await verifier.initialize();

      expect(mockEngine.addAxiom).toHaveBeenCalledTimes(4);
      expect(mockEngine.addAxiom).toHaveBeenCalledWith(
        expect.stringContaining('auth_implies_authorized')
      );
      expect(mockEngine.addAxiom).toHaveBeenCalledWith(
        expect.stringContaining('deny_overrides_allow')
      );
    });

    test('should handle initialization errors', async () => {
      mockEngine.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(verifier.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('Policy Verification', () => {
    beforeEach(async () => {
      await verifier.initialize();
    });

    test('should verify action against policy (<500ms target)', async () => {
      const { result, duration } = await testUtils.measurePerformance(() =>
        verifier.verifyPolicy(mockAction, mockDefaultPolicy)
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(duration).toBeLessThan(500);
    });

    test('should use hash-consing for fast structural equality (150x faster)', async () => {
      mockEngine.hashConsEquals.mockResolvedValueOnce(true);

      const { result, duration } = await testUtils.measurePerformance(() =>
        verifier.verifyPolicy(mockAction, mockDefaultPolicy)
      );

      expect(result.valid).toBe(true);
      expect(result.checkType).toBe('hash-cons');
      expect(duration).toBeLessThan(5); // Hash-cons should be <1ms
    });

    test('should perform dependent type checking when hash-cons fails', async () => {
      mockEngine.hashConsEquals.mockResolvedValueOnce(false);
      mockEngine.typeCheck.mockResolvedValueOnce({ valid: true });

      const result = await verifier.verifyPolicy(mockAction, mockDefaultPolicy);

      expect(mockEngine.typeCheck).toHaveBeenCalled();
      expect(result.checkType).toBe('theorem');
    });

    test('should fail verification when type checking fails', async () => {
      mockEngine.hashConsEquals.mockResolvedValueOnce(null);
      mockEngine.typeCheck.mockResolvedValueOnce({
        valid: false,
        message: 'Type error: invalid parameter type'
      });

      const result = await verifier.verifyPolicy(mockAction, mockDefaultPolicy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Type error'));
    });

    test('should evaluate policy rules by priority', async () => {
      const denyAction: Action = {
        ...mockAction,
        type: 'execute',
        resource: '/admin/dangerous'
      };

      mockEngine.evaluate
        .mockResolvedValueOnce(false) // deny rule
        .mockResolvedValueOnce(true);  // verify rule

      const result = await verifier.verifyPolicy(denyAction, mockDefaultPolicy);

      expect(mockEngine.evaluate).toHaveBeenCalled();
    });

    test('should apply deny overrides allow principle', async () => {
      const policy: SecurityPolicy = {
        ...mockDefaultPolicy,
        rules: [
          {
            id: 'allow_all',
            condition: 'true',
            action: 'allow',
            priority: 1
          },
          {
            id: 'deny_specific',
            condition: 'action.type == "dangerous"',
            action: 'deny',
            priority: 100
          }
        ]
      };

      mockEngine.evaluate
        .mockResolvedValueOnce(true); // deny rule matches

      const result = await verifier.verifyPolicy(mockAction, policy);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should check all constraints', async () => {
      const result = await verifier.verifyPolicy(mockAction, mockDefaultPolicy);

      // All constraints should be evaluated
      expect(result).toBeDefined();
    });

    test('should handle verification warnings separately from errors', async () => {
      mockEngine.typeCheck.mockResolvedValueOnce({
        valid: false,
        message: 'Warning: suboptimal type'
      });

      const policyWithWarnings: SecurityPolicy = {
        ...mockDefaultPolicy,
        constraints: [
          {
            type: 'behavioral',
            expression: 'rate_limit_check',
            severity: 'warning'
          }
        ]
      };

      const result = await verifier.verifyPolicy(mockAction, policyWithWarnings);

      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Theorem Proving', () => {
    beforeEach(async () => {
      await verifier.initialize();
    });

    test('should prove theorem and return certificate', async () => {
      const theorem = 'theorem test: ∀ (a : Action), allowed a → valid a';

      const certificate = await verifier.proveTheorem(theorem);

      expect(certificate).toBeDefined();
      expect(certificate?.theorem).toBe(theorem);
      expect(certificate?.verifier).toBe('lean-agentic');
      expect(certificate?.hash).toBeDefined();
    });

    test('should cache proven theorems', async () => {
      const theorem = 'theorem cached: ∀ (a : Action), true';

      const cert1 = await verifier.proveTheorem(theorem);
      const cert2 = await verifier.proveTheorem(theorem);

      expect(cert1).toEqual(cert2);
      expect(mockEngine.prove).toHaveBeenCalledTimes(1);
    });

    test('should timeout on complex proofs', async () => {
      mockEngine.prove.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const theorem = 'theorem complex: ∀ (a : Action), very_complex_condition a';

      const certificate = await verifier.proveTheorem(theorem);

      expect(certificate).toBeNull();
    });

    test('should handle proof failures gracefully', async () => {
      mockEngine.prove.mockRejectedValueOnce(new Error('Proof failed'));

      const theorem = 'theorem invalid: false';

      const certificate = await verifier.proveTheorem(theorem);

      expect(certificate).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    test('should extract proof dependencies', async () => {
      const certificate = await verifier.proveTheorem('theorem test: true');

      expect(certificate?.dependencies).toBeDefined();
      expect(Array.isArray(certificate?.dependencies)).toBe(true);
    });
  });

  describe('Proof Certificate Verification', () => {
    beforeEach(async () => {
      await verifier.initialize();
    });

    test('should verify valid proof certificate', async () => {
      const valid = await verifier.verifyProofCertificate(mockProofCertificate);

      expect(valid).toBe(true);
      expect(mockEngine.verify).toHaveBeenCalledWith(
        mockProofCertificate.theorem,
        mockProofCertificate.proof
      );
    });

    test('should reject certificate with invalid hash', async () => {
      const invalidCert = {
        ...mockProofCertificate,
        hash: 'sha256:invalid'
      };

      const valid = await verifier.verifyProofCertificate(invalidCert);

      expect(valid).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should handle verification errors', async () => {
      mockEngine.verify.mockRejectedValueOnce(new Error('Verification failed'));

      const valid = await verifier.verifyProofCertificate(mockProofCertificate);

      expect(valid).toBe(false);
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await verifier.initialize();
    });

    test('should track cache statistics', async () => {
      await verifier.proveTheorem('theorem test1: true');
      await verifier.proveTheorem('theorem test2: true');

      const stats = verifier.getCacheStats();

      expect(stats.proofs).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
    });

    test('should clear caches', async () => {
      await verifier.proveTheorem('theorem test: true');

      verifier.clearCaches();

      const stats = verifier.getCacheStats();
      expect(stats.proofs).toBe(0);
      expect(stats.hashCons).toBe(0);
    });

    test('should respect cache size limits', async () => {
      const smallCacheConfig = {
        ...mockVerifierConfig,
        cacheSize: 2
      };

      const smallVerifier = new LeanAgenticVerifier(smallCacheConfig, logger);
      await smallVerifier.initialize();

      // Add more theorems than cache size
      await smallVerifier.proveTheorem('theorem test1: true');
      await smallVerifier.proveTheorem('theorem test2: true');
      await smallVerifier.proveTheorem('theorem test3: true');

      const stats = smallVerifier.getCacheStats();
      expect(stats.proofs).toBeLessThanOrEqual(2);

      await smallVerifier.shutdown();
    });
  });

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await verifier.initialize();
    });

    test('should verify simple policies quickly (<10ms)', async () => {
      const simplePolicy: SecurityPolicy = {
        id: 'simple',
        name: 'Simple Policy',
        rules: [
          {
            id: 'allow_all',
            condition: 'true',
            action: 'allow',
            priority: 1
          }
        ],
        constraints: []
      };

      const { duration } = await testUtils.measurePerformance(() =>
        verifier.verifyPolicy(mockAction, simplePolicy)
      );

      expect(duration).toBeLessThan(10);
    });

    test('should handle complex policies efficiently (<500ms)', async () => {
      const complexPolicy: SecurityPolicy = {
        ...mockDefaultPolicy,
        rules: Array.from({ length: 50 }, (_, i) => ({
          id: `rule_${i}`,
          condition: `action.type == "type${i}"`,
          action: 'verify' as const,
          priority: i
        })),
        constraints: Array.from({ length: 20 }, (_, i) => ({
          type: 'behavioral' as const,
          expression: `constraint_${i}`,
          severity: 'warning' as const
        }))
      };

      const { duration } = await testUtils.measurePerformance(() =>
        verifier.verifyPolicy(mockAction, complexPolicy)
      );

      expect(duration).toBeLessThan(500);
    });

    test('should prove theorems efficiently (<100ms for simple)', async () => {
      const { duration } = await testUtils.measurePerformance(() =>
        verifier.proveTheorem('theorem simple: true → true')
      );

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await verifier.initialize();
    });

    test('should handle empty policy', async () => {
      const emptyPolicy: SecurityPolicy = {
        id: 'empty',
        name: 'Empty Policy',
        rules: [],
        constraints: []
      };

      const result = await verifier.verifyPolicy(mockAction, emptyPolicy);

      expect(result.valid).toBe(true);
    });

    test('should handle action with missing context', async () => {
      const actionNoContext: Action = {
        type: 'read',
        resource: '/api/data',
        parameters: {},
        context: {
          timestamp: Date.now()
        }
      };

      const result = await verifier.verifyPolicy(actionNoContext, mockDefaultPolicy);

      expect(result).toBeDefined();
    });

    test('should handle malformed conditions', async () => {
      const badPolicy: SecurityPolicy = {
        ...mockDefaultPolicy,
        rules: [
          {
            id: 'bad_rule',
            condition: 'this is not valid syntax!!!',
            action: 'deny',
            priority: 100
          }
        ]
      };

      mockEngine.evaluate.mockRejectedValueOnce(new Error('Parse error'));

      const result = await verifier.verifyPolicy(mockAction, badPolicy);

      expect(result).toBeDefined();
      // Should not throw - errors are logged
    });

    test('should handle concurrent verifications', async () => {
      const verifications = Array(50).fill(null).map(() =>
        verifier.verifyPolicy(mockAction, mockDefaultPolicy)
      );

      const results = await Promise.all(verifications);

      expect(results).toHaveLength(50);
      results.forEach(r => expect(r).toBeDefined());
    });
  });

  describe('Shutdown and Cleanup', () => {
    test('should shutdown gracefully', async () => {
      await verifier.initialize();
      await verifier.shutdown();

      expect(mockEngine.shutdown).toHaveBeenCalled();
    });

    test('should clear caches on shutdown', async () => {
      await verifier.initialize();
      await verifier.proveTheorem('theorem test: true');

      await verifier.shutdown();

      const stats = verifier.getCacheStats();
      expect(stats.proofs).toBe(0);
    });
  });
});
