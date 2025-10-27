/**
 * Output Formatters
 * Handle different output formats (text, JSON, YAML, table)
 */

const chalk = require('chalk');
const yaml = require('yaml');
const { table } = require('table');

class Formatters {
  /**
   * Format detection results
   */
  static formatDetection(result, format = 'text', options = {}) {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'yaml':
        return yaml.stringify(result);
      case 'table':
        return this.formatDetectionTable(result);
      default:
        return this.formatDetectionText(result, options);
    }
  }

  static formatDetectionText(result, options = {}) {
    const { highlight = false } = options;
    let output = [];

    output.push(chalk.bold('🛡️  AIMDS Detection Report'));
    output.push('━'.repeat(50));
    output.push('');
    output.push(`Input:     ${result.input?.source || 'stdin'} (${result.input?.size_bytes || 0} bytes)`);
    output.push(`Analyzed:  ${result.input?.size_bytes || 0} bytes in ${result.analysis?.duration_ms?.toFixed(1) || 0}ms`);

    const status = result.analysis?.status === 'threat_detected'
      ? chalk.red('⚠️  THREAT DETECTED')
      : chalk.green('✓ CLEAN');
    output.push(`Status:    ${status}`);
    output.push('');

    if (result.findings && result.findings.length > 0) {
      output.push(chalk.bold('Findings:'));
      result.findings.forEach(finding => {
        const icon = finding.severity === 'high' ? '❌' : '⚠️';
        const severity = finding.severity === 'high' ? chalk.red('HIGH') : chalk.yellow('MEDIUM');
        output.push(`  ${icon} ${finding.type} (confidence: ${finding.confidence?.toFixed(2)})`);
        output.push(`     Pattern: "${finding.pattern}"`);
        if (finding.location) {
          output.push(`     Location: line ${finding.location.line}, col ${finding.location.column_start}-${finding.location.column_end}`);
        }
        output.push('');
      });

      output.push(chalk.bold('Recommendations:'));
      result.findings.forEach(finding => {
        output.push(`  • ${this.getRecommendation(finding)}`);
      });
      output.push('');
    }

    const latency = result.performance?.latency_ms || 0;
    const target = result.performance?.target_ms || 10;
    const meetsSla = latency <= target;
    const perfIcon = meetsSla ? '✓' : '⚠️';
    output.push(`Performance: ${latency.toFixed(1)}ms (target: <${target}ms) ${perfIcon}`);

    return output.join('\n');
  }

  static formatDetectionTable(result) {
    if (!result.findings || result.findings.length === 0) {
      return 'No findings.';
    }

    const data = [
      ['Type', 'Severity', 'Confidence', 'Pattern', 'Location']
    ];

    result.findings.forEach(finding => {
      data.push([
        finding.type,
        finding.severity,
        finding.confidence?.toFixed(2) || 'N/A',
        finding.pattern,
        finding.location
          ? `L${finding.location.line}:C${finding.location.column_start}`
          : 'N/A'
      ]);
    });

    return table(data);
  }

  /**
   * Format analysis results
   */
  static formatAnalysis(result, format = 'text') {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'yaml':
        return yaml.stringify(result);
      default:
        return this.formatAnalysisText(result);
    }
  }

  static formatAnalysisText(result) {
    let output = [];

    output.push(chalk.bold('📊 AIMDS Behavioral Analysis'));
    output.push('━'.repeat(50));
    output.push('');
    output.push(`Dataset:      ${result.dataset?.path || 'N/A'} (${result.dataset?.session_count || 0} sessions)`);
    output.push(`Timeframe:    ${result.timeframe?.start || 'N/A'} to ${result.timeframe?.end || 'N/A'}`);
    output.push(`Duration:     ${result.duration_ms?.toFixed(1) || 0}ms`);
    output.push('');

    if (result.temporal_patterns) {
      output.push(chalk.bold('Temporal Patterns:'));
      Object.entries(result.temporal_patterns).forEach(([name, pattern]) => {
        output.push(`  📈 ${name}`);
        output.push(`     Normal:   ${pattern.normal}`);
        const delta = pattern.change_percent ? ` (${pattern.change_percent > 0 ? '+' : ''}${pattern.change_percent}%)` : '';
        const warning = Math.abs(pattern.change_percent || 0) > 50 ? ' ⚠️' : '';
        output.push(`     Current:  ${pattern.current}${delta}${warning}`);
        output.push('');
      });
    }

    if (result.anomalies && result.anomalies.length > 0) {
      output.push(chalk.bold('Anomalies Detected:'));
      result.anomalies.forEach(anomaly => {
        const icon = anomaly.severity === 'high' ? '❌' : '⚠️';
        output.push(`  ${icon} ${anomaly.type} (confidence: ${anomaly.confidence?.toFixed(2)})`);
        if (anomaly.timestamp) {
          output.push(`     Timestamp: ${anomaly.timestamp}`);
        }
        if (anomaly.description) {
          output.push(`     ${anomaly.description}`);
        }
        output.push('');
      });
    }

    if (result.risk_score !== undefined) {
      const riskLevel = result.risk_score > 7 ? chalk.red('HIGH') :
                        result.risk_score > 4 ? chalk.yellow('MEDIUM') :
                        chalk.green('LOW');
      output.push(`Risk Score: ${result.risk_score.toFixed(1)}/10 (${riskLevel})`);
    }

    return output.join('\n');
  }

  /**
   * Format verification results
   */
  static formatVerification(result, format = 'text') {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'yaml':
        return yaml.stringify(result);
      default:
        return this.formatVerificationText(result);
    }
  }

  static formatVerificationText(result) {
    let output = [];

    output.push(chalk.bold('🔐 AIMDS Formal Verification'));
    output.push('━'.repeat(50));
    output.push('');
    output.push(`Policy:       ${result.policy || 'N/A'}`);
    output.push(`Method:       ${result.method || 'LTL Model Checking'}`);
    output.push(`Duration:     ${result.duration_ms?.toFixed(0) || 0}ms`);
    output.push('');

    if (result.policy_definition) {
      output.push(chalk.bold('Policy Definition:'));
      output.push(`  ${result.policy_definition}`);
      if (result.description) {
        output.push(`  "${result.description}"`);
      }
      output.push('');
    }

    const verified = result.verified === true;
    const status = verified ? chalk.green('✓ PROVED') : chalk.red('✗ FAILED');
    output.push(`Verification Result: ${status}`);
    output.push('');

    if (result.proof_steps && result.proof_steps.length > 0) {
      output.push(chalk.bold('Proof Steps:'));
      result.proof_steps.forEach((step, idx) => {
        output.push(`  ${idx + 1}. ${step.description} ${step.passed ? '✓' : '✗'}`);
      });
      output.push('');
    }

    if (result.properties_verified && result.properties_verified.length > 0) {
      output.push(chalk.bold('Properties Verified:'));
      result.properties_verified.forEach(prop => {
        output.push(`  ✓ ${prop.name}: ${prop.description}`);
      });
      output.push('');
    }

    if (result.counterexamples && result.counterexamples.length > 0) {
      output.push(chalk.bold(chalk.red('Counterexamples:')));
      result.counterexamples.forEach((ce, idx) => {
        output.push(`  ${idx + 1}. ${ce}`);
      });
    } else {
      output.push('Counterexamples: None');
    }

    return output.join('\n');
  }

  /**
   * Format response results
   */
  static formatResponse(result, format = 'text') {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'yaml':
        return yaml.stringify(result);
      default:
        return this.formatResponseText(result);
    }
  }

  static formatResponseText(result) {
    let output = [];

    output.push(chalk.bold('⚡ AIMDS Adaptive Response'));
    output.push('━'.repeat(50));
    output.push('');
    output.push(`Threat:       ${result.threat_id || 'N/A'}`);
    output.push(`Severity:     ${result.severity || 'N/A'} (${result.risk_score || 0}/10)`);
    output.push(`Strategy:     ${result.strategy || 'balanced'}`);
    output.push(`Duration:     ${result.duration_ms?.toFixed(1) || 0}ms`);
    output.push('');

    if (result.response_plan && result.response_plan.length > 0) {
      output.push(chalk.bold('Response Plan:'));
      result.response_plan.forEach((action, idx) => {
        output.push(`  ${idx + 1}. ${action.executed ? '✓' : '○'} ${action.name}`);
        if (action.details && action.details.length > 0) {
          action.details.forEach(detail => {
            output.push(`     • ${detail}`);
          });
        }
        output.push('');
      });
    }

    if (result.actions_taken && result.actions_taken.length > 0) {
      output.push(chalk.bold('Actions Taken:'));
      result.actions_taken.forEach(action => {
        output.push(`  ✓ ${action.name} (${action.duration_ms?.toFixed(1) || 0}ms)`);
      });
      output.push('');
    }

    if (result.learning_update) {
      output.push(chalk.bold('Learning Update:'));
      output.push(`  • ${result.learning_update.message}`);
      if (result.learning_update.confidence_change) {
        const change = result.learning_update.confidence_change;
        output.push(`  • Strategy confidence: ${change.from?.toFixed(2)} → ${change.to?.toFixed(2)} (${change.delta >= 0 ? '+' : ''}${change.delta?.toFixed(2)})`);
      }
      output.push('');
    }

    if (result.state_change) {
      output.push(chalk.bold('State:'));
      output.push(`  Before:  ${result.state_change.before}`);
      output.push(`  After:   ${result.state_change.after}`);
      output.push('');
    }

    if (result.rollback_id) {
      output.push(`Rollback Available: Yes (rollback-id: ${result.rollback_id})`);
    }

    return output.join('\n');
  }

  /**
   * Format error message
   */
  static formatError(error, verbose = false) {
    let output = [];

    output.push(chalk.red.bold(`Error: ${error.code || 'UNKNOWN_ERROR'} ${error.message}`));
    output.push('');

    if (error.details) {
      output.push(chalk.yellow('Details:'), error.details);
      output.push('');
    }

    if (error.troubleshooting && error.troubleshooting.length > 0) {
      output.push(chalk.bold('Troubleshooting:'));
      error.troubleshooting.forEach(tip => {
        output.push(`  • ${tip}`);
      });
      output.push('');
    }

    if (verbose && error.stack) {
      output.push(chalk.dim('Stack trace:'));
      output.push(chalk.dim(error.stack));
    }

    output.push('For more help: npx aimds help <command>');
    output.push('Documentation: https://docs.aimds.io');

    return output.join('\n');
  }

  /**
   * Get recommendation based on finding
   */
  static getRecommendation(finding) {
    const recommendations = {
      'prompt_injection': 'Sanitize or reject input',
      'pii_detected': 'Remove or mask PII data',
      'jailbreak_attempt': 'Apply prompt engineering safeguards',
      'data_leakage': 'Review data access policies',
      'anomalous_behavior': 'Investigate user session',
    };

    return recommendations[finding.type] || 'Review and take appropriate action';
  }
}

module.exports = Formatters;
