/**
 * Security Orchestrator
 *
 * Orchestrates security validators using Strategy Pattern
 * Coordinates all security checks and aggregates results
 * Created by rUv
 */

import chalk from 'chalk';
import { SecurityValidator, SecurityIssue, ValidationResult } from './types';
import { ReportGenerator, SecurityReport } from './report-generator';

// Import all validators
import { EnvironmentValidator } from './environment-validator';
import { APIKeyValidator } from './api-key-validator';
import { DependencyValidator } from './dependency-validator';
import { InputValidationChecker } from './input-validator';
import { AuthenticationValidator } from './authentication-validator';
import { EncryptionValidator } from './encryption-validator';
import { RateLimitingValidator } from './rate-limiting-validator';
import { ErrorHandlingValidator } from './error-handling-validator';
import { LoggingValidator } from './logging-validator';
import { CORSValidator } from './cors-validator';

export class SecurityOrchestrator {
  private validators: SecurityValidator[] = [];
  private allIssues: SecurityIssue[] = [];
  private allPassed: string[] = [];

  constructor(rootDir?: string) {
    // Initialize all validators
    this.validators = [
      new EnvironmentValidator(rootDir),
      new APIKeyValidator(rootDir),
      new DependencyValidator(rootDir),
      new InputValidationChecker(rootDir),
      new AuthenticationValidator(rootDir),
      new EncryptionValidator(rootDir),
      new RateLimitingValidator(rootDir),
      new ErrorHandlingValidator(rootDir),
      new LoggingValidator(rootDir),
      new CORSValidator(rootDir),
    ];
  }

  /**
   * Add custom validator
   */
  addValidator(validator: SecurityValidator): void {
    this.validators.push(validator);
  }

  /**
   * Run all security checks
   */
  async runAllChecks(): Promise<SecurityReport> {
    console.log(chalk.bold.cyan('\n🔐 MidStream Security Check'));
    console.log(chalk.gray('═'.repeat(60)));

    // Run all validators in parallel for better performance
    const results = await Promise.all(
      this.validators.map(async (validator) => {
        console.log(chalk.yellow(`\n📋 Checking ${validator.getName()}...`));
        try {
          return await validator.validate();
        } catch (error) {
          console.error(chalk.red(`Error in ${validator.getName()}:`), error);
          return { issues: [], passed: [] };
        }
      })
    );

    // Aggregate results
    for (const result of results) {
      this.allIssues.push(...result.issues);
      this.allPassed.push(...result.passed);
    }

    return ReportGenerator.generateReport(this.allIssues, this.allPassed);
  }

  /**
   * Run specific validator by name
   */
  async runValidator(name: string): Promise<ValidationResult> {
    const validator = this.validators.find((v) => v.getName() === name);
    if (!validator) {
      throw new Error(`Validator "${name}" not found`);
    }

    console.log(chalk.yellow(`\n📋 Running ${validator.getName()}...`));
    return await validator.validate();
  }

  /**
   * Get list of available validators
   */
  getValidatorNames(): string[] {
    return this.validators.map((v) => v.getName());
  }
}
