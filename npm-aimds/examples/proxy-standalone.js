/**
 * Example: Standalone AIMDS Proxy Server
 *
 * This example shows how to run AIMDS as a standalone proxy server
 * that can protect multiple LLM providers
 */

const { createProxyServer } = require('../src/proxy');

// Create standalone proxy server
const server = createProxyServer({
  // Server configuration
  port: 8080,
  host: '0.0.0.0',
  https: false, // Set to true for HTTPS

  // Provider configuration (can be changed dynamically)
  provider: process.env.LLM_PROVIDER || 'openai',
  apiKey: process.env.LLM_API_KEY,

  // Detection settings
  detection: {
    threshold: 0.8,
    enablePII: true,
    enableJailbreak: true,
    enablePatternMatching: true,
  },

  // Default to balanced strategy
  strategy: process.env.MITIGATION_STRATEGY || 'balanced',
  autoMitigate: true,

  // Comprehensive logging
  audit: {
    path: './logs/standalone-audit.log',
    level: 'info',
    format: 'json',
  },

  // Metrics
  metrics: {
    enabled: true,
    flushInterval: 60000,
  },

  // Connection pooling
  pool: {
    maxConnections: 100,
    timeout: 30000,
    keepAlive: true,
  },
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Standalone AIMDS Proxy Server started');
console.log('Configure your LLM client to use: http://localhost:8080');
console.log('Provider:', process.env.LLM_PROVIDER || 'openai');
console.log('Strategy:', process.env.MITIGATION_STRATEGY || 'balanced');

// Usage with OpenAI SDK:
/*
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
*/

// Usage with curl:
/*
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
*/
