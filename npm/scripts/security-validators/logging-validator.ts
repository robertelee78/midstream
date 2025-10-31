/**
 * Logging Practices Validator
 *
 * Checks for sensitive data in logs
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class LoggingValidator extends BaseValidator {
  private readonly sensitiveKeywords = [
    'password',
    'apiKey',
    'secret',
    'token',
  ];

  getName(): string {
    return 'Logging Practices';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for sensitive data in logs
        if (line.includes('console.log')) {
          for (const keyword of this.sensitiveKeywords) {
            if (line.includes(keyword)) {
              this.issues.push({
                severity: 'high',
                category: 'Logging',
                file: path.relative(srcDir, file),
                line: i + 1,
                description: 'Potential sensitive data logging',
                recommendation: 'Never log passwords, API keys, or secrets',
              });
              break;
            }
          }
        }
      }
    }

    this.passed.push('Logging practices reviewed');

    return this.getResult();
  }
}
