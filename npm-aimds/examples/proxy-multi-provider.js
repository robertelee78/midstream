/**
 * Example: Multi-Provider AIMDS Proxy
 *
 * This example demonstrates how to protect multiple LLM providers
 * with different security policies
 */

const express = require('express');
const { createProxy } = require('../src/proxy');

const app = express();
app.use(express.json());

// OpenAI proxy with balanced strategy
const openaiProxy = createProxy({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  strategy: 'balanced',
  detection: { threshold: 0.8 },
  audit: { path: './logs/openai-audit.log' },
});

// Anthropic proxy with aggressive strategy
const anthropicProxy = createProxy({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  strategy: 'aggressive',
  detection: { threshold: 0.7 },
  audit: { path: './logs/anthropic-audit.log' },
});

// Google proxy with passive strategy (logging only)
const googleProxy = createProxy({
  provider: 'google',
  apiKey: process.env.GOOGLE_API_KEY,
  strategy: 'passive',
  detection: { threshold: 0.9 },
  audit: { path: './logs/google-audit.log' },
});

// AWS Bedrock proxy
const bedrockProxy = createProxy({
  provider: 'bedrock',
  region: process.env.AWS_REGION || 'us-east-1',
  strategy: 'balanced',
  audit: { path: './logs/bedrock-audit.log' },
});

// Route requests to appropriate proxies
app.post('/openai/v1/*', openaiProxy);
app.post('/anthropic/v1/*', anthropicProxy);
app.post('/google/v1/*', googleProxy);
app.post('/bedrock/*', bedrockProxy);

// Health check with provider status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      bedrock: !!process.env.AWS_ACCESS_KEY_ID,
    },
  });
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
  // Aggregate metrics from all proxies
  res.set('Content-Type', 'text/plain');
  res.send('# AIMDS Multi-Provider Metrics\n');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Multi-provider AIMDS proxy listening on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /openai/v1/* - OpenAI (balanced)');
  console.log('  POST /anthropic/v1/* - Anthropic (aggressive)');
  console.log('  POST /google/v1/* - Google (passive)');
  console.log('  POST /bedrock/* - AWS Bedrock (balanced)');
});

// Example requests:

// OpenAI
/*
curl -X POST http://localhost:3000/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'
*/

// Anthropic
/*
curl -X POST http://localhost:3000/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-3-opus-20240229", "messages": [{"role": "user", "content": "Hello"}], "max_tokens": 1024}'
*/

// Google
/*
curl -X POST http://localhost:3000/google/v1/models/gemini-pro:generateContent \
  -H "Content-Type: application/json" \
  -d '{"contents": [{"parts": [{"text": "Hello"}]}]}'
*/
