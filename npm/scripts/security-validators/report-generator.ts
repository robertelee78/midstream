/**
 * Security Report Generator
 *
 * Generates and prints comprehensive security reports
 * Created by rUv
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { SecurityIssue } from './types';

export interface SecurityReport {
  timestamp: Date;
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  issues: SecurityIssue[];
  passed: string[];
}

export class ReportGenerator {
  /**
   * Generate security report from collected issues
   */
  static generateReport(issues: SecurityIssue[], passed: string[]): SecurityReport {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const high = issues.filter((i) => i.severity === 'high').length;
    const medium = issues.filter((i) => i.severity === 'medium').length;
    const low = issues.filter((i) => i.severity === 'low').length;

    return {
      timestamp: new Date(),
      totalIssues: issues.length,
      critical,
      high,
      medium,
      low,
      issues,
      passed,
    };
  }

  /**
   * Print security report to console
   */
  static printReport(report: SecurityReport): void {
    console.log(chalk.bold.cyan('\n\n' + '═'.repeat(60)));
    console.log(chalk.bold.cyan('Security Report'));
    console.log(chalk.bold.cyan('═'.repeat(60)));

    console.log(chalk.gray(`Generated: ${report.timestamp.toLocaleString()}\n`));

    // Summary
    console.log(chalk.bold('Summary:'));
    console.log(`  Total Issues: ${report.totalIssues}`);
    console.log(`  ${chalk.red('Critical:')} ${report.critical}`);
    console.log(`  ${chalk.yellow('High:')} ${report.high}`);
    console.log(`  ${chalk.blue('Medium:')} ${report.medium}`);
    console.log(`  ${chalk.gray('Low:')} ${report.low}`);

    // Passed checks
    console.log(chalk.bold.green('\n✓ Passed Checks:'));
    report.passed.forEach((check) => {
      console.log(chalk.green(`  ✓ ${check}`));
    });

    // Issues
    if (report.issues.length > 0) {
      console.log(chalk.bold.red('\n✗ Issues Found:'));

      const sortedIssues = report.issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      sortedIssues.forEach((issue, index) => {
        const severityColor =
          issue.severity === 'critical'
            ? chalk.red
            : issue.severity === 'high'
            ? chalk.yellow
            : issue.severity === 'medium'
            ? chalk.blue
            : chalk.gray;

        console.log(`\n${index + 1}. ${severityColor(`[${issue.severity.toUpperCase()}]`)} ${issue.category}`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   ${chalk.gray(issue.description)}`);
        console.log(`   ${chalk.green('→')} ${issue.recommendation}`);
      });
    }

    // Overall status
    console.log(chalk.bold.cyan('\n' + '═'.repeat(60)));

    if (report.critical > 0) {
      console.log(chalk.red.bold('❌ SECURITY AUDIT FAILED'));
      console.log(chalk.red(`Critical issues must be fixed before deployment`));
    } else if (report.high > 0) {
      console.log(chalk.yellow.bold('⚠️  SECURITY AUDIT WARNING'));
      console.log(chalk.yellow(`High-priority issues should be addressed`));
    } else if (report.issues.length > 0) {
      console.log(chalk.blue.bold('✓ SECURITY AUDIT PASSED'));
      console.log(chalk.blue(`Minor issues can be addressed incrementally`));
    } else {
      console.log(chalk.green.bold('✅ SECURITY AUDIT PASSED'));
      console.log(chalk.green(`No security issues detected`));
    }

    console.log(chalk.bold.cyan('═'.repeat(60) + '\n'));
  }

  /**
   * Save report to JSON file
   */
  static saveReport(report: SecurityReport, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`Full report saved to: ${outputPath}\n`));
  }

  /**
   * Get exit code based on report
   */
  static getExitCode(report: SecurityReport): number {
    if (report.critical > 0 || report.high > 0) {
      return 1;
    }
    return 0;
  }
}
