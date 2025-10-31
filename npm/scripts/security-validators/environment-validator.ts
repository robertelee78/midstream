/**
 * Environment Variables Validator
 *
 * Checks environment variable configuration and .gitignore
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class EnvironmentValidator extends BaseValidator {
  getName(): string {
    return 'Environment Variables';
  }

  async validate(): Promise<ValidationResult> {
    const envExample = path.join(this.rootDir, '.env.example');
    const gitignore = path.join(this.rootDir, '.gitignore');

    // Check if .env.example exists
    if (!fs.existsSync(envExample)) {
      this.issues.push({
        severity: 'medium',
        category: 'Configuration',
        file: '.env.example',
        description: '.env.example file is missing',
        recommendation: 'Create .env.example with all required environment variables',
      });
    } else {
      this.passed.push('.env.example exists');
    }

    // Check if .env is in .gitignore
    if (fs.existsSync(gitignore)) {
      const content = fs.readFileSync(gitignore, 'utf-8');
      if (content.includes('.env')) {
        this.passed.push('.env is in .gitignore');
      } else {
        this.issues.push({
          severity: 'high',
          category: 'Configuration',
          file: '.gitignore',
          description: '.env file not excluded from version control',
          recommendation: 'Add .env to .gitignore to prevent credential leakage',
        });
      }
    }

    return this.getResult();
  }
}
