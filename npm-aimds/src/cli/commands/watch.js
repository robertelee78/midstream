/**
 * Watch command
 *
 * Watch files for threats
 */

module.exports = (program) => {
  program
    .command('watch <path>')
    .description('Watch files for threats')
    .option('-r, --recursive', 'watch recursively')
    .action(async (path, options) => {
      // TODO: Implement watch command
      console.log('Watch command - implementation pending');
    });
};
