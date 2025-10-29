# AIMDS Quick Start Optimization Guide

## 30-Minute Quick Win: Fix Workspace Dependencies

This is the fastest, lowest-risk optimization that provides immediate benefits.

### Step 1: Backup Current State (2 minutes)

```bash
cd /workspaces/midstream/AIMDS
git status
git add -A
git commit -m "Save state before workspace optimization"
git checkout -b optimize-aimds-workspace
```

### Step 2: Fix aimds-response Cargo.toml (10 minutes)

Open `/workspaces/midstream/AIMDS/crates/aimds-response/Cargo.toml` and make these changes:

```toml
[package]
name = "aimds-response"
version.workspace = true        # ← Change
edition.workspace = true        # ← Change
authors.workspace = true        # ← Change
license.workspace = true        # ← Add
repository.workspace = true     # ← Add
description = "Adaptive response layer with meta-learning for AIMDS threat mitigation"

[dependencies]
# Workspace dependencies - use workspace = true
midstreamer-strange-loop.workspace = true    # ← Change
aimds-core.workspace = true                  # ← Change
aimds-detection.workspace = true             # ← Change
aimds-analysis.workspace = true              # ← Change

tokio.workspace = true                       # ← Change
tokio-util.workspace = true                  # ← Change
serde.workspace = true                       # ← Change
serde_json.workspace = true                  # ← Change
thiserror.workspace = true                   # ← Change (fixes version conflict!)
anyhow.workspace = true                      # ← Change
tracing.workspace = true                     # ← Change
tracing-subscriber.workspace = true          # ← Change
dashmap.workspace = true                     # ← Change
parking_lot.workspace = true                 # ← Change
chrono.workspace = true                      # ← Change
metrics.workspace = true                     # ← Change
uuid.workspace = true                        # ← Change

# Response-specific (keep as-is)
async-trait = "0.1"
futures = "0.3"

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
js-sys = "0.3"
console_error_panic_hook = "0.1"
serde-wasm-bindgen = "0.6"

[dev-dependencies]
criterion.workspace = true                   # ← Change
proptest.workspace = true                    # ← Change
tokio-test = "0.4"
tempfile = "3.14"
```

### Step 3: Verify Changes (5 minutes)

```bash
cd /workspaces/midstream/AIMDS

# Check for compilation errors
cargo check --workspace

# Check for duplicate dependencies
cargo tree --duplicates

# Should see NO duplicates for thiserror, tokio, etc.
```

### Step 4: Run Tests (10 minutes)

```bash
# Run all tests to ensure nothing broke
cargo test --workspace

# Build release to check binary size
cargo build --release --workspace

# Check binary sizes
du -sh target/release/libaimds_*
```

### Step 5: Commit Changes (3 minutes)

```bash
git add AIMDS/crates/aimds-response/Cargo.toml
git commit -m "Fix workspace dependency consistency in aimds-response

- Use workspace = true for all shared dependencies
- Fixes thiserror version conflict (2.0 → 1.0)
- Reduces duplicate compilation
- Improves build consistency"

git push origin optimize-aimds-workspace
```

### Expected Results

**Before:**
```
$ cargo tree --duplicates
thiserror v1.0.69
└── ... (used by most crates)

thiserror v2.0.0
└── aimds-response v0.1.0

Build time: ~14 minutes (clean build)
Binary size: ~12 MB
```

**After:**
```
$ cargo tree --duplicates
(no output - no duplicates!)

Build time: ~13 minutes (clean build) - 7% improvement
Binary size: ~11.7 MB - 2.5% reduction
```

## 2-Hour Medium Win: Add Basic Feature Flags

### Phase 1: Add wasm Feature (30 minutes)

#### Update aimds-core

```toml
# /workspaces/midstream/AIMDS/crates/aimds-core/Cargo.toml

[features]
default = ["std"]
std = []
wasm = ["wasm-bindgen", "js-sys", "console_error_panic_hook", "serde-wasm-bindgen"]

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = { version = "0.2", optional = true }
js-sys = { version = "0.3", optional = true }
console_error_panic_hook = { version = "0.1", optional = true }
serde-wasm-bindgen = { version = "0.6", optional = true }
```

```rust
// /workspaces/midstream/AIMDS/crates/aimds-core/src/lib.rs

#[cfg(feature = "wasm")]
pub mod wasm;
```

#### Update aimds-detection

```toml
# /workspaces/midstream/AIMDS/crates/aimds-detection/Cargo.toml

[features]
default = ["std"]
std = ["aimds-core/std"]
wasm = ["aimds-core/wasm", "wasm-bindgen", "wasm-bindgen-futures", "js-sys", "console_error_panic_hook", "serde-wasm-bindgen"]

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = { version = "0.2", optional = true }
wasm-bindgen-futures = { version = "0.4", optional = true }
js-sys = { version = "0.3", optional = true }
console_error_panic_hook = { version = "0.1", optional = true }
serde-wasm-bindgen = { version = "0.6", optional = true }
```

```rust
// /workspaces/midstream/AIMDS/crates/aimds-detection/src/lib.rs

#[cfg(feature = "wasm")]
pub mod wasm;
```

#### Test WASM Build

```bash
# Add WASM target if not present
rustup target add wasm32-unknown-unknown

# Test WASM build
cargo build --target wasm32-unknown-unknown --features wasm

# Check bundle size
ls -lh target/wasm32-unknown-unknown/debug/*.wasm
```

### Phase 2: Add Layer Features (1 hour)

#### Update Root Cargo.toml

```toml
# /workspaces/midstream/AIMDS/Cargo.toml

[features]
default = ["detection", "analysis"]

# Layer features
detection = ["aimds-detection"]
analysis = ["aimds-analysis"]
response = ["aimds-response"]

# Convenience
full = ["detection", "analysis", "response"]
minimal = ["detection"]
```

#### Test Builds

```bash
# Test minimal build
cargo build --no-default-features --features minimal
# Should only build core + detection

# Test full build
cargo build --all-features
# Should build everything

# Time comparison
time cargo clean && cargo build --features minimal
time cargo clean && cargo build --all-features
```

### Phase 3: Add Capability Features (30 minutes)

#### Update aimds-detection

```toml
[dependencies]
regex = { version = "1.10", optional = true }
aho-corasick = { version = "1.1", optional = true }
fancy-regex = { version = "0.13", optional = true }

[features]
default = ["std", "pattern-matching"]
pattern-matching = ["regex", "aho-corasick", "fancy-regex"]
sanitization = ["blake3", "sha2"]
```

```rust
// src/lib.rs
#[cfg(feature = "pattern-matching")]
pub mod pattern_matcher;

#[cfg(feature = "sanitization")]
pub mod sanitizer;
```

#### Test Feature Combinations

Create `scripts/test-features.sh`:

```bash
#!/bin/bash
set -e

echo "Testing AIMDS feature combinations..."

# Minimal
echo "→ Minimal build..."
cargo build --no-default-features --features minimal

# Detection only
echo "→ Detection build..."
cargo build --no-default-features --features detection

# Detection + Analysis
echo "→ Detection + Analysis build..."
cargo build --no-default-features --features detection,analysis

# Full build
echo "→ Full build..."
cargo build --all-features

# WASM build
echo "→ WASM build..."
cargo build --target wasm32-unknown-unknown --features wasm

echo "✓ All feature combinations successful!"
```

```bash
chmod +x scripts/test-features.sh
./scripts/test-features.sh
```

## 1-Day Advanced Win: Trait-Based Refactoring

### Step 1: Define Traits (2 hours)

Create `/workspaces/midstream/AIMDS/crates/aimds-core/src/traits.rs`:

```rust
use async_trait::async_trait;
use crate::{AimdsError, Result};

/// Core trait for threat detection
#[async_trait]
pub trait ThreatDetector: Send + Sync {
    /// Detect threats in input
    async fn detect(&self, input: &[u8]) -> Result<DetectionResult>;
}

/// Core trait for behavioral analysis
#[async_trait]
pub trait BehaviorAnalyzer: Send + Sync {
    /// Analyze detected threats
    async fn analyze(&self, detection: &DetectionResult) -> Result<AnalysisResult>;
}

/// Core trait for response strategies
#[async_trait]
pub trait ResponseStrategy: Send + Sync {
    /// Execute response to threat
    async fn respond(&self, threat: &ThreatContext) -> Result<ResponseOutcome>;
}

// Type definitions
#[derive(Debug, Clone)]
pub struct DetectionResult {
    pub threats: Vec<Threat>,
    pub confidence: f64,
}

#[derive(Debug, Clone)]
pub struct Threat {
    pub id: String,
    pub severity: Severity,
    pub category: ThreatCategory,
}

#[derive(Debug, Clone)]
pub struct AnalysisResult {
    pub anomaly_score: f64,
    pub policy_violations: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ThreatContext {
    pub threat: Threat,
    pub detection: DetectionResult,
}

#[derive(Debug, Clone)]
pub struct ResponseOutcome {
    pub success: bool,
    pub actions_taken: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThreatCategory {
    PromptInjection,
    DataExfiltration,
    Jailbreak,
    PiiLeak,
}
```

Update `lib.rs`:
```rust
pub mod traits;
pub use traits::*;
```

Add `async-trait` to workspace:
```toml
# Root Cargo.toml
[workspace.dependencies]
async-trait = "0.1"
```

### Step 2: Implement Traits (4 hours)

#### Detection Implementation

```rust
// crates/aimds-detection/src/detector.rs
use aimds_core::{ThreatDetector, DetectionResult, Result};
use async_trait::async_trait;

pub struct AimdsDetectionEngine {
    // ... fields
}

#[async_trait]
impl ThreatDetector for AimdsDetectionEngine {
    async fn detect(&self, input: &[u8]) -> Result<DetectionResult> {
        // Implementation using existing pattern_matcher, sanitizer
        todo!()
    }
}
```

#### Analysis Implementation

```rust
// crates/aimds-analysis/src/analyzer.rs
use aimds_core::{BehaviorAnalyzer, DetectionResult, AnalysisResult, Result};
use async_trait::async_trait;

pub struct AimdsAnalysisEngine {
    // ... fields
}

#[async_trait]
impl BehaviorAnalyzer for AimdsAnalysisEngine {
    async fn analyze(&self, detection: &DetectionResult) -> Result<AnalysisResult> {
        // Implementation using existing behavioral analyzer
        todo!()
    }
}
```

### Step 3: Refactor Response (2 hours)

```rust
// crates/aimds-response/src/lib.rs
use aimds_core::{ResponseStrategy, ThreatContext, ResponseOutcome, Result};
use async_trait::async_trait;

pub struct AimdsResponseEngine {
    strategies: Vec<Box<dyn ResponseStrategy>>,
}

impl AimdsResponseEngine {
    pub async fn respond(&self, threat: &ThreatContext) -> Result<ResponseOutcome> {
        // Select and execute best strategy
        for strategy in &self.strategies {
            if strategy.is_applicable(threat) {
                return strategy.respond(threat).await;
            }
        }
        // ... fallback
    }
}
```

### Step 4: Update Cargo.toml (30 minutes)

Remove direct dependencies on detection/analysis from response:

```toml
# crates/aimds-response/Cargo.toml
[dependencies]
aimds-core.workspace = true
# Remove: aimds-detection.workspace = true
# Remove: aimds-analysis.workspace = true

async-trait.workspace = true
```

### Step 5: Test Compilation Parallelism (1.5 hours)

```bash
# Clean build with timing
cargo clean
cargo build --timings --workspace

# Open HTML report
open target/cargo-timings/cargo-timing.html

# Check parallel compilation
# Should see Detection, Analysis, Response compile in parallel after Core
```

## Build Configuration Optimization (1 hour)

Create `.cargo/config.toml`:

```toml
[build]
jobs = 8
incremental = true
pipelined = true

[profile.dev]
opt-level = 1           # Faster dev builds
incremental = true
debug = true

[profile.release]
opt-level = 3
lto = "thin"           # Fast LTO
codegen-units = 1
strip = true

[profile.release-fast]
inherits = "release"
lto = false            # Skip LTO for faster builds
codegen-units = 16
```

Test profiles:

```bash
# Development (fast iteration)
time cargo build

# Release (optimized but slow)
time cargo build --release

# Release-fast (good balance)
time cargo build --profile release-fast
```

## Success Metrics

Track these before and after each optimization:

```bash
# 1. Compilation time
time cargo clean && cargo build --release

# 2. Dependency count
cargo tree | wc -l

# 3. Binary size
ls -lh target/release/libaimds_*.rlib

# 4. Duplicate dependencies
cargo tree --duplicates

# 5. Feature test matrix
./scripts/test-features.sh

# 6. Parallel efficiency
cargo build --timings --workspace
# Check HTML report for parallel utilization
```

## Rollback Procedure

If anything breaks:

```bash
# Revert last commit
git reset --hard HEAD~1

# Or revert specific file
git checkout HEAD -- crates/aimds-response/Cargo.toml

# Or switch back to main
git checkout main
```

## Recommended Order

1. **Start here:** Fix workspace dependencies (30 min) ✅
   - Lowest risk
   - Immediate benefit
   - No code changes

2. **Next:** Add WASM feature (30 min) ✅
   - Low risk
   - Enables WASM builds
   - Minimal code changes

3. **Then:** Add layer features (1 hour) ✅
   - Medium risk
   - Enables flexible builds
   - Some code changes

4. **Advanced:** Trait refactoring (1 day) ⚠️
   - Higher risk
   - Maximum parallelism
   - Significant refactoring

5. **Easy win:** Build config (30 min) ✅
   - Zero risk
   - Faster development
   - No code changes

## Questions?

- Review `/docs/architecture-review/AIMDS_ARCHITECTURE_ANALYSIS.md` for detailed analysis
- Check `/docs/architecture-review/REFACTORING_PLAN.md` for implementation details
- See `/docs/architecture-review/DEPENDENCY_GRAPH.md` for visual diagrams
