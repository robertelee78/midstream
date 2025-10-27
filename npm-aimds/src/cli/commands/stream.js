/**
 * Stream command
 *
 * Start stream processing server
 */

const { StreamProcessor } = require('../../stream');

module.exports = (program) => {
  program
    .command('stream')
    .description('Start stream processing server')
    .option('-p, --port <port>', 'server port', parseInt, 8080)
    .option('--protocol <protocol>', 'protocol (http|websocket|grpc|tcp)', 'http')
    .action(async (options) => {
      // TODO: Implement stream command
      console.log('Stream command - implementation pending');
    });
};
