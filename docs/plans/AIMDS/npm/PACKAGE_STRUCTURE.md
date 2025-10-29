# AIMDS Package Structure

## Directory Layout

```
aimds/
├── package.json                 # Package manifest
├── package-lock.json           # Locked dependencies
├── README.md                   # Main documentation
├── LICENSE                     # MIT License
├── .gitignore                  # Git ignore rules
├── .npmignore                  # NPM ignore rules
├── tsconfig.json               # TypeScript configuration
├── vitest.config.js            # Test configuration
├── .aimds.yaml                 # Default configuration
│
├── cli.js                      # CLI entry point (executable)
├── index.js                    # JavaScript API entry point
├── index.d.ts                  # TypeScript definitions
│
├── bin/                        # Executable binaries
│   └── aimds                   # Symlink to cli.js
│
├── src/                        # Source code
│   ├── cli/                    # CLI implementation
│   │   ├── commands/           # Command handlers
│   │   │   ├── detect.js
│   │   │   ├── analyze.js
│   │   │   ├── verify.js
│   │   │   ├── respond.js
│   │   │   ├── stream.js
│   │   │   ├── watch.js
│   │   │   ├── benchmark.js
│   │   │   ├── test.js
│   │   │   ├── metrics.js
│   │   │   └── config.js
│   │   ├── output/             # Output formatting
│   │   │   ├── formatters.js
│   │   │   ├── reporters.js
│   │   │   └── templates/
│   │   ├── utils/              # CLI utilities
│   │   │   ├── spinner.js
│   │   │   ├── colors.js
│   │   │   ├── errors.js
│   │   │   └── prompts.js
│   │   └── index.js            # CLI main
│   │
│   ├── detection/              # Detection module
│   │   ├── detector.js         # Main detector class
│   │   ├── patterns.js         # Pattern matching
│   │   ├── pii.js              # PII detection
│   │   ├── streaming.js        # Stream processing
│   │   └── index.js
│   │
│   ├── analysis/               # Analysis module
│   │   ├── analyzer.js         # Main analyzer class
│   │   ├── temporal.js         # Temporal analysis
│   │   ├── anomaly.js          # Anomaly detection
│   │   ├── baseline.js         # Baseline learning
│   │   ├── scoring.js          # Risk scoring
│   │   └── index.js
│   │
│   ├── verification/           # Verification module
│   │   ├── verifier.js         # Main verifier class
│   │   ├── ltl.js              # LTL model checking
│   │   ├── types.js            # Dependent types
│   │   ├── proofs.js           # Theorem proving
│   │   └── index.js
│   │
│   ├── response/               # Response module
│   │   ├── responder.js        # Main responder class
│   │   ├── mitigation.js       # Mitigation strategies
│   │   ├── learning.js         # Meta-learning
│   │   ├── rollback.js         # Rollback management
│   │   └── index.js
│   │
│   ├── integrations/           # Integration modules
│   │   ├── agentdb/            # AgentDB integration
│   │   │   ├── client.js
│   │   │   ├── vector-search.js
│   │   │   └── index.js
│   │   ├── lean/               # Lean integration
│   │   │   ├── client.js
│   │   │   ├── prover.js
│   │   │   └── index.js
│   │   ├── prometheus/         # Prometheus integration
│   │   │   ├── metrics.js
│   │   │   ├── exporter.js
│   │   │   └── index.js
│   │   └── audit/              # Audit logging
│   │       ├── logger.js
│   │       ├── trail.js
│   │       └── index.js
│   │
│   ├── stream/                 # Stream processing
│   │   ├── server.js           # Stream server
│   │   ├── processor.js        # Stream processor
│   │   ├── protocols/          # Protocol handlers
│   │   │   ├── http.js
│   │   │   ├── websocket.js
│   │   │   ├── grpc.js
│   │   │   └── tcp.js
│   │   └── index.js
│   │
│   ├── config/                 # Configuration
│   │   ├── loader.js           # Config loader
│   │   ├── validator.js        # Config validator
│   │   ├── defaults.js         # Default config
│   │   └── index.js
│   │
│   ├── utils/                  # Utilities
│   │   ├── errors.js           # Error classes
│   │   ├── logger.js           # Logging
│   │   ├── performance.js      # Performance utilities
│   │   ├── async.js            # Async helpers
│   │   └── index.js
│   │
│   └── wasm/                   # WASM loader
│       ├── loader.js           # WASM module loader
│       ├── core.js             # Core bindings
│       ├── detection.js        # Detection bindings
│       ├── analysis.js         # Analysis bindings
│       ├── response.js         # Response bindings
│       └── index.js
│
├── pkg/                        # WASM packages (browser)
│   ├── core/                   # aimds-core WASM
│   │   ├── aimds_core_bg.wasm
│   │   ├── aimds_core.js
│   │   ├── aimds_core.d.ts
│   │   └── package.json
│   ├── detection/              # aimds-detection WASM
│   │   ├── aimds_detection_bg.wasm
│   │   ├── aimds_detection.js
│   │   ├── aimds_detection.d.ts
│   │   └── package.json
│   ├── analysis/               # aimds-analysis WASM
│   │   ├── aimds_analysis_bg.wasm
│   │   ├── aimds_analysis.js
│   │   ├── aimds_analysis.d.ts
│   │   └── package.json
│   └── response/               # aimds-response WASM
│       ├── aimds_response_bg.wasm
│       ├── aimds_response.js
│       ├── aimds_response.d.ts
│       └── package.json
│
├── pkg-node/                   # WASM packages (Node.js)
│   ├── core/
│   ├── detection/
│   ├── analysis/
│   └── response/
│
├── pkg-bundler/                # WASM packages (bundlers)
│   ├── core/
│   ├── detection/
│   ├── analysis/
│   └── response/
│
├── tests/                      # Test suite
│   ├── unit/                   # Unit tests
│   │   ├── detection.test.js
│   │   ├── analysis.test.js
│   │   ├── verification.test.js
│   │   ├── response.test.js
│   │   └── integration.test.js
│   ├── integration/            # Integration tests
│   │   ├── agentdb.test.js
│   │   ├── lean.test.js
│   │   ├── prometheus.test.js
│   │   └── stream.test.js
│   ├── e2e/                    # End-to-end tests
│   │   ├── cli.test.js
│   │   ├── workflows.test.js
│   │   └── scenarios.test.js
│   ├── performance/            # Performance tests
│   │   ├── benchmarks.test.js
│   │   ├── latency.test.js
│   │   └── throughput.test.js
│   ├── fixtures/               # Test fixtures
│   │   ├── prompts/
│   │   ├── logs/
│   │   ├── policies/
│   │   └── threats/
│   └── helpers/                # Test helpers
│       ├── setup.js
│       ├── mocks.js
│       └── utils.js
│
├── examples/                   # Example projects
│   ├── basic-detection/
│   │   ├── index.js
│   │   └── README.md
│   ├── streaming-server/
│   │   ├── server.js
│   │   └── README.md
│   ├── agentdb-integration/
│   │   ├── index.js
│   │   └── README.md
│   ├── proxy-mode/
│   │   ├── proxy.js
│   │   └── README.md
│   └── policy-verification/
│       ├── verify.js
│       └── README.md
│
├── docs/                       # Documentation
│   ├── API.md                  # API reference
│   ├── CLI.md                  # CLI reference
│   ├── INTEGRATIONS.md         # Integration guides
│   ├── PERFORMANCE.md          # Performance guide
│   ├── TROUBLESHOOTING.md      # Troubleshooting
│   ├── CONTRIBUTING.md         # Contribution guide
│   ├── CHANGELOG.md            # Version history
│   └── tutorials/              # Tutorial content
│       ├── getting-started.md
│       ├── detection.md
│       ├── analysis.md
│       ├── verification.md
│       └── response.md
│
├── scripts/                    # Build and utility scripts
│   ├── build-wasm.sh           # Build WASM modules
│   ├── build-pkg.sh            # Build npm package
│   ├── test.sh                 # Run tests
│   ├── benchmark.sh            # Run benchmarks
│   ├── lint.sh                 # Lint code
│   ├── publish.sh              # Publish to npm
│   └── generate-docs.sh        # Generate docs
│
├── patterns/                   # Default detection patterns
│   ├── prompt-injection.yaml
│   ├── pii.yaml
│   ├── jailbreak.yaml
│   └── custom/
│
├── policies/                   # Default verification policies
│   ├── safety.ltl
│   ├── privacy.ltl
│   └── custom/
│
└── benchmarks/                 # Benchmark suite
    ├── detection-bench.js
    ├── analysis-bench.js
    ├── verification-bench.js
    ├── response-bench.js
    └── results/
        └── .gitkeep
```

## Key Files

### `package.json`

```json
{
  "name": "aimds",
  "version": "1.0.0",
  "description": "AI Manipulation Defense System - Real-time detection, analysis, and response",
  "keywords": [
    "ai",
    "security",
    "llm",
    "prompt-injection",
    "defense",
    "wasm",
    "detection",
    "analysis",
    "verification"
  ],
  "homepage": "https://github.com/yourusername/aimds#readme",
  "bugs": {
    "url": "https://github.com/yourusername/aimds/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/aimds.git"
  },
  "license": "MIT",
  "author": "Your Name <you@example.com>",
  "main": "index.js",
  "types": "index.d.ts",
  "bin": {
    "aimds": "cli.js"
  },
  "files": [
    "bin/",
    "src/",
    "pkg/",
    "pkg-node/",
    "pkg-bundler/",
    "cli.js",
    "index.js",
    "index.d.ts",
    "patterns/",
    "policies/",
    ".aimds.yaml",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "./scripts/build-pkg.sh",
    "build:wasm": "./scripts/build-wasm.sh",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "benchmark": "node benchmarks/detection-bench.js",
    "lint": "eslint src/ tests/",
    "format": "prettier --write 'src/**/*.js' 'tests/**/*.js'",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm test",
    "docs": "./scripts/generate-docs.sh"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.1",
    "axios": "^1.6.0",
    "ws": "^8.14.0",
    "prom-client": "^15.1.0",
    "chokidar": "^3.5.3",
    "yaml": "^2.3.4",
    "winston": "^3.11.0",
    "inquirer": "^9.2.12"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "esbuild": "^0.19.0"
  },
  "optionalDependencies": {
    "agentdb": "^2.0.0",
    "lean-client": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### `cli.js`

```javascript
#!/usr/bin/env node

/**
 * AIMDS CLI Entry Point
 *
 * AI Manipulation Defense System command-line interface.
 * Provides real-time detection, analysis, verification, and response.
 */

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('./package.json');

// Import command handlers
const detectCommand = require('./src/cli/commands/detect');
const analyzeCommand = require('./src/cli/commands/analyze');
const verifyCommand = require('./src/cli/commands/verify');
const respondCommand = require('./src/cli/commands/respond');
const streamCommand = require('./src/cli/commands/stream');
const watchCommand = require('./src/cli/commands/watch');
const benchmarkCommand = require('./src/cli/commands/benchmark');
const testCommand = require('./src/cli/commands/test');
const metricsCommand = require('./src/cli/commands/metrics');
const configCommand = require('./src/cli/commands/config');

// Configure main program
program
  .name('aimds')
  .description('AI Manipulation Defense System - Real-time AI security')
  .version(pkg.version)
  .option('-c, --config <path>', 'configuration file', '.aimds.yaml')
  .option('-q, --quiet', 'suppress non-essential output')
  .option('-v, --verbose', 'verbose logging', (v, total) => total + 1, 0)
  .option('--json', 'output in JSON format')
  .option('--no-color', 'disable colored output');

// Register commands
detectCommand(program);
analyzeCommand(program);
verifyCommand(program);
respondCommand(program);
streamCommand(program);
watchCommand(program);
benchmarkCommand(program);
testCommand(program);
metricsCommand(program);
configCommand(program);

// Error handler
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  }

  console.error(chalk.red('Error:'), err.message);

  if (program.opts().verbose > 0) {
    console.error(err.stack);
  }

  process.exit(err.exitCode || 1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```

### `index.js`

```javascript
/**
 * AIMDS JavaScript API
 *
 * Programmatic interface to AIMDS functionality.
 */

const { Detector } = require('./src/detection');
const { Analyzer } = require('./src/analysis');
const { Verifier } = require('./src/verification');
const { Responder } = require('./src/response');
const { StreamProcessor } = require('./src/stream');
const { ConfigLoader } = require('./src/config');

// Export main classes
module.exports = {
  // Core modules
  Detector,
  Analyzer,
  Verifier,
  Responder,
  StreamProcessor,

  // Configuration
  ConfigLoader,

  // Integrations
  AgentDBClient: require('./src/integrations/agentdb'),
  LeanClient: require('./src/integrations/lean'),
  PrometheusExporter: require('./src/integrations/prometheus'),
  AuditLogger: require('./src/integrations/audit'),

  // Utilities
  utils: require('./src/utils'),

  // Version
  version: require('./package.json').version,
};
```

### `index.d.ts`

```typescript
/**
 * TypeScript definitions for AIMDS
 */

export interface DetectionOptions {
  threshold?: number;
  mode?: 'fast' | 'balanced' | 'thorough';
  pii?: boolean;
  deep?: boolean;
  patterns?: string;
}

export interface DetectionResult {
  status: 'safe' | 'suspicious' | 'threat';
  confidence: number;
  findings: Finding[];
  performance: PerformanceMetrics;
}

export interface Finding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  pattern: string;
  location: Location;
  recommendation: string;
}

export interface Location {
  line: number;
  column_start: number;
  column_end: number;
}

export interface PerformanceMetrics {
  latency_ms: number;
  target_ms: number;
  meets_sla: boolean;
}

export class Detector {
  constructor(options?: DetectionOptions);
  detect(text: string): Promise<DetectionResult>;
  detectStream(stream: NodeJS.ReadableStream): AsyncIterator<DetectionResult>;
}

export class Analyzer {
  constructor(options?: AnalysisOptions);
  analyze(data: AnalysisInput): Promise<AnalysisResult>;
  createBaseline(data: AnalysisInput[]): Promise<Baseline>;
}

export class Verifier {
  constructor(options?: VerificationOptions);
  verify(policy: string): Promise<VerificationResult>;
  prove(theorem: string): Promise<ProofResult>;
}

export class Responder {
  constructor(options?: ResponseOptions);
  respond(threat: Threat): Promise<ResponseResult>;
  optimize(feedback: Feedback[]): Promise<void>;
}

export class StreamProcessor {
  constructor(options?: StreamOptions);
  start(): Promise<void>;
  stop(): Promise<void>;
  process(data: any): Promise<any>;
}

export class ConfigLoader {
  static load(path: string): Promise<Config>;
  static validate(config: Config): boolean;
}

// Additional type exports...
export * from './src/detection';
export * from './src/analysis';
export * from './src/verification';
export * from './src/response';
```

### `.aimds.yaml`

```yaml
# AIMDS Default Configuration

version: "1.0"

detection:
  threshold: 0.8
  mode: balanced
  pii_detection: true
  patterns: ./patterns/

analysis:
  baseline: ./baselines/
  sensitivity: medium
  window: 5m
  anomaly_threshold: 0.7
  learning: true

verification:
  method: ltl
  timeout: 30
  parallel: true
  policies: ./policies/

response:
  strategy: balanced
  auto_respond: false
  rollback: true
  learning: true

integrations:
  agentdb:
    enabled: false
    endpoint: http://localhost:8000

  prometheus:
    enabled: false
    port: 9090

performance:
  workers: auto
  max_memory_mb: 512
  batch_size: 10

logging:
  level: info
  file: ./logs/aimds.log
  format: json
```

## Build Artifacts

After building, the package includes:

```
aimds/
├── dist/                       # Compiled distribution
│   ├── aimds.js               # Bundled JavaScript
│   ├── aimds.min.js           # Minified bundle
│   └── aimds.d.ts             # Type definitions
│
└── node_modules/              # Dependencies (not published)
```

## NPM Package Contents

When published to npm, the package contains:

- Source code (`src/`)
- WASM modules (`pkg/`, `pkg-node/`, `pkg-bundler/`)
- CLI executable (`cli.js`, `bin/`)
- JavaScript API (`index.js`, `index.d.ts`)
- Default patterns and policies
- Documentation (`README.md`)
- License (`LICENSE`)

**Excluded from package:**
- Tests (`tests/`)
- Build scripts (`scripts/`)
- Examples (linked in README)
- Benchmarks (linked in README)
- Documentation source (hosted separately)

## File Size Targets

| Component | Size | Notes |
|-----------|------|-------|
| WASM (core) | <500 KB | Compressed |
| WASM (detection) | <300 KB | Compressed |
| WASM (analysis) | <400 KB | Compressed |
| WASM (response) | <250 KB | Compressed |
| JavaScript | <100 KB | Minified |
| Total package | <2 MB | Including all assets |

## Development Workflow

```bash
# Clone repository
git clone https://github.com/yourusername/aimds.git
cd aimds

# Install dependencies
npm install

# Build WASM modules
npm run build:wasm

# Build package
npm run build

# Run tests
npm test

# Run benchmarks
npm run benchmark

# Test CLI locally
npm link
npx aimds --version

# Publish to npm
npm publish
```

## Module Resolution

The package supports multiple module systems:

### CommonJS (Node.js)
```javascript
const { Detector } = require('aimds');
```

### ES Modules
```javascript
import { Detector } from 'aimds';
```

### Browser (via bundler)
```javascript
import { Detector } from 'aimds/pkg-bundler';
```

### Browser (direct)
```html
<script type="module">
  import { Detector } from './node_modules/aimds/pkg/core/aimds_core.js';
</script>
```

## Platform Support

| Platform | Support | Notes |
|----------|---------|-------|
| Node.js 18+ | ✅ Full | Primary target |
| Node.js 16 | ⚠️ Limited | Some features unavailable |
| Browsers | ✅ Full | Via WASM |
| Deno | ⚠️ Experimental | Requires npm: specifier |
| Bun | ✅ Full | Native support |

## Security Considerations

1. **WASM sandboxing**: All WASM runs in isolated environment
2. **No eval()**: No dynamic code execution
3. **Input validation**: All inputs validated before WASM calls
4. **Memory limits**: Configurable memory limits
5. **Audit logging**: All security events logged
6. **Dependency scanning**: Regular security audits
