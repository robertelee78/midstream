/**
 * AIMDS Config Command
 * Configuration management
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const yaml = require('yaml');
const inquirer = require('inquirer');

module.exports = function(program) {
  program
    .command('config [command] [key] [value]')
    .description('Configuration management')
    .option('--global', 'Use global configuration')
    .option('--local', 'Use local configuration')
    .option('--list', 'List all configuration')
    .action(async (command, key, value, options) => {
      try {
        const configPath = getConfigPath(options);

        switch (command) {
          case 'init':
            await initConfig(configPath);
            break;
          case 'get':
            await getConfig(configPath, key);
            break;
          case 'set':
            await setConfig(configPath, key, value);
            break;
          case 'validate':
            await validateConfig(configPath);
            break;
          case 'list':
          default:
            await listConfig(configPath);
            break;
        }

      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(3);
      }
    });
};

function getConfigPath(options) {
  if (options.global) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.join(home, '.aimds.yaml');
  }
  return path.join(process.cwd(), '.aimds.yaml');
}

async function initConfig(configPath) {
  const defaultConfig = {
    version: '1.0',
    detection: {
      threshold: 0.8,
      mode: 'balanced',
      pii_detection: true,
      patterns: './patterns/'
    },
    analysis: {
      baseline: './baselines/',
      sensitivity: 'medium',
      window: '5m',
      anomaly_threshold: 0.7,
      learning: true
    },
    verification: {
      method: 'ltl',
      timeout: 30,
      parallel: true,
      policies: './policies/'
    },
    response: {
      strategy: 'balanced',
      auto_respond: false,
      rollback: true,
      learning: true
    },
    integrations: {
      agentdb: {
        enabled: false,
        endpoint: 'http://localhost:8000',
        namespace: 'aimds'
      },
      prometheus: {
        enabled: true,
        port: 9090,
        path: '/metrics'
      },
      lean: {
        enabled: false,
        binary: 'lean'
      }
    },
    performance: {
      workers: 'auto',
      max_memory_mb: 512,
      batch_size: 10
    },
    logging: {
      level: 'info',
      file: './logs/aimds.log',
      audit: './logs/audit.log',
      format: 'json'
    }
  };

  // Check if config exists
  try {
    await fs.access(configPath);
    const answers = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: `Configuration file ${configPath} already exists. Overwrite?`,
      default: false
    }]);

    if (!answers.overwrite) {
      console.log(chalk.yellow('Configuration initialization cancelled'));
      return;
    }
  } catch {
    // File doesn't exist, continue
  }

  await fs.writeFile(configPath, yaml.stringify(defaultConfig));
  console.log(chalk.green(`✓ Configuration initialized at ${configPath}`));
}

async function getConfig(configPath, key) {
  const config = await loadConfig(configPath);

  if (!key) {
    console.log(yaml.stringify(config));
    return;
  }

  const value = getNestedValue(config, key);

  if (value === undefined) {
    console.error(chalk.red(`Key '${key}' not found`));
    process.exit(3);
  }

  console.log(typeof value === 'object' ? yaml.stringify(value) : value);
}

async function setConfig(configPath, key, value) {
  if (!key || value === undefined) {
    console.error(chalk.red('Usage: aimds config set <key> <value>'));
    process.exit(3);
  }

  const config = await loadConfig(configPath);

  // Parse value
  let parsedValue = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(value)) parsedValue = Number(value);

  setNestedValue(config, key, parsedValue);

  await fs.writeFile(configPath, yaml.stringify(config));
  console.log(chalk.green(`✓ Set ${key} = ${parsedValue}`));
}

async function listConfig(configPath) {
  try {
    const config = await loadConfig(configPath);

    console.log(chalk.bold('⚙️  AIMDS Configuration'));
    console.log('━'.repeat(50));
    console.log('');
    console.log(`File: ${configPath}`);
    console.log('');
    console.log(yaml.stringify(config));
  } catch (error) {
    console.log(chalk.yellow('No configuration file found'));
    console.log(chalk.dim('Run "aimds config init" to create one'));
  }
}

async function validateConfig(configPath) {
  try {
    const config = await loadConfig(configPath);

    const errors = [];

    // Validate detection
    if (config.detection?.threshold < 0 || config.detection?.threshold > 1) {
      errors.push('detection.threshold must be between 0 and 1');
    }

    // Validate analysis
    if (!['low', 'medium', 'high'].includes(config.analysis?.sensitivity)) {
      errors.push('analysis.sensitivity must be low, medium, or high');
    }

    // Validate response
    if (!['passive', 'balanced', 'aggressive'].includes(config.response?.strategy)) {
      errors.push('response.strategy must be passive, balanced, or aggressive');
    }

    if (errors.length > 0) {
      console.log(chalk.red('✗ Configuration validation failed:'));
      errors.forEach(err => console.log(chalk.red(`  • ${err}`)));
      process.exit(3);
    }

    console.log(chalk.green('✓ Configuration is valid'));
  } catch (error) {
    console.error(chalk.red('✗ Configuration validation failed:'), error.message);
    process.exit(3);
  }
}

async function loadConfig(configPath) {
  const content = await fs.readFile(configPath, 'utf8');
  return yaml.parse(content);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
