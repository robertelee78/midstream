/**
 * AIMDS Test Command
 * Run test suite
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

module.exports = function(program) {
  program
    .command('test [pattern]')
    .description('Run test suite')
    .option('--coverage', 'Generate coverage report')
    .option('--watch', 'Watch mode')
    .option('--unit', 'Run unit tests only')
    .option('--integration', 'Run integration tests only')
    .option('--format <fmt>', 'Output format: text|json|junit', 'text')
    .action(async (pattern, options) => {
      try {
        const args = ['run'];

        if (options.watch) {
          args.push('--watch');
        }

        if (options.coverage) {
          args.push('--coverage');
        }

        if (options.unit) {
          args.push('tests/unit');
        } else if (options.integration) {
          args.push('tests/integration');
        } else if (pattern) {
          args.push(pattern);
        }

        console.log(chalk.bold('🧪 AIMDS Test Suite'));
        console.log('━'.repeat(50));
        console.log('');

        const vitest = spawn('npx', ['vitest', ...args], {
          stdio: 'inherit',
          shell: true
        });

        vitest.on('close', (code) => {
          process.exit(code);
        });

      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
};
