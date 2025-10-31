/**
 * Data Encryption Validator
 *
 * Checks for secure protocols (HTTPS/WSS) and insecure HTTP usage
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class EncryptionValidator extends BaseValidator {
  getName(): string {
    return 'Data Encryption';
  }

  async validate(): Promise<ValidationResult> {
    const srcDir = path.join(this.rootDir, 'src');
    const files = this.getAllFiles(srcDir, '.ts');

    let httpsFound = false;
    let wsssFound = false;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for HTTPS/WSS usage
      if (content.includes('https://')) httpsFound = true;
      if (content.includes('wss://')) wsssFound = true;

      // Check for insecure protocols
      const httpMatch = content.match(/['"]http:\/\/[^'"]+['"]/);
      if (httpMatch) {
        const url = httpMatch[0];
        if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
          this.issues.push({
            severity: 'medium',
            category: 'Encryption',
            file: path.relative(srcDir, file),
            description: 'Insecure HTTP protocol detected',
            recommendation: 'Use HTTPS for all external connections',
          });
        }
      }
    }

    if (httpsFound) this.passed.push('HTTPS usage detected');
    if (wsssFound) this.passed.push('WSS (secure WebSocket) usage detected');

    return this.getResult();
  }
}
