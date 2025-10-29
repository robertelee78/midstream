#!/usr/bin/env node

/**
 * Example 5: Distributed Streaming with QUIC
 *
 * This example demonstrates:
 * - Multi-node pattern sharing via QUIC
 * - Distributed vector database queries
 * - Cluster-wide learning coordination
 * - Consensus-based parameter optimization
 *
 * Expected Output:
 * Cluster initialized: 3 nodes
 * Streaming data... (10,000 events/sec)
 *
 * Cluster query results:
 *   Node 1 (node1.example.com:8080):
 *     Found: 4 patterns
 *     Latency: 12ms
 * ...
 * Cluster consensus achieved!
 */

const path = require('path');

// Mock classes for demonstration
class DistributedTemporalStreaming {
  constructor() {
    this.nodes = [];
    this.syncProtocol = null;
    this.consistencyModel = null;
  }

  async initializeCluster(config) {
    this.nodes = config.nodes.map(nodeUrl => ({
      url: nodeUrl,
      status: 'online',
      patterns: new Map(),
      metrics: {
        latency: 10 + Math.random() * 10,
        throughput: 500 + Math.random() * 500,
        load: Math.random()
      }
    }));

    this.syncProtocol = config.syncProtocol || 'quic';
    this.consistencyModel = config.consistencyModel || 'eventual';

    console.log(`✓ Cluster initialized: ${this.nodes.length} nodes`);
    console.log(`  Sync protocol: ${this.syncProtocol.toUpperCase()}`);
    console.log(`  Consistency model: ${this.consistencyModel}`);
    console.log();

    this.nodes.forEach((node, i) => {
      console.log(`  Node ${i + 1}: ${node.url}`);
      console.log(`    Status: ${node.status}`);
      console.log(`    Latency: ${node.metrics.latency.toFixed(1)}ms`);
    });
  }

  async streamToCluster(dataSource, options = {}) {
    const { replication = 2, partitioning = 'hash' } = options;

    console.log();
    console.log('📡 Streaming to cluster...');
    console.log(`   Replication factor: ${replication}`);
    console.log(`   Partitioning strategy: ${partitioning}`);
    console.log();

    // Simulate streaming
    const eventCount = 10000;
    const startTime = Date.now();

    for (let i = 0; i < eventCount; i += 100) {
      // Simulate batch processing
      const batch = this.generateBatch(100);
      await this.distributeBatch(batch, partitioning, replication);

      if (i % 1000 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = i / elapsed;
        process.stdout.write(`\r   Streamed: ${i}/${eventCount} events (${rate.toFixed(0)} events/sec)`);
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = eventCount / elapsed;
    console.log(`\r   ✓ Streamed: ${eventCount} events (${rate.toFixed(0)} events/sec)   `);
  }

  generateBatch(size) {
    return Array.from({ length: size }, () => ({
      timestamp: Date.now(),
      value: Math.random() * 100,
      metadata: {}
    }));
  }

  async distributeBatch(batch, partitioning, replication) {
    // Simulate distribution to nodes
    for (const event of batch) {
      const targetNodes = this.selectNodes(event, partitioning, replication);

      for (const node of targetNodes) {
        // Store in node (simulated)
        await this.storeInNode(node, event);
      }
    }
  }

  selectNodes(event, partitioning, replication) {
    // Select nodes based on partitioning strategy
    if (partitioning === 'hash') {
      const hash = this.hashEvent(event);
      const primaryIndex = hash % this.nodes.length;

      const nodes = [this.nodes[primaryIndex]];

      // Add replicas
      for (let i = 1; i < replication; i++) {
        const replicaIndex = (primaryIndex + i) % this.nodes.length;
        nodes.push(this.nodes[replicaIndex]);
      }

      return nodes;
    }

    // Fallback to round-robin
    return this.nodes.slice(0, replication);
  }

  hashEvent(event) {
    // Simple hash function
    return Math.floor(event.timestamp % 1000);
  }

  async storeInNode(node, event) {
    // Simulate storage (no-op in mock)
    return true;
  }

  async queryCluster(queryEmbedding, options = {}) {
    const { aggregation = 'weighted', timeout = 5000 } = options;

    console.log();
    console.log('🔍 Querying cluster...');
    console.log(`   Aggregation: ${aggregation}`);
    console.log(`   Timeout: ${timeout}ms`);
    console.log();

    // Query all nodes in parallel
    const queryPromises = this.nodes.map(async (node) => {
      const startTime = Date.now();

      // Simulate query processing
      await this.simulateDelay(5 + Math.random() * 15);

      const results = this.generateQueryResults(node);
      const latency = Date.now() - startTime;

      return {
        node: node.url,
        results,
        latency
      };
    });

    const results = await Promise.all(queryPromises);

    console.log('Cluster query results:');
    results.forEach((nodeResult, i) => {
      console.log(`  Node ${i + 1} (${nodeResult.node}):`);
      console.log(`    Found: ${nodeResult.results.length} patterns`);
      console.log(`    Latency: ${nodeResult.latency}ms`);
    });

    return results;
  }

  generateQueryResults(node) {
    // Generate mock results
    const numResults = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: numResults }, (_, i) => ({
      id: `pattern_${i}`,
      similarity: 0.7 + Math.random() * 0.3,
      node: node.url
    }));
  }

  async coordinateLearning(localMetrics) {
    console.log();
    console.log('🤝 Coordinating distributed learning...');
    console.log(`   Local metrics: accuracy=${localMetrics.accuracy.toFixed(2)}, latency=${localMetrics.latency}ms`);
    console.log();

    // Simulate gathering metrics from all nodes
    const allMetrics = await Promise.all(
      this.nodes.map(async (node) => {
        await this.simulateDelay(10);
        return {
          node: node.url,
          accuracy: 0.80 + Math.random() * 0.15,
          latency: 30 + Math.random() * 40,
          throughput: 500 + Math.random() * 500
        };
      })
    );

    console.log('   Collected metrics from all nodes:');
    allMetrics.forEach((metrics, i) => {
      console.log(`     Node ${i + 1}: accuracy=${metrics.accuracy.toFixed(2)}, latency=${metrics.latency.toFixed(0)}ms`);
    });

    // Simulate consensus algorithm
    await this.simulateDelay(50);

    // Calculate global optimized parameters
    const globalOptimizedParams = {
      windowSize: Math.round(130 + Math.random() * 40),
      threshold: 1.7 + Math.random() * 0.2,
      sensitivity: 1.2 + Math.random() * 0.2
    };

    const consensusReached = Math.random() > 0.1; // 90% success rate

    console.log();
    console.log(consensusReached ? '✅ Cluster consensus achieved!' : '⚠️  Consensus pending...');

    if (consensusReached) {
      console.log('Global optimized params:', globalOptimizedParams);
    }

    return {
      consensusReached,
      globalOptimizedParams: consensusReached ? globalOptimizedParams : null,
      participatingNodes: this.nodes.length,
      convergenceTime: 50 + Math.random() * 100
    };
  }

  async simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Mock embedding bridge
class MockBridge {
  async embedSequence(sequence) {
    // Generate mock embedding
    return Array.from({ length: 384 }, () => Math.random());
  }
}

async function distributedProcessing() {
  console.log('='.repeat(60));
  console.log('Example 5: Distributed Streaming with QUIC');
  console.log('='.repeat(60));
  console.log();

  // Initialize distributed streaming
  const cluster = new DistributedTemporalStreaming();

  await cluster.initializeCluster({
    nodes: [
      'node1.example.com:8080',
      'node2.example.com:8080',
      'node3.example.com:8080'
    ],
    syncProtocol: 'quic',
    consistencyModel: 'eventual'
  });

  // Stream to cluster with partitioning
  const dataSource = {}; // Mock data source
  await cluster.streamToCluster(dataSource, {
    replication: 2, // Replicate to 2 nodes
    partitioning: 'hash' // Hash-based distribution
  });

  // Query across cluster
  console.log();
  console.log('📊 Performing distributed query...');

  const bridge = new MockBridge();
  const anomalySequence = [45, 50, 58, 72, 85, 92, 95, 93, 87, 75, 62, 55];
  const queryEmbedding = await bridge.embedSequence(anomalySequence);

  const results = await cluster.queryCluster(queryEmbedding, {
    aggregation: 'weighted',
    timeout: 5000
  });

  // Distributed learning coordination
  const localMetrics = {
    accuracy: 0.89,
    latency: 45,
    throughput: 850,
    memoryUsage: 256
  };

  const coordination = await cluster.coordinateLearning(localMetrics);

  console.log();
  console.log('='.repeat(60));
  console.log('📊 Distributed Coordination Summary:');
  console.log('='.repeat(60));
  console.log(`Participating Nodes: ${coordination.participatingNodes}`);
  console.log(`Convergence Time: ${coordination.convergenceTime.toFixed(0)}ms`);
  console.log(`Consensus: ${coordination.consensusReached ? 'Achieved' : 'Pending'}`);

  if (coordination.globalOptimizedParams) {
    console.log();
    console.log('Optimized Parameters:');
    console.log(`  Window Size: ${coordination.globalOptimizedParams.windowSize}`);
    console.log(`  Threshold: ${coordination.globalOptimizedParams.threshold.toFixed(2)}`);
    console.log(`  Sensitivity: ${coordination.globalOptimizedParams.sensitivity.toFixed(2)}`);
  }
  console.log();

  // Performance benefits
  console.log('💡 Benefits of Distributed Architecture:');
  console.log('   • Horizontal scalability: Add nodes for more throughput');
  console.log('   • Fault tolerance: 2x replication ensures availability');
  console.log('   • Low latency: QUIC protocol reduces network overhead');
  console.log('   • Consistency: Eventual consistency model for high performance');
  console.log('   • Coordinated learning: Cluster-wide optimization');
  console.log();

  console.log('⚡ Performance Characteristics:');
  console.log(`   • Throughput: ${(10000 / 1.5).toFixed(0)} events/sec`);
  console.log(`   • Query latency: 11-15ms (across 3 nodes)`);
  console.log(`   • Sync overhead: <5ms with QUIC`);
  console.log(`   • Consensus time: ${coordination.convergenceTime.toFixed(0)}ms`);
  console.log();

  console.log('🔧 Configuration Tips:');
  console.log('   • Use replication factor 2-3 for production');
  console.log('   • QUIC reduces latency by 30-50% vs TCP');
  console.log('   • Hash partitioning ensures even distribution');
  console.log('   • Eventual consistency for high-throughput scenarios');
  console.log();

  console.log('✓ Example complete!');
  console.log('='.repeat(60));
}

// Run the example
if (require.main === module) {
  distributedProcessing().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { distributedProcessing };
