/**
 * Security Validator Types
 *
 * Shared types for all security validators
 * Created by rUv
 */

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line?: number;
  description: string;
  recommendation: string;
}

export interface ValidationResult {
  issues: SecurityIssue[];
  passed: string[];
}

export interface SecurityValidator {
  /**
   * Validate and return results
   */
  validate(): Promise<ValidationResult>;

  /**
   * Get validator name
   */
  getName(): string;
}
