/**
 * Detect command
 *
 * Detect threats in text input
 */

const { Detector } = require('../../detection');
const chalk = require('chalk');

module.exports = (program) => {
  program
    .command('detect <text>')
    .description('Detect AI manipulation threats in text')
    .option('-t, --threshold <number>', 'detection threshold (0-1)', parseFloat, 0.8)
    .option('-m, --mode <mode>', 'detection mode (fast|balanced|thorough)', 'balanced')
    .option('--pii', 'enable PII detection', true)
    .option('--deep', 'enable deep analysis')
    .action(async (text, options) => {
      try {
        const detector = new Detector({
          threshold: options.threshold,
          mode: options.mode,
          pii: options.pii,
          deep: options.deep,
        });

        const result = await detector.detect(text);

        if (program.opts().json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(chalk.bold('\nDetection Result:'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`Status: ${getStatusColor(result.status)(result.status.toUpperCase())}`);
          console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          console.log(`Latency: ${result.performance.latency_ms}ms`);

          if (result.findings.length > 0) {
            console.log(chalk.bold('\nFindings:'));
            result.findings.forEach((finding, i) => {
              console.log(`\n${i + 1}. ${finding.type}`);
              console.log(`   Severity: ${finding.severity}`);
              console.log(`   Confidence: ${(finding.confidence * 100).toFixed(1)}%`);
              console.log(`   Recommendation: ${finding.recommendation}`);
            });
          }
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
};

function getStatusColor(status) {
  switch (status) {
    case 'safe': return chalk.green;
    case 'suspicious': return chalk.yellow;
    case 'threat': return chalk.red;
    default: return chalk.white;
  }
}
