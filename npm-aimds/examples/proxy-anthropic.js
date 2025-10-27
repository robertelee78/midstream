/**
 * Example: AIMDS Proxy with Anthropic Claude
 *
 * This example demonstrates how to protect Anthropic API calls with AIMDS
 */

const express = require('express');
const { createProxy } = require('../src/proxy');

const app = express();
app.use(express.json());

// Create AIMDS proxy with aggressive strategy for maximum security
const aimdsProxy = createProxy({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,

  detection: {
    threshold: 0.75, // Lower threshold = more sensitive
    enablePII: true,
    enableJailbreak: true,
    enablePatternMatching: true,
  },

  strategy: 'aggressive', // Block all threats
  autoMitigate: true,

  audit: {
    path: './logs/anthropic-audit.log',
    level: 'info',
  },

  metrics: {
    enabled: true,
  },
});

// Protected endpoint
app.post('/v1/messages', aimdsProxy);

// Get metrics endpoint
app.get('/metrics', (req, res) => {
  // In production, integrate with your metrics collector
  res.json({ message: 'Metrics endpoint' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AIMDS-protected Anthropic proxy listening on port ${PORT}`);
});

// Example request:
/*
curl -X POST http://localhost:3001/v1/messages \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "messages": [
      {
        "role": "user",
        "content": "Explain quantum computing"
      }
    ],
    "max_tokens": 1024
  }'
*/
