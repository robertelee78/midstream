/**
 * I/O Utilities
 * Handle input/output operations
 */

const fs = require('fs').promises;

/**
 * Read from stdin
 */
async function readInput() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', reject);

    // Handle timeout
    setTimeout(() => {
      if (data === '') {
        reject(new Error('Timeout reading from stdin'));
      }
    }, 30000);
  });
}

/**
 * Write to file
 */
async function writeOutput(path, content) {
  await fs.writeFile(path, content, 'utf8');
}

/**
 * Append to file
 */
async function appendOutput(path, content) {
  await fs.appendFile(path, content, 'utf8');
}

module.exports = {
  readInput,
  writeOutput,
  appendOutput
};
