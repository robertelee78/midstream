/**
 * AIMDS Detect Command
 * Real-time detection of AI manipulation attempts
 */

const fs = require('fs').promises;
const chalk = require('chalk');
const ora = require('ora');
const wasmLoader = require('../utils/wasm-loader');
const formatters = require('../utils/formatters');
const { readInput, writeOutput } = require('../utils/io');

module.exports = function(program) {
  program
    .command('detect')
    .description('Real-time detection of AI manipulation attempts')
    .option('--text <string>', 'Detect manipulation in text')
    .option('--file <path>', 'Detect manipulation in file')
    .option('--stdin', 'Read from standard input')
    .option('--stream', 'Start streaming detection server')
    .option('--watch <path>', 'Watch directory for changes')
    .option('--patterns <path>', 'Custom pattern file')
    .option('--threshold <float>', 'Confidence threshold (0.0-1.0)', parseFloat, 0.8)
    .option('--mode <mode>', 'Detection mode: fast|balanced|thorough', 'balanced')
    .option('--pii', 'Also detect and sanitize PII')
    .option('--deep', 'Enable deep semantic analysis')
    .option('--format <fmt>', 'Output format: text|json|yaml|table', 'text')
    .option('--output <path>', 'Write results to file')
    .option('--highlight', 'Highlight detected patterns in output')
    .option('--summary', 'Show summary statistics only')
    .option('--max-latency <ms>', 'Maximum acceptable latency', parseInt, 10)
    .option('--batch-size <n>', 'Batch size for processing', parseInt, 1)
    .option('--parallel <n>', 'Parallel workers', parseInt)
    .action(async (options) => {
      const globalOpts = program.opts();
      const spinner = ora('Initializing AIMDS detection...').start();

      try {
        // Load WASM module
        spinner.text = 'Loading detection module...';
        await wasmLoader.loadModule('detection');

        // Read input
        spinner.text = 'Reading input...';
        const input = await getInput(options);

        if (!input) {
          throw new Error('No input provided. Use --text, --file, or --stdin');
        }

        // Run detection
        spinner.text = 'Analyzing for threats...';
        const startTime = Date.now();
        const result = await runDetection(input, options);
        const duration = Date.now() - startTime;

        spinner.succeed('Detection complete');

        // Add performance metrics
        result.performance = {
          latency_ms: duration,
          target_ms: options.maxLatency,
          meets_sla: duration <= options.maxLatency
        };

        // Format and output results
        const formatted = formatters.formatDetection(
          result,
          options.format || globalOpts.json ? 'json' : 'text',
          { highlight: options.highlight }
        );

        if (options.output) {
          await writeOutput(options.output, formatted);
          console.log(chalk.green(`Results written to ${options.output}`));
        } else {
          console.log(formatted);
        }

        // Exit with appropriate code
        const exitCode = result.analysis?.status === 'threat_detected' ? 5 : 0;
        process.exit(exitCode);

      } catch (error) {
        spinner.fail('Detection failed');
        console.error(formatters.formatError({
          code: 'DETECTION_ERROR',
          message: error.message,
          details: error.details,
          troubleshooting: [
            'Ensure WASM modules are built: npm run build:wasm',
            'Check input format and encoding',
            'Verify pattern files are accessible',
            'Try reducing threshold or changing mode'
          ]
        }, globalOpts.verbose > 0));
        process.exit(1);
      }
    });
};

/**
 * Get input from various sources
 */
async function getInput(options) {
  if (options.text) {
    return options.text;
  }

  if (options.file) {
    return await fs.readFile(options.file, 'utf8');
  }

  if (options.stdin) {
    return await readInput();
  }

  return null;
}

/**
 * Run detection analysis
 */
async function runDetection(input, options) {
  // This would call the actual WASM detection module
  // For now, return mock data structure
  const result = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    input: {
      source: options.file || 'stdin',
      size_bytes: Buffer.byteLength(input, 'utf8'),
      hash: `sha256:${input.substring(0, 16)}...`
    },
    analysis: {
      duration_ms: Math.random() * 8 + 2,
      status: 'clean',
      confidence: 0.95,
      mode: options.mode
    },
    findings: []
  };

  // Detect common manipulation patterns
  const patterns = [
    { regex: /ignore\s+previous\s+instructions/i, type: 'prompt_injection', severity: 'high' },
    { regex: /disregard\s+all\s+prior/i, type: 'prompt_injection', severity: 'high' },
    { regex: /forget\s+everything/i, type: 'jailbreak_attempt', severity: 'high' },
    { regex: /\b\d{3}-\d{2}-\d{4}\b/, type: 'pii_detected', severity: 'medium' },
    { regex: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/, type: 'pii_detected', severity: 'medium' }
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern.regex);
    if (match) {
      const index = input.indexOf(match[0]);
      const lines = input.substring(0, index).split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length;

      result.findings.push({
        type: pattern.type,
        severity: pattern.severity,
        confidence: 0.85 + Math.random() * 0.15,
        pattern: pattern.regex.source,
        matched_text: match[0],
        location: {
          line,
          column_start: col,
          column_end: col + match[0].length
        },
        recommendation: 'reject'
      });

      result.analysis.status = 'threat_detected';
    }
  }

  // Apply threshold filtering
  result.findings = result.findings.filter(f => f.confidence >= options.threshold);

  return result;
}
