/**
 * API Key Exposure Validator
 *
 * Detects hardcoded API keys and credentials in source code
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class APIKeyValidator extends BaseValidator {
  private readonly dangerousPatterns = [
    /['"]sk-[a-zA-Z0-9]{32,}['"]/,  // OpenAI keys
    /['"][A-Z0-9]{32,}['"]/,         // Generic API keys
    /['"]api[_-]?key['"]:\s*['"][^'"]+['"]/i,  // Hardcoded API keys
  ];

  getName(): string {
    return 'API Key Exposure';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of this.dangerousPatterns) {
          if (pattern.test(line) && !line.includes('process.env')) {
            this.issues.push({
              severity: 'critical',
              category: 'Credentials',
              file: path.relative(srcDir, file),
              line: i + 1,
              description: 'Potential hardcoded API key detected',
              recommendation: 'Use environment variables: process.env.API_KEY',
            });
          }
        }
      }
    }

    if (this.issues.length === 0) {
      this.passed.push('No hardcoded API keys found');
    }

    return this.getResult();
  }
}
