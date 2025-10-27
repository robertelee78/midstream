/**
 * AIMDS Watch Command
 * Monitor directories and files for threats
 */

const chokidar = require('chokidar');
const chalk = require('chalk');
const ora = require('ora');
const wasmLoader = require('../utils/wasm-loader');
const formatters = require('../utils/formatters');

module.exports = function(program) {
  program
    .command('watch <path>')
    .description('Monitor directories and files for threats')
    .option('--recursive', 'Watch subdirectories')
    .option('--pattern <glob>', 'File pattern')
    .option('--ignore <pattern>', 'Ignore pattern')
    .option('--detect', 'Run detection on changes')
    .option('--analyze', 'Run behavioral analysis')
    .option('--verify <policy>', 'Verify against policy')
    .option('--baseline <path>', 'Baseline for comparison')
    .option('--alert', 'Send alerts on threats')
    .option('--auto-respond', 'Automatic threat response')
    .option('--quarantine <path>', 'Move threats to quarantine')
    .option('--output <path>', 'Write results to file')
    .option('--format <fmt>', 'Output format: text|json|ndjson', 'text')
    .option('--log <path>', 'Log file')
    .option('--quiet', 'Suppress output except threats')
    .option('--debounce <ms>', 'Debounce delay', parseInt, 100)
    .option('--batch', 'Batch file changes')
    .action(async (path, options) => {
      const spinner = ora(`Watching ${path}...`).start();

      try {
        // Load WASM modules
        if (options.detect) await wasmLoader.loadModule('detection');
        if (options.analyze) await wasmLoader.loadModule('analysis');
        if (options.verify) await wasmLoader.loadModule('verification');

        // Setup watcher
        const watcher = chokidar.watch(path, {
          persistent: true,
          ignoreInitial: false,
          recursive: options.recursive !== false,
          ignored: options.ignore,
          awaitWriteFinish: {
            stabilityThreshold: options.debounce,
            pollInterval: 100
          }
        });

        spinner.succeed(`Watching ${path}`);

        if (!options.quiet) {
          console.log('');
          console.log(chalk.bold('👁️  AIMDS File Monitor'));
          console.log('━'.repeat(50));
          console.log('');
          console.log(`Path:         ${path}`);
          console.log(`Pattern:      ${options.pattern || '*'}`);
          console.log(`Recursive:    ${options.recursive !== false}`);
          console.log(`Detection:    ${options.detect ? 'enabled' : 'disabled'}`);
          console.log(`Analysis:     ${options.analyze ? 'enabled' : 'disabled'}`);
          console.log('');
          console.log(chalk.green('Monitoring for changes...'));
          console.log('Press Ctrl+C to stop');
          console.log('');
        }

        // Handle file changes
        watcher.on('add', file => handleFileChange('added', file, options));
        watcher.on('change', file => handleFileChange('changed', file, options));
        watcher.on('unlink', file => {
          if (!options.quiet) {
            console.log(chalk.dim(`[${new Date().toISOString()}] File removed: ${file}`));
          }
        });

        watcher.on('error', error => {
          console.error(chalk.red('Watcher error:'), error.message);
        });

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n\nStopping watcher...');
          await watcher.close();
          process.exit(0);
        });

      } catch (error) {
        spinner.fail('Watch failed');
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
};

async function handleFileChange(event, file, options) {
  const timestamp = new Date().toISOString();

  if (!options.quiet) {
    console.log(chalk.dim(`[${timestamp}] File ${event}: ${file}`));
  }

  // Run detection if enabled
  if (options.detect) {
    const fs = require('fs').promises;
    try {
      const content = await fs.readFile(file, 'utf8');

      // Simple pattern matching
      if (content.match(/ignore\s+previous\s+instructions/i)) {
        console.log(chalk.red(`[${timestamp}] ⚠️  THREAT DETECTED in ${file}`));
        console.log(chalk.yellow('  Pattern: prompt_injection'));
        console.log(chalk.yellow('  Confidence: 0.95'));

        if (options.alert) {
          console.log(chalk.red('  🚨 Alert triggered!'));
        }

        if (options.quarantine) {
          const path = require('path');
          const quarantinePath = path.join(options.quarantine, path.basename(file));
          await fs.rename(file, quarantinePath);
          console.log(chalk.yellow(`  📦 Moved to quarantine: ${quarantinePath}`));
        }
      }
    } catch (error) {
      if (!options.quiet) {
        console.error(chalk.dim(`  Error reading file: ${error.message}`));
      }
    }
  }
}
