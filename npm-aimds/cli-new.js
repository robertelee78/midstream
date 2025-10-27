#!/usr/bin/env node

/**
 * AIMDS CLI Entry Point
 * AI Manipulation Defense System command-line interface
 * Provides real-time detection, analysis, verification, and response
 */

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('./package.json');

// Import command handlers
const detectCommand = require('./src/commands/detect');
const analyzeCommand = require('./src/commands/analyze');
const verifyCommand = require('./src/commands/verify');
const respondCommand = require('./src/commands/respond');
const streamCommand = require('./src/commands/stream');
const watchCommand = require('./src/commands/watch');
const benchmarkCommand = require('./src/commands/benchmark');
const testCommand = require('./src/commands/test');
const metricsCommand = require('./src/commands/metrics');
const configCommand = require('./src/commands/config');

// Configure main program
program
  .name('aimds')
  .description('AI Manipulation Defense System - Real-time AI security')
  .version(pkg.version)
  .option('-c, --config <path>', 'configuration file', '.aimds.yaml')
  .option('-q, --quiet', 'suppress non-essential output')
  .option('-v, --verbose', 'verbose logging', (v, total) => total + 1, 0)
  .option('--json', 'output in JSON format')
  .option('--no-color', 'disable colored output');

// Register commands - each command is a function that adds itself to the program
if (typeof detectCommand === 'function') detectCommand(program);
if (typeof analyzeCommand === 'function') analyzeCommand(program);
if (typeof verifyCommand === 'function') verifyCommand(program);
if (typeof respondCommand === 'function') respondCommand(program);
if (typeof streamCommand === 'function') streamCommand(program);
if (typeof watchCommand === 'function') watchCommand(program);
if (typeof benchmarkCommand === 'function') benchmarkCommand(program);
if (typeof testCommand === 'function') testCommand(program);
if (typeof metricsCommand === 'function') metricsCommand(program);
if (typeof configCommand === 'function') configCommand(program);

// Error handler
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  }

  console.error(chalk.red('Error:'), err.message);

  if (program.opts().verbose > 0) {
    console.error(err.stack);
  }

  process.exit(err.exitCode || 1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
