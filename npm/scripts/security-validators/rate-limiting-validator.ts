/**
 * Rate Limiting Validator
 *
 * Checks for rate limiting, throttling, and debouncing mechanisms
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class RateLimitingValidator extends BaseValidator {
  getName(): string {
    return 'Rate Limiting';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    let rateLimitingFound = false;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      if (
        content.includes('rate') ||
        content.includes('throttle') ||
        content.includes('debounce') ||
        content.includes('minInterval')
      ) {
        rateLimitingFound = true;
        break;
      }
    }

    if (rateLimitingFound) {
      this.passed.push('Rate limiting mechanisms found');
    } else {
      this.issues.push({
        severity: 'low',
        category: 'Rate Limiting',
        file: 'streaming.ts',
        description: 'No rate limiting detected for API calls',
        recommendation: 'Implement rate limiting to prevent abuse',
      });
    }

    return this.getResult();
  }
}
