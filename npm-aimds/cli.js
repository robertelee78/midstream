#!/usr/bin/env node

/**
 * AIMDS QUIC Server CLI
 */

import { createQuicServer } from './src/quic-server.js';
import { cpus } from 'os';

const args = process.argv.slice(2);
const config = {
  port: 3000,
  workers: cpus().length,
  detection: { threshold: 0.8 },
  pool: { maxConnections: 10000 },
  logging: { level: 'info' }
};

// Parse CLI arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--help' || arg === '-h') {
    console.log(`
AIMDS QUIC Server CLI

Usage:
  aimds-quic [options]

Options:
  --port, -p <port>          Server port (default: 3000)
  --workers, -w <count>      Worker threads (default: CPU count)
  --threshold, -t <value>    Detection threshold 0-1 (default: 0.8)
  --max-connections <count>  Max connections (default: 10000)
  --log-level <level>        Log level: debug|info|warn|error (default: info)
  --help, -h                 Show this help

Environment Variables:
  PORT                Server port
  WORKERS             Worker thread count
  THRESHOLD           Detection threshold
  MAX_CONNECTIONS     Maximum connections
  LOG_LEVEL           Logging level

Examples:
  aimds-quic --port 8080 --workers 4
  PORT=8080 WORKERS=4 aimds-quic
  aimds-quic --threshold 0.9 --log-level debug
`);
    process.exit(0);
  } else if (arg === '--port' || arg === '-p') {
    config.port = parseInt(args[++i]);
  } else if (arg === '--workers' || arg === '-w') {
    config.workers = parseInt(args[++i]);
  } else if (arg === '--threshold' || arg === '-t') {
    config.detection.threshold = parseFloat(args[++i]);
  } else if (arg === '--max-connections') {
    config.pool.maxConnections = parseInt(args[++i]);
  } else if (arg === '--log-level') {
    config.logging.level = args[++i];
  }
}

// Override with environment variables
if (process.env.PORT) config.port = parseInt(process.env.PORT);
if (process.env.WORKERS) config.workers = parseInt(process.env.WORKERS);
if (process.env.THRESHOLD) config.detection.threshold = parseFloat(process.env.THRESHOLD);
if (process.env.MAX_CONNECTIONS) config.pool.maxConnections = parseInt(process.env.MAX_CONNECTIONS);
if (process.env.LOG_LEVEL) config.logging.level = process.env.LOG_LEVEL;

console.log('Starting AIMDS QUIC Server...');
console.log(`Port: ${config.port}`);
console.log(`Workers: ${config.workers}`);
console.log(`Threshold: ${config.detection.threshold}`);
console.log('');

const server = await createQuicServer(config);

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}, shutting down...`);
  await server.stop();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
