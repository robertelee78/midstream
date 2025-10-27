#!/usr/bin/env node

/**
 * Basic AIMDS QUIC Server Example
 * Demonstrates simple server setup and usage
 */

import { createQuicServer } from '../src/quic-server.js';

async function main() {
  console.log('Starting AIMDS QUIC Server...\n');

  // Create server with custom configuration
  const server = await createQuicServer({
    port: 3000,
    host: '0.0.0.0',
    workers: 4, // Use 4 worker threads
    detection: {
      threshold: 0.8 // Detection threshold
    },
    pool: {
      maxConnections: 5000
    },
    logging: {
      level: 'info'
    }
  });

  console.log('✓ Server started successfully!\n');
  console.log('Available endpoints:');
  console.log('  POST   http://localhost:3000/detect   - Single detection');
  console.log('  POST   http://localhost:3000/stream   - Streaming detection');
  console.log('  GET    http://localhost:3000/metrics  - Prometheus metrics');
  console.log('  GET    http://localhost:3000/health   - Health check\n');

  // Log stats every 10 seconds
  setInterval(() => {
    const stats = server.getStats();
    console.log(`[Stats] Connections: ${stats.connections.active}/${stats.connections.max} | Uptime: ${Math.floor(stats.uptime)}s`);
  }, 10000);

  // Handle events
  server.on('ready', () => {
    console.log('Server ready to accept connections');
  });

  server.on('stopped', () => {
    console.log('Server stopped');
    process.exit(0);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await server.stop();
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
  });
}

main().catch(console.error);
