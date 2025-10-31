/**
 * Dependency Vulnerabilities Validator
 *
 * Checks for known vulnerable dependencies
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import { BaseValidator } from './base-validator';
import { ValidationResult } from './types';

export class DependencyValidator extends BaseValidator {
  private readonly knownVulnerable = [
    'event-stream@3.3.6',
    'flatmap-stream',
  ];

  getName(): string {
    return 'Dependency Vulnerabilities';
  }

  async validate(): Promise<ValidationResult> {
    const packageJson = path.join(this.rootDir, 'package.json');

    if (!fs.existsSync(packageJson)) {
      this.issues.push({
        severity: 'medium',
        category: 'Dependencies',
        file: 'package.json',
        description: 'package.json not found',
        recommendation: 'Ensure package.json exists',
      });
      return this.getResult();
    }

    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const [name, _version] of Object.entries(allDeps)) {
      if (this.knownVulnerable.includes(name)) {
        this.issues.push({
          severity: 'high',
          category: 'Dependencies',
          file: 'package.json',
          description: `Known vulnerable package: ${name}`,
          recommendation: 'Update or remove the vulnerable package',
        });
      }
    }

    this.passed.push('Dependency check completed');

    return this.getResult();
  }
}
