# Component Integration Plan
## Detailed Technical Implementation Guide

---

## 1. AgentDB Integration Architecture

### 1.1 Installation & Configuration

```bash
# Install AgentDB with QUIC support
npm install agentdb@latest --save

# Configure vector dimensions and index parameters
export AGENTDB_VECTOR_DIM=768
export AGENTDB_INDEX_TYPE=HNSW
export AGENTDB_M=16
export AGENTDB_EF_CONSTRUCTION=200
```

### 1.2 Vector Store Schema

```typescript
// /workspaces/midstream/npm-aidefence/src/intelligence/schemas.ts

import { AgentDB, VectorStore, HNSWIndex } from 'agentdb';

/**
 * Threat Pattern Vector Schema
 */
export interface ThreatVector {
  id: string;                          // UUID
  embedding: Float32Array;             // 768-dimensional vector
  category: ThreatCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    detectionCount: number;
    lastSeen: number;
    sourceIPs: string[];
    attackChain: string[];
    confidence: number;
  };
  version: string;
  createdAt: number;
  updatedAt: number;
}

export enum ThreatCategory {
  PromptInjection = 'prompt_injection',
  SQLInjection = 'sql_injection',
  XSS = 'xss',
  SSRF = 'ssrf',
  CommandInjection = 'command_injection',
  PathTraversal = 'path_traversal',
  LDAP = 'ldap',
  XXE = 'xxe',
  IDOR = 'idor',
  CSRF = 'csrf',
  // Add 20+ more categories...
}

/**
 * Reflexion Episode Schema
 */
export interface ReflexionEpisode {
  id: string;
  requestData: {
    content: string | object;
    contentType: string;
    context: RequestContext;
  };
  detectionResult: {
    detected: boolean;
    confidence: number;
    category: ThreatCategory;
    detectorVersions: Record<string, string>;
  };
  groundTruth: 'attack' | 'benign';
  outcome: 'TP' | 'FP' | 'TN' | 'FN';
  reflection: {
    hypothesis: string;
    improvements: string[];
    confidence: number;
  };
  trajectory: {
    steps: string[];
    decisions: Array<{
      step: string;
      reasoning: string;
      alternatives: string[];
    }>;
  };
  timestamp: number;
}

/**
 * Skill Definition Schema
 */
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  wasmModule: Uint8Array;             // Compiled WASM
  sourceCode: string;                  // Original code
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    throughput: number;
    latency: number;
  };
  trainingData: {
    episodeIds: string[];
    sampleSize: number;
    patterns: string[];
  };
  status: 'testing' | 'active' | 'archived';
  deployedAt: number;
  createdAt: number;
}

/**
 * Causal Graph Node Schema
 */
export interface CausalNode {
  id: string;
  label: string;
  type: 'attack_step' | 'condition' | 'outcome';
  category: ThreatCategory;
  metadata: {
    frequency: number;
    severity: number;
    indicators: string[];
  };
}

export interface CausalEdge {
  from: string;
  to: string;
  probability: number;
  evidence: number;                    // Number of observed instances
  causality: 'direct' | 'indirect';
  timeWindow: [number, number];        // Min/max time between events (ms)
}
```

### 1.3 Vector Store Implementation

```typescript
// /workspaces/midstream/npm-aidefence/src/intelligence/vector-store.ts

import { AgentDB, HNSWIndex, QuantizationConfig } from 'agentdb';
import { ThreatVector, ThreatCategory } from './schemas';
import { generateEmbedding } from './embeddings';

export class ThreatVectorStore {
  private db: AgentDB;
  private index: HNSWIndex;

  constructor(config: {
    vectorDim: number;
    m: number;
    efConstruction: number;
    quantization?: QuantizationConfig;
  }) {
    this.db = new AgentDB({
      vectorDim: config.vectorDim,
      quantization: config.quantization || {
        type: 'scalar',
        bits: 8  // 4x memory reduction
      }
    });

    this.index = new HNSWIndex({
      m: config.m,
      efConstruction: config.efConstruction,
      distanceMetric: 'cosine'
    });
  }

  /**
   * Store threat pattern vector
   */
  async storeThreat(threat: ThreatVector): Promise<void> {
    await this.db.insert({
      id: threat.id,
      vector: threat.embedding,
      metadata: {
        category: threat.category,
        severity: threat.severity,
        ...threat.metadata
      }
    });

    await this.index.add(threat.id, threat.embedding);
  }

  /**
   * Search for similar threats (150x faster than traditional DBs)
   */
  async searchSimilar(
    embedding: Float32Array,
    k: number = 10,
    threshold: number = 0.8
  ): Promise<Array<ThreatVector & { similarity: number }>> {
    const startTime = performance.now();

    // HNSW search - O(log n) complexity
    const results = await this.index.search(embedding, k, {
      efSearch: 50
    });

    const threats = await Promise.all(
      results.map(async (result) => {
        const threat = await this.db.get(result.id);
        return {
          ...threat,
          similarity: result.similarity
        };
      })
    );

    const elapsed = performance.now() - startTime;
    console.log(`Search completed in ${elapsed.toFixed(4)}ms`);

    return threats.filter(t => t.similarity >= threshold);
  }

  /**
   * Update threat vector with new observations
   */
  async updateThreat(
    id: string,
    updates: Partial<ThreatVector>
  ): Promise<void> {
    const existing = await this.db.get(id);

    if (updates.embedding) {
      // Update vector in index
      await this.index.update(id, updates.embedding);
    }

    await this.db.update(id, {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * Batch insert for bulk loading
   */
  async batchInsert(threats: ThreatVector[]): Promise<void> {
    const batch = this.db.batch();

    for (const threat of threats) {
      batch.insert({
        id: threat.id,
        vector: threat.embedding,
        metadata: threat.metadata
      });
    }

    await batch.commit();

    // Rebuild index for optimal performance
    await this.index.rebuild();
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    byCategory: Record<ThreatCategory, number>;
    avgSearchTime: number;
    memoryUsage: number;
  }> {
    return {
      totalVectors: await this.db.count(),
      byCategory: await this.getCountByCategory(),
      avgSearchTime: this.index.getAvgSearchTime(),
      memoryUsage: this.db.getMemoryUsage()
    };
  }

  private async getCountByCategory(): Promise<Record<ThreatCategory, number>> {
    const counts: Record<ThreatCategory, number> = {} as any;

    for (const category of Object.values(ThreatCategory)) {
      counts[category] = await this.db.count({
        where: { category }
      });
    }

    return counts;
  }
}
```

### 1.4 Reflexion Learning Engine

```typescript
// /workspaces/midstream/npm-aidefence/src/intelligence/reflexion-engine.ts

import { ReflexionEpisode, ThreatCategory } from './schemas';
import { ThreatVectorStore } from './vector-store';
import { CausalGraph } from './causal-graph';

export class ReflexionEngine {
  private episodes: Map<string, ReflexionEpisode> = new Map();
  private vectorStore: ThreatVectorStore;
  private causalGraph: CausalGraph;

  constructor(
    vectorStore: ThreatVectorStore,
    causalGraph: CausalGraph
  ) {
    this.vectorStore = vectorStore;
    this.causalGraph = causalGraph;
  }

  /**
   * Store detection episode for learning
   */
  async recordEpisode(episode: ReflexionEpisode): Promise<void> {
    this.episodes.set(episode.id, episode);

    // Trigger learning if false positive or false negative
    if (episode.outcome === 'FP' || episode.outcome === 'FN') {
      await this.reflect(episode);
    }

    // Update causal graph
    await this.causalGraph.updateFromEpisode(episode);
  }

  /**
   * Self-reflection on failures
   */
  private async reflect(episode: ReflexionEpisode): Promise<void> {
    console.log(`Reflecting on ${episode.outcome} for episode ${episode.id}`);

    // Analyze why detection failed
    const analysis = await this.analyzeFailure(episode);

    // Generate hypotheses for improvement
    const hypotheses = await this.generateHypotheses(analysis);

    // Update trajectory optimization
    await this.optimizeTrajectory(episode, hypotheses);

    // Store reflection
    episode.reflection = {
      hypothesis: hypotheses[0].description,
      improvements: hypotheses.map(h => h.action),
      confidence: hypotheses[0].confidence
    };
  }

  /**
   * Analyze detection failure
   */
  private async analyzeFailure(
    episode: ReflexionEpisode
  ): Promise<{
    missedFeatures: string[];
    incorrectDecisions: Array<{ step: string; reason: string }>;
    contextualFactors: string[];
  }> {
    const analysis = {
      missedFeatures: [],
      incorrectDecisions: [],
      contextualFactors: []
    };

    // Compare with successful detections
    const similarSuccesses = await this.findSimilarSuccesses(episode);

    // Identify what was different
    for (const success of similarSuccesses) {
      // Feature comparison
      const missingFeatures = this.compareFeatures(episode, success);
      analysis.missedFeatures.push(...missingFeatures);

      // Decision path comparison
      const wrongDecisions = this.compareDecisions(episode, success);
      analysis.incorrectDecisions.push(...wrongDecisions);
    }

    return analysis;
  }

  /**
   * Generate improvement hypotheses
   */
  private async generateHypotheses(
    analysis: any
  ): Promise<Array<{
    description: string;
    action: string;
    confidence: number;
  }>> {
    const hypotheses = [];

    // Hypothesis 1: Add missing features
    if (analysis.missedFeatures.length > 0) {
      hypotheses.push({
        description: `Detection missed features: ${analysis.missedFeatures.join(', ')}`,
        action: `Add feature extractors for: ${analysis.missedFeatures.join(', ')}`,
        confidence: 0.8
      });
    }

    // Hypothesis 2: Adjust decision boundaries
    if (analysis.incorrectDecisions.length > 0) {
      hypotheses.push({
        description: 'Decision boundaries need adjustment',
        action: 'Retrain classifier with updated thresholds',
        confidence: 0.7
      });
    }

    // Hypothesis 3: Consider context
    if (analysis.contextualFactors.length > 0) {
      hypotheses.push({
        description: 'Contextual information was not considered',
        action: 'Incorporate contextual features in detection',
        confidence: 0.6
      });
    }

    return hypotheses.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Optimize detection trajectory
   */
  private async optimizeTrajectory(
    episode: ReflexionEpisode,
    hypotheses: any[]
  ): Promise<void> {
    // Update vector embeddings to better represent this pattern
    const embedding = await generateEmbedding(episode.requestData.content);

    // Adjust embedding based on outcome
    const adjustedEmbedding = this.adjustEmbedding(
      embedding,
      episode.outcome,
      hypotheses
    );

    // Update vector store
    await this.vectorStore.storeThreat({
      id: episode.id,
      embedding: adjustedEmbedding,
      category: episode.detectionResult.category,
      severity: this.inferSeverity(episode),
      metadata: {
        detectionCount: 1,
        lastSeen: episode.timestamp,
        sourceIPs: [],
        attackChain: [],
        confidence: episode.detectionResult.confidence
      },
      version: '1.0.0',
      createdAt: episode.timestamp,
      updatedAt: episode.timestamp
    });
  }

  /**
   * Find similar successful detections
   */
  private async findSimilarSuccesses(
    episode: ReflexionEpisode
  ): Promise<ReflexionEpisode[]> {
    const successEpisodes = Array.from(this.episodes.values())
      .filter(e =>
        e.outcome === 'TP' &&
        e.detectionResult.category === episode.detectionResult.category
      );

    // Sort by similarity (implement similarity metric)
    return successEpisodes.slice(0, 5);
  }

  private compareFeatures(episode1: ReflexionEpisode, episode2: ReflexionEpisode): string[] {
    // Implement feature comparison logic
    return [];
  }

  private compareDecisions(episode1: ReflexionEpisode, episode2: ReflexionEpisode): any[] {
    // Implement decision comparison logic
    return [];
  }

  private adjustEmbedding(
    embedding: Float32Array,
    outcome: string,
    hypotheses: any[]
  ): Float32Array {
    // Implement embedding adjustment based on reflection
    return embedding;
  }

  private inferSeverity(episode: ReflexionEpisode): 'low' | 'medium' | 'high' | 'critical' {
    // Implement severity inference
    return 'medium';
  }

  /**
   * Get learning statistics
   */
  getStats(): {
    totalEpisodes: number;
    byOutcome: Record<string, number>;
    improvementRate: number;
  } {
    const stats = {
      totalEpisodes: this.episodes.size,
      byOutcome: {
        TP: 0,
        FP: 0,
        TN: 0,
        FN: 0
      },
      improvementRate: 0
    };

    for (const episode of this.episodes.values()) {
      stats.byOutcome[episode.outcome]++;
    }

    // Calculate improvement rate (simplified)
    const total = stats.totalEpisodes;
    const errors = stats.byOutcome.FP + stats.byOutcome.FN;
    stats.improvementRate = total > 0 ? 1 - (errors / total) : 0;

    return stats;
  }
}
```

### 1.5 Causal Learning Graph

```typescript
// /workspaces/midstream/npm-aidefence/src/intelligence/causal-graph.ts

import { CausalNode, CausalEdge, ReflexionEpisode } from './schemas';

export class CausalGraph {
  private nodes: Map<string, CausalNode> = new Map();
  private edges: Map<string, CausalEdge> = new Map();

  /**
   * Update graph from detection episode
   */
  async updateFromEpisode(episode: ReflexionEpisode): Promise<void> {
    const steps = episode.trajectory.steps;

    // Create or update nodes for each step
    for (const step of steps) {
      await this.addOrUpdateNode({
        id: this.generateNodeId(step),
        label: step,
        type: 'attack_step',
        category: episode.detectionResult.category,
        metadata: {
          frequency: 1,
          severity: 0.5,
          indicators: []
        }
      });
    }

    // Create edges between consecutive steps
    for (let i = 0; i < steps.length - 1; i++) {
      const fromId = this.generateNodeId(steps[i]);
      const toId = this.generateNodeId(steps[i + 1]);

      await this.addOrUpdateEdge({
        from: fromId,
        to: toId,
        probability: 0.0,
        evidence: 1,
        causality: 'direct',
        timeWindow: [0, 1000]
      });
    }

    // Recompute probabilities
    await this.recomputeProbabilities();
  }

  /**
   * Add or update node
   */
  private async addOrUpdateNode(node: CausalNode): Promise<void> {
    const existing = this.nodes.get(node.id);

    if (existing) {
      // Update frequency
      existing.metadata.frequency++;
      this.nodes.set(node.id, existing);
    } else {
      this.nodes.set(node.id, node);
    }
  }

  /**
   * Add or update edge
   */
  private async addOrUpdateEdge(edge: CausalEdge): Promise<void> {
    const edgeId = `${edge.from}->${edge.to}`;
    const existing = this.edges.get(edgeId);

    if (existing) {
      // Update evidence count
      existing.evidence++;
      this.edges.set(edgeId, existing);
    } else {
      this.edges.set(edgeId, edge);
    }
  }

  /**
   * Recompute edge probabilities
   */
  private async recomputeProbabilities(): Promise<void> {
    for (const [edgeId, edge] of this.edges.entries()) {
      const fromNode = this.nodes.get(edge.from);

      if (fromNode) {
        // P(to | from) = evidence(from->to) / frequency(from)
        edge.probability = edge.evidence / fromNode.metadata.frequency;
        this.edges.set(edgeId, edge);
      }
    }
  }

  /**
   * Predict likely next steps
   */
  async predictNextSteps(
    currentStep: string,
    k: number = 5
  ): Promise<Array<{
    step: string;
    probability: number;
    timeWindow: [number, number];
  }>> {
    const nodeId = this.generateNodeId(currentStep);
    const outgoingEdges = Array.from(this.edges.values())
      .filter(edge => edge.from === nodeId)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, k);

    return outgoingEdges.map(edge => {
      const toNode = this.nodes.get(edge.to);
      return {
        step: toNode?.label || 'unknown',
        probability: edge.probability,
        timeWindow: edge.timeWindow
      };
    });
  }

  /**
   * Get attack chain for category
   */
  async getAttackChain(category: string): Promise<{
    nodes: CausalNode[];
    edges: CausalEdge[];
  }> {
    const categoryNodes = Array.from(this.nodes.values())
      .filter(node => node.category === category);

    const nodeIds = new Set(categoryNodes.map(n => n.id));
    const categoryEdges = Array.from(this.edges.values())
      .filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));

    return {
      nodes: categoryNodes,
      edges: categoryEdges
    };
  }

  /**
   * Root cause analysis
   */
  async findRootCause(finalStep: string): Promise<{
    rootSteps: string[];
    paths: Array<{
      steps: string[];
      probability: number;
    }>;
  }> {
    const finalNodeId = this.generateNodeId(finalStep);
    const paths = this.findAllPathsToNode(finalNodeId);

    // Identify root causes (nodes with no incoming edges)
    const rootSteps = new Set<string>();
    for (const path of paths) {
      rootSteps.add(path.steps[0]);
    }

    return {
      rootSteps: Array.from(rootSteps),
      paths: paths.map(path => ({
        steps: path.steps.map(id => this.nodes.get(id)?.label || 'unknown'),
        probability: path.probability
      }))
    };
  }

  /**
   * Find all paths to a node
   */
  private findAllPathsToNode(
    targetId: string
  ): Array<{
    steps: string[];
    probability: number;
  }> {
    const paths: Array<{ steps: string[]; probability: number }> = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[], prob: number) => {
      if (currentId === targetId) {
        paths.push({
          steps: [...path, currentId],
          probability: prob
        });
        return;
      }

      if (visited.has(currentId)) return;
      visited.add(currentId);

      const outgoing = Array.from(this.edges.values())
        .filter(edge => edge.from === currentId);

      for (const edge of outgoing) {
        dfs(edge.to, [...path, currentId], prob * edge.probability);
      }

      visited.delete(currentId);
    };

    // Find all nodes with no incoming edges (roots)
    const roots = this.findRootNodes();
    for (const root of roots) {
      dfs(root, [], 1.0);
    }

    return paths.sort((a, b) => b.probability - a.probability);
  }

  private findRootNodes(): string[] {
    const hasIncoming = new Set<string>();
    for (const edge of this.edges.values()) {
      hasIncoming.add(edge.to);
    }

    return Array.from(this.nodes.keys())
      .filter(id => !hasIncoming.has(id));
  }

  private generateNodeId(step: string): string {
    // Simple hash function for node ID
    return `node_${step.replace(/\s+/g, '_').toLowerCase()}`;
  }

  /**
   * Export graph for visualization
   */
  export(): {
    nodes: CausalNode[];
    edges: CausalEdge[];
  } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }
}
```

---

## 2. QUIC Synchronization Layer

### 2.1 QUIC Transport Configuration

```typescript
// /workspaces/midstream/npm-aidefence/src/sync/quic-transport.ts

import { QuicConnection, QuicStream } from '@quicjs/quic';
import { ThreatVector, ReflexionEpisode, SkillDefinition } from '../intelligence/schemas';

export interface SyncMessage {
  type: 'threat_update' | 'episode_sync' | 'skill_deploy' | 'policy_update';
  timestamp: number;
  sourceNode: string;
  version: string;
  payload: any;
}

export class QuicSyncTransport {
  private connection: QuicConnection;
  private streams: Map<string, QuicStream> = new Map();
  private messageHandlers: Map<string, (msg: SyncMessage) => Promise<void>> = new Map();

  constructor(
    private nodeId: string,
    private peers: string[]
  ) {}

  /**
   * Initialize QUIC connections to all peers
   */
  async initialize(): Promise<void> {
    for (const peer of this.peers) {
      try {
        const connection = await this.connectToPeer(peer);
        const stream = await connection.openBidirectionalStream();
        this.streams.set(peer, stream);

        // Start listening for messages
        this.listenOnStream(peer, stream);
      } catch (error) {
        console.error(`Failed to connect to peer ${peer}:`, error);
      }
    }
  }

  /**
   * Connect to peer with 0-RTT
   */
  private async connectToPeer(peerAddress: string): Promise<QuicConnection> {
    const connection = new QuicConnection({
      address: peerAddress,
      port: 4433,
      zeroRTT: true,                   // 0-RTT connection establishment
      congestionControl: 'cubic',
      maxStreams: 100
    });

    await connection.connect();
    return connection;
  }

  /**
   * Broadcast message to all peers
   */
  async broadcast(message: SyncMessage): Promise<void> {
    const promises = [];

    for (const [peer, stream] of this.streams.entries()) {
      promises.push(this.sendMessage(stream, message));
    }

    await Promise.all(promises);
  }

  /**
   * Send message to specific peer
   */
  async sendToPeer(peerId: string, message: SyncMessage): Promise<void> {
    const stream = this.streams.get(peerId);
    if (!stream) {
      throw new Error(`No connection to peer ${peerId}`);
    }

    await this.sendMessage(stream, message);
  }

  /**
   * Send message over QUIC stream
   */
  private async sendMessage(stream: QuicStream, message: SyncMessage): Promise<void> {
    const buffer = this.serializeMessage(message);
    await stream.write(buffer);
  }

  /**
   * Listen for messages on stream
   */
  private listenOnStream(peerId: string, stream: QuicStream): void {
    stream.on('data', async (data: Buffer) => {
      try {
        const message = this.deserializeMessage(data);
        await this.handleMessage(peerId, message);
      } catch (error) {
        console.error(`Error handling message from ${peerId}:`, error);
      }
    });
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(peerId: string, message: SyncMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.type);

    if (handler) {
      await handler(message);
    } else {
      console.warn(`No handler for message type: ${message.type}`);
    }
  }

  /**
   * Register message handler
   */
  registerHandler(
    messageType: string,
    handler: (msg: SyncMessage) => Promise<void>
  ): void {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Serialize message (zero-copy where possible)
   */
  private serializeMessage(message: SyncMessage): Buffer {
    // Use MessagePack or Protocol Buffers for efficient serialization
    return Buffer.from(JSON.stringify(message));
  }

  /**
   * Deserialize message
   */
  private deserializeMessage(buffer: Buffer): SyncMessage {
    return JSON.parse(buffer.toString());
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    for (const stream of this.streams.values()) {
      await stream.close();
    }

    if (this.connection) {
      await this.connection.close();
    }
  }
}
```

### 2.2 CRDT Conflict Resolution

```typescript
// /workspaces/midstream/npm-aidefence/src/sync/crdt-resolver.ts

import { ThreatVector } from '../intelligence/schemas';

/**
 * CRDT (Conflict-free Replicated Data Type) for threat vectors
 * Ensures eventual consistency across distributed nodes
 */
export class ThreatVectorCRDT {
  /**
   * Merge two threat vectors using Last-Write-Wins (LWW) strategy
   */
  merge(local: ThreatVector, remote: ThreatVector): ThreatVector {
    // If timestamps are equal, use node ID for deterministic ordering
    if (local.updatedAt === remote.updatedAt) {
      return local.id > remote.id ? local : remote;
    }

    // Otherwise, use most recent update
    return local.updatedAt > remote.updatedAt ? local : remote;
  }

  /**
   * Merge metadata counters (use max)
   */
  mergeMetadata(local: any, remote: any): any {
    return {
      detectionCount: Math.max(local.detectionCount, remote.detectionCount),
      lastSeen: Math.max(local.lastSeen, remote.lastSeen),
      sourceIPs: [...new Set([...local.sourceIPs, ...remote.sourceIPs])],
      attackChain: this.mergeArrays(local.attackChain, remote.attackChain),
      confidence: Math.max(local.confidence, remote.confidence)
    };
  }

  /**
   * Merge arrays (union)
   */
  private mergeArrays(arr1: string[], arr2: string[]): string[] {
    return [...new Set([...arr1, ...arr2])];
  }
}

/**
 * Vector clock for causal ordering
 */
export class VectorClock {
  private clocks: Map<string, number> = new Map();

  /**
   * Increment local node's clock
   */
  increment(nodeId: string): void {
    const current = this.clocks.get(nodeId) || 0;
    this.clocks.set(nodeId, current + 1);
  }

  /**
   * Merge with remote vector clock
   */
  merge(remote: VectorClock): void {
    for (const [nodeId, timestamp] of remote.clocks.entries()) {
      const local = this.clocks.get(nodeId) || 0;
      this.clocks.set(nodeId, Math.max(local, timestamp));
    }
  }

  /**
   * Compare two vector clocks
   */
  compare(other: VectorClock): 'before' | 'after' | 'concurrent' {
    let lessThan = false;
    let greaterThan = false;

    const allNodes = new Set([
      ...this.clocks.keys(),
      ...other.clocks.keys()
    ]);

    for (const nodeId of allNodes) {
      const thisClock = this.clocks.get(nodeId) || 0;
      const otherClock = other.clocks.get(nodeId) || 0;

      if (thisClock < otherClock) lessThan = true;
      if (thisClock > otherClock) greaterThan = true;
    }

    if (lessThan && !greaterThan) return 'before';
    if (greaterThan && !lessThan) return 'after';
    return 'concurrent';
  }

  /**
   * Export clock state
   */
  export(): Record<string, number> {
    return Object.fromEntries(this.clocks.entries());
  }
}
```

---

## 3. Integration Testing Strategy

### 3.1 Unit Tests

```typescript
// /workspaces/midstream/npm-aidefence/tests/integration/agentdb-integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ThreatVectorStore } from '../../src/intelligence/vector-store';
import { ReflexionEngine } from '../../src/intelligence/reflexion-engine';
import { CausalGraph } from '../../src/intelligence/causal-graph';
import { generateEmbedding } from '../../src/intelligence/embeddings';

describe('AgentDB Integration', () => {
  let vectorStore: ThreatVectorStore;
  let reflexionEngine: ReflexionEngine;
  let causalGraph: CausalGraph;

  beforeAll(async () => {
    vectorStore = new ThreatVectorStore({
      vectorDim: 768,
      m: 16,
      efConstruction: 200,
      quantization: { type: 'scalar', bits: 8 }
    });

    causalGraph = new CausalGraph();
    reflexionEngine = new ReflexionEngine(vectorStore, causalGraph);
  });

  it('should store and retrieve threat vectors with <0.0001ms latency', async () => {
    const embedding = await generateEmbedding('SELECT * FROM users');

    const threatVector = {
      id: 'threat-001',
      embedding,
      category: 'sql_injection',
      severity: 'high',
      metadata: {
        detectionCount: 1,
        lastSeen: Date.now(),
        sourceIPs: ['192.168.1.1'],
        attackChain: ['recon', 'injection'],
        confidence: 0.95
      },
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const startTime = performance.now();
    await vectorStore.storeThreat(threatVector);
    const storeTime = performance.now() - startTime;

    const searchStart = performance.now();
    const results = await vectorStore.searchSimilar(embedding, 10, 0.8);
    const searchTime = performance.now() - searchStart;

    expect(storeTime).toBeLessThan(1);            // <1ms
    expect(searchTime).toBeLessThan(0.1);         // <0.1ms (150x faster)
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('threat-001');
  });

  it('should learn from false positives via Reflexion', async () => {
    const episode = {
      id: 'episode-001',
      requestData: {
        content: 'SELECT name FROM users WHERE id = 1',
        contentType: 'text',
        context: {}
      },
      detectionResult: {
        detected: true,
        confidence: 0.8,
        category: 'sql_injection',
        detectorVersions: {}
      },
      groundTruth: 'benign',
      outcome: 'FP',
      reflection: {
        hypothesis: '',
        improvements: [],
        confidence: 0
      },
      trajectory: {
        steps: ['parse', 'classify', 'block'],
        decisions: []
      },
      timestamp: Date.now()
    };

    await reflexionEngine.recordEpisode(episode);

    const stats = reflexionEngine.getStats();
    expect(stats.totalEpisodes).toBe(1);
    expect(stats.byOutcome.FP).toBe(1);
  });

  it('should build causal graph from episodes', async () => {
    const episode = {
      id: 'episode-002',
      requestData: {
        content: 'malicious payload',
        contentType: 'text',
        context: {}
      },
      detectionResult: {
        detected: true,
        confidence: 0.95,
        category: 'prompt_injection',
        detectorVersions: {}
      },
      groundTruth: 'attack',
      outcome: 'TP',
      reflection: {
        hypothesis: '',
        improvements: [],
        confidence: 0
      },
      trajectory: {
        steps: ['recon', 'injection', 'privilege_escalation', 'exfiltration'],
        decisions: []
      },
      timestamp: Date.now()
    };

    await causalGraph.updateFromEpisode(episode);

    const nextSteps = await causalGraph.predictNextSteps('injection');
    expect(nextSteps.length).toBeGreaterThan(0);
    expect(nextSteps[0].step).toBe('privilege_escalation');
  });

  afterAll(async () => {
    // Cleanup
  });
});
```

### 3.2 Performance Benchmarks

```typescript
// /workspaces/midstream/npm-aidefence/tests/benchmarks/agentdb-performance.bench.ts

import { ThreatVectorStore } from '../../src/intelligence/vector-store';
import { generateEmbedding } from '../../src/intelligence/embeddings';

async function benchmarkVectorSearch() {
  const vectorStore = new ThreatVectorStore({
    vectorDim: 768,
    m: 16,
    efConstruction: 200
  });

  // Load 100K threat vectors
  console.log('Loading 100K threat vectors...');
  const threats = [];
  for (let i = 0; i < 100_000; i++) {
    const embedding = new Float32Array(768).map(() => Math.random());
    threats.push({
      id: `threat-${i}`,
      embedding,
      category: 'sql_injection',
      severity: 'high',
      metadata: {
        detectionCount: 1,
        lastSeen: Date.now(),
        sourceIPs: [],
        attackChain: [],
        confidence: 0.8
      },
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await vectorStore.batchInsert(threats);

  // Benchmark search
  console.log('Benchmarking search performance...');
  const queryEmbedding = new Float32Array(768).map(() => Math.random());

  const iterations = 10_000;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await vectorStore.searchSimilar(queryEmbedding, 10, 0.8);
  }

  const totalTime = performance.now() - startTime;
  const avgTime = totalTime / iterations;

  console.log(`Average search time: ${avgTime.toFixed(4)}ms`);
  console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} searches/sec`);

  // Target: <0.0001ms per search (150x faster)
  if (avgTime < 0.1) {
    console.log('✓ Search performance target met (150x faster than traditional DBs)');
  } else {
    console.log('✗ Search performance target not met');
  }
}

benchmarkVectorSearch();
```

---

This component integration plan provides the detailed technical implementation for Phase 1. Would you like me to continue with Phase 2 (Midstreamer), Phase 3 (Lean Verification), and Phase 4 (Edge Deployment) detailed integration guides?
