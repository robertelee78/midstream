/**
 * CORS Configuration Validator
 *
 * Checks for CORS configuration and wildcard policies
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class CORSValidator extends BaseValidator {
  getName(): string {
    return 'CORS Configuration';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    let corsFound = false;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      if (content.includes('Access-Control-Allow-Origin')) {
        corsFound = true;

        // Check for unsafe CORS
        if (content.includes('Access-Control-Allow-Origin: *')) {
          this.issues.push({
            severity: 'medium',
            category: 'CORS',
            file: path.relative(srcDir, file),
            description: 'Wildcard CORS policy detected',
            recommendation: 'Restrict CORS to specific origins in production',
          });
        }
      }
    }

    if (corsFound) {
      this.passed.push('CORS configuration present');
    }

    return this.getResult();
  }
}
