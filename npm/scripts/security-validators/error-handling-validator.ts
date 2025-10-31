/**
 * Error Handling Validator
 *
 * Checks for proper error handling with try-catch and promise handlers
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class ErrorHandlingValidator extends BaseValidator {
  getName(): string {
    return 'Error Handling';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    let errorHandlingFound = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Count try-catch blocks
      const tryCount = (content.match(/try\s*\{/g) || []).length;
      const catchCount = (content.match(/catch\s*\(/g) || []).length;

      if (tryCount > 0 && catchCount > 0) {
        errorHandlingFound++;
      }

      // Check for unhandled promises
      const hasThens = content.match(/\.then\(/g);
      const hasCatches = content.match(/\.catch\(/g);

      if (hasThens && !hasCatches) {
        this.issues.push({
          severity: 'medium',
          category: 'Error Handling',
          file: path.relative(srcDir, file),
          description: 'Promise without catch handler',
          recommendation: 'Add .catch() to handle promise rejections',
        });
      }
    }

    if (errorHandlingFound > 0) {
      this.passed.push(`Error handling found in ${errorHandlingFound} files`);
    }

    return this.getResult();
  }
}
