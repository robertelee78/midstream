/**
 * AIMDS Metrics Command
 * Export Prometheus metrics
 */

const fs = require('fs').promises;
const chalk = require('chalk');
const fastify = require('fastify');
const client = require('prom-client');

module.exports = function(program) {
  program
    .command('metrics')
    .description('Export Prometheus metrics')
    .option('--export <path>', 'Export metrics to file')
    .option('--server', 'Start metrics server')
    .option('--port <number>', 'Server port', parseInt, 9090)
    .option('--format <fmt>', 'Output format: prometheus|json|yaml', 'prometheus')
    .action(async (options) => {
      try {
        // Create metrics registry
        const register = new client.Registry();

        // Define metrics
        const requestCounter = new client.Counter({
          name: 'aimds_requests_total',
          help: 'Total number of AIMDS requests',
          labelNames: ['method', 'status'],
          registers: [register]
        });

        const detectionLatency = new client.Histogram({
          name: 'aimds_detection_latency_ms',
          help: 'Detection latency in milliseconds',
          buckets: [1, 2, 5, 10, 20, 50, 100],
          registers: [register]
        });

        const threatsDetected = new client.Counter({
          name: 'aimds_threats_detected_total',
          help: 'Total threats detected',
          labelNames: ['type', 'severity'],
          registers: [register]
        });

        // Add some sample data
        requestCounter.inc({ method: 'detect', status: 'success' }, 100);
        detectionLatency.observe(4.2);
        threatsDetected.inc({ type: 'prompt_injection', severity: 'high' }, 5);

        if (options.server) {
          // Start metrics server
          const server = fastify();

          server.get('/metrics', async () => {
            return register.metrics();
          });

          server.get('/health', async () => {
            return { status: 'healthy' };
          });

          const address = await server.listen({
            port: options.port,
            host: '0.0.0.0'
          });

          console.log(chalk.bold('📊 AIMDS Metrics Server'));
          console.log('━'.repeat(50));
          console.log('');
          console.log(`Address:      ${address}`);
          console.log(`Endpoints:    /metrics, /health`);
          console.log('');
          console.log(chalk.green('Metrics server running... Press Ctrl+C to stop'));

          process.on('SIGINT', async () => {
            await server.close();
            process.exit(0);
          });

        } else {
          // Export metrics
          const metrics = await register.metrics();

          if (options.export) {
            await fs.writeFile(options.export, metrics);
            console.log(chalk.green(`Metrics exported to ${options.export}`));
          } else {
            console.log(chalk.bold('📊 AIMDS Metrics'));
            console.log('━'.repeat(50));
            console.log('');
            console.log(metrics);
          }
        }

      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
};
