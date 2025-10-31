/**
 * Authentication Mechanisms Validator
 *
 * Checks authentication patterns and insecure auth
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class AuthenticationValidator extends BaseValidator {
  getName(): string {
    return 'Authentication';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    let authFound = false;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      if (
        content.includes('Authorization') ||
        content.includes('apiKey') ||
        content.includes('Bearer')
      ) {
        authFound = true;
      }

      // Check for insecure auth
      if (content.includes('Basic auth') && !content.includes('https')) {
        this.issues.push({
          severity: 'high',
          category: 'Authentication',
          file: path.relative(srcDir, file),
          description: 'Basic auth without HTTPS',
          recommendation: 'Always use HTTPS with Basic authentication',
        });
      }
    }

    if (authFound) {
      this.passed.push('Authentication mechanisms present');
    }

    return this.getResult();
  }
}
