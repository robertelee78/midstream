# AIMDS CLI Design Specification

## Overview

The AIMDS CLI provides a comprehensive command-line interface for AI Manipulation Defense System capabilities. Designed for both interactive use and automation, with a focus on developer experience and performance.

## Design Principles

1. **Fast by Default**: Every command optimized for <100ms startup
2. **Progressive Disclosure**: Simple commands with power user options
3. **Composable**: Pipe-friendly output formats
4. **Informative**: Clear feedback with progress indicators
5. **Safe**: Confirmation prompts for destructive operations

## Command Structure

```
npx aimds <command> [subcommand] [options] [arguments]
```

## Global Options

All commands support these global flags:

```bash
--config <path>     # Configuration file (default: .aimds.yaml)
--quiet, -q         # Suppress non-essential output
--verbose, -v       # Verbose logging (repeat for more: -vv, -vvv)
--json              # Output in JSON format
--no-color          # Disable colored output
--help, -h          # Show help
--version, -V       # Show version
```

## Commands Reference

### 1. `npx aimds detect`

Real-time detection of AI manipulation attempts.

#### Usage
```bash
npx aimds detect [options] [input]

# Examples
npx aimds detect --text "Ignore previous instructions"
npx aimds detect --file prompt.txt
npx aimds detect --stdin < input.txt
npx aimds detect --stream --port 3000
```

#### Options
```
Input:
  --text <string>         Detect manipulation in text
  --file <path>           Detect manipulation in file
  --stdin                 Read from standard input
  --stream                Start streaming detection server
  --watch <path>          Watch directory for changes

Detection:
  --patterns <path>       Custom pattern file
  --threshold <float>     Confidence threshold (0.0-1.0, default: 0.8)
  --mode <mode>           Detection mode: fast|balanced|thorough (default: balanced)
  --pii                   Also detect and sanitize PII
  --deep                  Enable deep semantic analysis

Output:
  --format <fmt>          Output format: text|json|yaml|table (default: text)
  --output <path>         Write results to file
  --highlight             Highlight detected patterns in output
  --summary               Show summary statistics only

Performance:
  --max-latency <ms>      Maximum acceptable latency (default: 10)
  --batch-size <n>        Batch size for processing (default: 1)
  --parallel <n>          Parallel workers (default: CPU count)
```

#### Output Format

**Text (default):**
```
🛡️  AIMDS Detection Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Input:     prompt.txt (245 bytes)
Analyzed:  245 bytes in 4.2ms
Status:    ⚠️  THREAT DETECTED

Findings:
  ❌ Prompt Injection (confidence: 0.95)
     Pattern: "ignore previous instructions"
     Location: line 3, col 12-38

  ⚠️  PII Detected (confidence: 0.88)
     Type: Email address
     Location: line 7, col 45-62

Recommendations:
  • Sanitize or reject input
  • Apply prompt engineering safeguards
  • Log attempt for audit trail

Performance: 4.2ms (target: <10ms) ✓
```

**JSON:**
```json
{
  "version": "1.0.0",
  "timestamp": "2025-10-27T10:30:45.123Z",
  "input": {
    "source": "prompt.txt",
    "size_bytes": 245,
    "hash": "sha256:abc123..."
  },
  "analysis": {
    "duration_ms": 4.2,
    "status": "threat_detected",
    "confidence": 0.95
  },
  "findings": [
    {
      "type": "prompt_injection",
      "severity": "high",
      "confidence": 0.95,
      "pattern": "ignore_previous_instructions",
      "location": {
        "line": 3,
        "column_start": 12,
        "column_end": 38
      },
      "recommendation": "reject"
    }
  ],
  "performance": {
    "latency_ms": 4.2,
    "target_ms": 10,
    "meets_sla": true
  }
}
```

### 2. `npx aimds analyze`

Behavioral analysis for temporal patterns and anomalies.

#### Usage
```bash
npx aimds analyze [options] [input]

# Examples
npx aimds analyze --sessions logs/
npx aimds analyze --baseline --learn logs/normal/
npx aimds analyze --compare baseline.json logs/test/
npx aimds analyze --watch logs/ --alert
```

#### Options
```
Input:
  --sessions <path>       Directory of session logs
  --stream <url>          Analyze streaming data
  --stdin                 Read from standard input
  --watch <path>          Watch directory for new sessions

Analysis:
  --baseline              Create behavioral baseline
  --learn                 Enable online learning
  --compare <path>        Compare against baseline
  --temporal              Temporal pattern analysis
  --anomaly-only          Report anomalies only
  --window <duration>     Analysis window (e.g., 1h, 30m, default: 5m)

Detection:
  --sensitivity <level>   Sensitivity: low|medium|high (default: medium)
  --threshold <float>     Anomaly threshold (0.0-1.0, default: 0.7)
  --models <path>         Custom ML models directory

Output:
  --format <fmt>          Output format: text|json|yaml|html (default: text)
  --output <path>         Write results to file
  --report                Generate detailed HTML report
  --alerts <path>         Alert configuration file

Performance:
  --max-latency <ms>      Maximum latency (default: 100)
  --memory-limit <mb>     Memory limit (default: 512)
```

#### Output Format

**Text:**
```
📊 AIMDS Behavioral Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dataset:      logs/ (1,247 sessions)
Timeframe:    2025-10-20 to 2025-10-27 (7 days)
Baseline:     baseline.json (loaded)
Duration:     87.3ms

Temporal Patterns:
  📈 Request Rate
     Normal:   120 req/min (±15)
     Current:  340 req/min (+183%) ⚠️

  🔄 Session Duration
     Normal:   45s (±12s)
     Current:  12s (-73%) ⚠️

Anomalies Detected:
  ❌ Burst Attack Pattern (confidence: 0.92)
     Timestamp: 2025-10-27 08:15:23
     Duration: 3 minutes
     Requests: 1,024 in rapid succession

  ⚠️  Unusual Prompt Patterns (confidence: 0.78)
     Detected: Repetitive system commands
     Frequency: 45 occurrences/min (normal: 2/min)

Risk Score: 8.5/10 (HIGH)

Recommendations:
  • Enable rate limiting
  • Review session logs for attack patterns
  • Update anomaly detection baseline
  • Alert security team

Performance: 87.3ms (target: <100ms) ✓
```

### 3. `npx aimds verify`

Formal verification of AI behavior policies.

#### Usage
```bash
npx aimds verify [options] <policy>

# Examples
npx aimds verify policies/safety.ltl
npx aimds verify --policy policies/ --all
npx aimds verify --interactive safety-policy
npx aimds verify --prove theorem.lean
```

#### Options
```
Input:
  <policy>                Policy file to verify
  --all                   Verify all policies in directory
  --policy <path>         Policy file or directory
  --stdin                 Read policy from stdin

Verification:
  --ltl                   Use LTL (Linear Temporal Logic)
  --dependent-types       Use dependent type verification
  --prove                 Generate formal proof
  --interactive           Interactive theorem proving
  --timeout <seconds>     Verification timeout (default: 30)

Integration:
  --lean                  Use Lean theorem prover
  --coq                   Use Coq theorem prover
  --z3                    Use Z3 SMT solver
  --custom <path>         Custom verifier binary

Output:
  --format <fmt>          Output format: text|json|coq|lean (default: text)
  --output <path>         Write proof to file
  --verbose               Show detailed proof steps
  --certificate           Generate verification certificate

Performance:
  --max-latency <ms>      Maximum latency (default: 500)
  --parallel              Verify policies in parallel
```

#### Output Format

**Text:**
```
🔐 AIMDS Formal Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Policy:       safety.ltl
Method:       LTL Model Checking
Duration:     287ms

Policy Definition:
  □ (request → ◇ (response ∨ reject))
  "All requests eventually receive response or rejection"

Verification Result: ✓ PROVED

Proof Steps:
  1. Parse LTL formula ✓
  2. Construct Büchi automaton ✓
  3. Check emptiness ✓
  4. Generate witness ✓

Properties Verified:
  ✓ Safety: No unsafe states reachable
  ✓ Liveness: All requests eventually handled
  ✓ Fairness: No request starvation

Counterexamples: None

Certificate:
  Proof Hash: sha256:def456...
  Timestamp:  2025-10-27T10:30:45Z
  Verifier:   AIMDS v1.0.0 + Lean 4.2.0

Performance: 287ms (target: <500ms) ✓
```

### 4. `npx aimds respond`

Adaptive response to detected manipulation attempts.

#### Usage
```bash
npx aimds respond [options] <threat>

# Examples
npx aimds respond --threat-file threat.json
npx aimds respond --auto --strategy aggressive
npx aimds respond --mitigate --rollback
npx aimds respond --learn --from-logs logs/
```

#### Options
```
Input:
  <threat>                Threat ID or description
  --threat-file <path>    Threat detection result file
  --stdin                 Read threat from stdin
  --auto                  Automatic response mode

Response:
  --strategy <name>       Response strategy: passive|balanced|aggressive
  --mitigate              Apply mitigation actions
  --rollback              Rollback to safe state
  --quarantine            Quarantine suspicious input
  --alert                 Send alert notifications

Learning:
  --learn                 Enable meta-learning
  --optimize              Optimize response strategy
  --from-logs <path>      Learn from historical logs
  --feedback <path>       Load feedback data

Safety:
  --dry-run               Simulate response without executing
  --confirm               Require confirmation for actions
  --max-impact <level>    Maximum impact level: low|medium|high

Output:
  --format <fmt>          Output format: text|json|yaml (default: text)
  --output <path>         Write response plan to file
  --audit                 Generate audit log entry

Performance:
  --max-latency <ms>      Maximum latency (default: 50)
  --async                 Execute asynchronously
```

#### Output Format

**Text:**
```
⚡ AIMDS Adaptive Response
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Threat:       prompt_injection_001
Severity:     HIGH (8.5/10)
Strategy:     Balanced
Duration:     23.4ms

Response Plan:
  1. ✓ Input Sanitization
     • Remove malicious patterns
     • Escape special characters
     • Normalize whitespace

  2. ✓ Context Injection
     • Add safety preamble
     • Reinforce system instructions
     • Set behavioral boundaries

  3. ✓ Rate Limiting
     • Reduce request quota
     • Add cooldown period: 60s
     • Flag source IP for monitoring

Actions Taken:
  ✓ Sanitized input (4.2ms)
  ✓ Injected safety context (3.1ms)
  ✓ Updated rate limits (2.8ms)
  ✓ Logged to audit trail (1.3ms)

Learning Update:
  • Pattern added to detection database
  • Response effectiveness: TBD
  • Strategy confidence: 0.87 → 0.89 (+0.02)

State:
  Before:  VULNERABLE
  After:   PROTECTED

Rollback Available: Yes (rollback-id: rb-20251027-1030)

Performance: 23.4ms (target: <50ms) ✓
```

### 5. `npx aimds stream`

High-performance stream processing mode.

#### Usage
```bash
npx aimds stream [options]

# Examples
npx aimds stream --port 3000
npx aimds stream --unix-socket /tmp/aimds.sock
npx aimds stream --stdin --output responses.jsonl
echo "test" | npx aimds stream --format ndjson
```

#### Options
```
Server:
  --port <number>         TCP port (default: 3000)
  --host <address>        Bind address (default: 127.0.0.1)
  --unix-socket <path>    Unix domain socket
  --tls                   Enable TLS
  --cert <path>           TLS certificate
  --key <path>            TLS private key

Processing:
  --detect                Enable detection
  --analyze               Enable analysis
  --verify                Enable verification
  --respond               Enable adaptive response
  --all                   Enable all modules

Protocol:
  --protocol <name>       Protocol: http|websocket|grpc|tcp (default: http)
  --format <fmt>          Message format: json|ndjson|msgpack (default: json)
  --compression           Enable compression (gzip)

Performance:
  --workers <n>           Worker threads (default: CPU count)
  --batch-size <n>        Batch size (default: 10)
  --max-latency <ms>      Maximum latency (default: 10)
  --buffer-size <kb>      Buffer size (default: 64)

Output:
  --log <path>            Log file
  --audit <path>          Audit log
  --metrics               Enable Prometheus metrics
  --metrics-port <n>      Metrics port (default: 9090)
```

#### Output Format

**Startup:**
```
🚀 AIMDS Stream Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Version:      1.0.0
Protocol:     HTTP/1.1
Address:      http://127.0.0.1:3000
Workers:      8
Modules:      detect, analyze, respond

Endpoints:
  POST   /detect          Real-time detection
  POST   /analyze         Behavioral analysis
  POST   /verify          Policy verification
  POST   /respond         Adaptive response
  GET    /health          Health check
  GET    /metrics         Prometheus metrics

Performance Targets:
  Detection:   <10ms
  Analysis:    <100ms
  Verification:<500ms
  Response:    <50ms

Ready to accept connections... ✓
```

### 6. `npx aimds watch`

Monitor directories and files for threats.

#### Usage
```bash
npx aimds watch [options] <path>

# Examples
npx aimds watch ./prompts --alert
npx aimds watch ./logs --analyze --baseline baseline.json
npx aimds watch ./api-logs --stream --output alerts.json
```

#### Options
```
Input:
  <path>                  Directory or file to watch
  --recursive             Watch subdirectories
  --pattern <glob>        File pattern (e.g., *.txt, *.log)
  --ignore <pattern>      Ignore pattern

Detection:
  --detect                Run detection on changes
  --analyze               Run behavioral analysis
  --verify <policy>       Verify against policy
  --baseline <path>       Baseline for comparison

Response:
  --alert                 Send alerts on threats
  --auto-respond          Automatic threat response
  --quarantine <path>     Move threats to quarantine

Output:
  --output <path>         Write results to file
  --format <fmt>          Output format: text|json|ndjson
  --log <path>            Log file
  --quiet                 Suppress output except threats

Performance:
  --debounce <ms>         Debounce delay (default: 100)
  --batch                 Batch file changes
```

### 7. `npx aimds benchmark`

Performance testing and validation.

#### Usage
```bash
npx aimds benchmark [options] [suite]

# Examples
npx aimds benchmark --all
npx aimds benchmark detection
npx aimds benchmark --compare baseline.json
npx aimds benchmark --export results.json
```

#### Options
```
Suites:
  detection               Detection module benchmarks
  analysis                Analysis module benchmarks
  verification            Verification module benchmarks
  response                Response module benchmarks
  all                     All benchmarks (default)

Configuration:
  --iterations <n>        Iterations per test (default: 1000)
  --warmup <n>            Warmup iterations (default: 100)
  --timeout <seconds>     Timeout per test (default: 60)
  --parallel              Run tests in parallel

Comparison:
  --compare <path>        Compare against baseline
  --regression            Check for performance regression
  --threshold <percent>   Regression threshold (default: 10)

Output:
  --format <fmt>          Output format: text|json|html|csv
  --export <path>         Export results
  --report                Generate HTML report
  --chart                 Include performance charts
```

#### Output Format

```
⚡ AIMDS Performance Benchmarks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

System:       Linux x64, Node.js v20.10.0
Date:         2025-10-27T10:30:45Z
Iterations:   1,000 per test

Detection Module:
  Pattern Matching          4.2ms  (p50)   5.1ms  (p95)   ✓
  Prompt Injection          6.8ms  (p50)   8.3ms  (p95)   ✓
  PII Detection            7.1ms  (p50)   9.2ms  (p95)   ✓
  Stream Processing        2.1ms  (p50)   3.4ms  (p95)   ✓
  Target: <10ms            ALL TESTS PASSED

Analysis Module:
  Temporal Analysis        48.3ms (p50)   67.2ms (p95)   ✓
  Anomaly Detection        73.2ms (p50)   95.1ms (p95)   ✓
  Baseline Learning        89.4ms (p50)   112ms  (p95)   ⚠️
  Behavioral Scoring       31.2ms (p50)   43.8ms (p95)   ✓
  Target: <100ms           3/4 PASSED, 1 WARNING

Verification Module:
  LTL Checking            287ms  (p50)   412ms  (p95)   ✓
  Type Verification       334ms  (p50)   478ms  (p95)   ✓
  Theorem Proving         523ms  (p50)   687ms  (p95)   ⚠️
  Target: <500ms          2/3 PASSED, 1 WARNING

Response Module:
  Mitigation Selection     18.3ms (p50)   24.1ms (p95)   ✓
  Strategy Optimization    32.4ms (p50)   41.2ms (p95)   ✓
  Rollback Execution       21.8ms (p50)   28.3ms (p95)   ✓
  Learning Update          38.7ms (p50)   47.2ms (p95)   ✓
  Target: <50ms            ALL TESTS PASSED

Overall: 14/16 PASSED (87.5%) ✓

Recommendations:
  ⚠️  Analysis baseline learning slightly over target
  ⚠️  Verification theorem proving needs optimization
```

### 8. `npx aimds test`

Run test suite.

#### Usage
```bash
npx aimds test [options] [pattern]

# Examples
npx aimds test
npx aimds test detection
npx aimds test --coverage
npx aimds test --watch
```

### 9. `npx aimds metrics`

Export Prometheus metrics.

#### Usage
```bash
npx aimds metrics [options]

# Examples
npx aimds metrics --export metrics.prom
npx aimds metrics --server --port 9090
npx aimds metrics --format json
```

### 10. `npx aimds config`

Configuration management.

#### Usage
```bash
npx aimds config [command] [options]

# Examples
npx aimds config init
npx aimds config get detection.threshold
npx aimds config set detection.threshold 0.9
npx aimds config validate
```

## Configuration File

**`.aimds.yaml`:**
```yaml
# AIMDS Configuration

version: "1.0"

# Detection settings
detection:
  threshold: 0.8
  mode: balanced  # fast|balanced|thorough
  pii_detection: true
  patterns: ./patterns/

# Analysis settings
analysis:
  baseline: ./baselines/
  sensitivity: medium  # low|medium|high
  window: 5m
  anomaly_threshold: 0.7
  learning: true

# Verification settings
verification:
  method: ltl  # ltl|dependent-types|lean|coq
  timeout: 30
  parallel: true
  policies: ./policies/

# Response settings
response:
  strategy: balanced  # passive|balanced|aggressive
  auto_respond: false
  rollback: true
  learning: true

# Integration settings
integrations:
  agentdb:
    enabled: true
    endpoint: http://localhost:8000
    namespace: aimds

  prometheus:
    enabled: true
    port: 9090
    path: /metrics

  lean:
    enabled: false
    binary: lean

# Performance settings
performance:
  workers: auto  # auto or number
  max_memory_mb: 512
  batch_size: 10

# Logging
logging:
  level: info  # debug|info|warn|error
  file: ./logs/aimds.log
  audit: ./logs/audit.log
  format: json  # json|text
```

## Error Handling

All commands follow consistent error handling:

```
Error: [ERROR_CODE] Error message

Details: Additional context about the error

Troubleshooting:
  • Suggestion 1
  • Suggestion 2

For more help: npx aimds help <command>
Documentation: https://docs.aimds.io
```

**Exit Codes:**
- `0`: Success
- `1`: General error
- `2`: Invalid input
- `3`: Configuration error
- `4`: Performance SLA violation
- `5`: Threat detected (in detect mode)
- `6`: Verification failed
- `7`: Network error
- `8`: Integration error

## Shell Completion

Install shell completion:

```bash
# Bash
npx aimds completion bash > /etc/bash_completion.d/aimds

# Zsh
npx aimds completion zsh > ~/.zsh/completion/_aimds

# Fish
npx aimds completion fish > ~/.config/fish/completions/aimds.fish
```

## Environment Variables

```bash
AIMDS_CONFIG=/path/to/config.yaml     # Configuration file
AIMDS_LOG_LEVEL=debug                 # Log level
AIMDS_NO_COLOR=1                      # Disable colors
AIMDS_WORKERS=4                       # Worker count
AIMDS_AGENTDB_URL=http://localhost    # AgentDB endpoint
AIMDS_PROMETHEUS_PORT=9090            # Metrics port
```

## CLI Design Patterns

### Progressive Enhancement
```bash
# Simple
npx aimds detect --text "test prompt"

# Intermediate
npx aimds detect --file prompt.txt --threshold 0.9

# Advanced
npx aimds detect \
  --file prompt.txt \
  --patterns custom-patterns/ \
  --threshold 0.9 \
  --pii \
  --deep \
  --json \
  --output results.json
```

### Pipe-Friendly
```bash
# Input from pipe
echo "test" | npx aimds detect --stdin

# Output to pipe
npx aimds detect --text "test" --json | jq '.findings'

# Chain commands
npx aimds detect --text "test" --json | \
  npx aimds respond --stdin --auto
```

### Interactive Mode
```bash
# Interactive prompts when needed
npx aimds respond --threat-file threat.json --confirm
> Mitigation will modify system state. Continue? (y/N)

# Non-interactive with flags
npx aimds respond --threat-file threat.json --yes
```

## Best Practices

1. **Use configuration files** for repeated settings
2. **Enable JSON output** for automation
3. **Set appropriate thresholds** based on use case
4. **Monitor performance** with benchmarks
5. **Review audit logs** regularly
6. **Update patterns** periodically
7. **Test policies** with verify command
8. **Use watch mode** for real-time protection
