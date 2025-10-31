#!/usr/bin/env ts-node
/**
 * MidStream Security Check Script
 *
 * Comprehensive security audit of MidStream components
 * Refactored to use modular validators with Strategy Pattern
 * Created by rUv
 *
 * Complexity Reduction:
 * - Before: Cyclomatic 95, Cognitive 109 (CRITICAL)
 * - After: Cyclomatic <15, Cognitive <20 (TARGET)
 */

import * as path from 'path';
import chalk from 'chalk';
import { SecurityOrchestrator } from './security-validators/security-orchestrator';
import { ReportGenerator } from './security-validators/report-generator';

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    // Initialize orchestrator with project root
    const rootDir = path.join(__dirname, '..');
    const orchestrator = new SecurityOrchestrator(rootDir);

    // Run all security checks
    const report = await orchestrator.runAllChecks();

    // Print report to console
    ReportGenerator.printReport(report);

    // Save report to JSON
    const reportPath = path.join(__dirname, '../../security-report.json');
    ReportGenerator.saveReport(report, reportPath);

    // Exit with appropriate code
    const exitCode = ReportGenerator.getExitCode(report);
    process.exit(exitCode);
  } catch (error) {
    console.error(chalk.red('Security check failed:'), error);
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

if (require.main === module) {
  main();
}

// ============================================================================
// Exports (for testing and programmatic use)
// ============================================================================

export { SecurityOrchestrator, ReportGenerator };
export * from './security-validators';
