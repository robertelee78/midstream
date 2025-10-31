/**
 * Input Validation Checker
 *
 * Checks for input validation and dangerous code patterns
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class InputValidationChecker extends BaseValidator {
  getName(): string {
    return 'Input Validation';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    let validationFound = false;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for validation patterns
      if (
        content.includes('validate') ||
        content.includes('sanitize') ||
        content.includes('throw new Error')
      ) {
        validationFound = true;
      }

      // Check for dangerous eval/exec usage
      if (content.includes('eval(') && !content.includes('// safe')) {
        this.issues.push({
          severity: 'critical',
          category: 'Input Validation',
          file: path.relative(srcDir, file),
          description: 'Potential unsafe eval() usage',
          recommendation: 'Avoid eval(). Use safer alternatives like JSON.parse()',
        });
      }
    }

    if (validationFound) {
      this.passed.push('Input validation mechanisms found');
    }

    return this.getResult();
  }
}
