/**
 * Base Security Validator
 *
 * Abstract base class for all security validators
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { SecurityValidator, ValidationResult, SecurityIssue } from './types';

export abstract class BaseValidator implements SecurityValidator {
  protected issues: SecurityIssue[] = [];
  protected passed: string[] = [];
  protected rootDir: string;

  constructor(rootDir: string = path.join(__dirname, '../..')) {
    this.rootDir = rootDir;
  }

  abstract validate(): Promise<ValidationResult>;
  abstract getName(): string;

  /**
   * Get all files recursively
   */
  protected getAllFiles(dir: string, ext: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, ext));
      } else if (item.endsWith(ext)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get result
   */
  protected getResult(): ValidationResult {
    return {
      issues: this.issues,
      passed: this.passed,
    };
  }
}
