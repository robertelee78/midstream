# AIMDS Refactoring Implementation Plan

## Quick Win: Fix Workspace Dependencies (Phase 1)

### File: `/workspaces/midstream/AIMDS/crates/aimds-response/Cargo.toml`

**Changes needed:**

```diff
[package]
name = "aimds-response"
-version = "0.1.0"
-edition = "2021"
-authors = ["AIMDS Team"]
+version.workspace = true
+edition.workspace = true
+authors.workspace = true
+license.workspace = true
+repository.workspace = true
description = "Adaptive response layer with meta-learning for AIMDS threat mitigation"
-license = "MIT OR Apache-2.0"

[dependencies]
# Workspace dependencies
-midstreamer-strange-loop = { version = "0.1.0", path = "../../../crates/strange-loop" }
-aimds-core = { version = "0.1.0", path = "../aimds-core" }
-aimds-detection = { version = "0.1.0", path = "../aimds-detection" }
-aimds-analysis = { version = "0.1.0", path = "../aimds-analysis" }
+midstreamer-strange-loop.workspace = true
+aimds-core.workspace = true
+aimds-detection.workspace = true
+aimds-analysis.workspace = true

# Async runtime
-tokio = { version = "1.41", features = ["full"] }
-tokio-util = "0.7"
+tokio.workspace = true
+tokio-util.workspace = true

# Serialization
-serde = { version = "1.0", features = ["derive"] }
-serde_json = "1.0"
+serde.workspace = true
+serde_json.workspace = true

# Error handling
-thiserror = "2.0"
-anyhow = "1.0"
+thiserror.workspace = true
+anyhow.workspace = true

# Logging
-tracing = "0.1"
-tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
+tracing.workspace = true
+tracing-subscriber.workspace = true

# Collections and data structures
-dashmap = "6.1"
-parking_lot = "0.12"
+dashmap.workspace = true
+parking_lot.workspace = true

# Time handling
-chrono = { version = "0.4", features = ["serde"] }
+chrono.workspace = true

# Metrics
-metrics = "0.24"
+metrics.workspace = true

# Utilities
-uuid = { version = "1.11", features = ["v4", "serde"] }
+uuid.workspace = true
async-trait = "0.1"
futures = "0.3"

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
js-sys = "0.3"
console_error_panic_hook = "0.1"
serde-wasm-bindgen = "0.6"

[dev-dependencies]
-criterion = { version = "0.5", features = ["async_tokio", "html_reports"] }
+criterion.workspace = true
tokio-test = "0.4"
-proptest = "1.5"
+proptest.workspace = true
tempfile = "3.14"
```

## Feature Flags Implementation (Phase 2)

### 1. Update Root Workspace Cargo.toml

Add to `/workspaces/midstream/AIMDS/Cargo.toml`:

```toml
[workspace.dependencies]
# ... existing dependencies ...

# Feature-gated dependencies (optional)
ndarray = { version = "0.15", optional = true }
petgraph = { version = "0.6", optional = true }
statrs = { version = "0.16", optional = true }
regex = { version = "1.10", optional = true }
aho-corasick = { version = "1.1", optional = true }
fancy-regex = { version = "0.13", optional = true }

[features]
default = ["std", "detection", "analysis"]

# Core features
std = []
wasm = ["aimds-core/wasm"]

# Layer features
detection = ["aimds-detection"]
analysis = ["aimds-analysis"]
response = ["aimds-response"]

# Capability features
neural = ["analysis", "aimds-analysis/neural"]
temporal = ["analysis", "aimds-analysis/temporal"]
meta-learning = ["response", "aimds-response/meta-learning"]

# Convenience
full = ["detection", "analysis", "response", "neural", "temporal", "meta-learning"]
minimal = ["detection"]
```

### 2. Add Features to aimds-core

Add to `/workspaces/midstream/AIMDS/crates/aimds-core/Cargo.toml`:

```toml
[features]
default = ["std"]

# Core features
std = []
wasm = ["wasm-bindgen", "js-sys", "console_error_panic_hook", "serde-wasm-bindgen"]
validation = ["validator"]
```

### 3. Add Features to aimds-detection

Add to `/workspaces/midstream/AIMDS/crates/aimds-detection/Cargo.toml`:

```toml
[dependencies]
# Make some dependencies optional
regex = { version = "1.10", optional = true }
aho-corasick = { version = "1.1", optional = true }
fancy-regex = { version = "0.13", optional = true }
lru = { version = "0.12", optional = true }
midstreamer-temporal-compare = { workspace = true, optional = true }
midstreamer-scheduler = { workspace = true, optional = true }

[features]
default = ["std", "pattern-matching", "sanitization"]

# Core features
std = ["aimds-core/std"]
wasm = ["aimds-core/wasm", "wasm-bindgen", "wasm-bindgen-futures", "js-sys", "console_error_panic_hook", "serde-wasm-bindgen"]

# Detection capabilities
pattern-matching = ["regex", "aho-corasick", "fancy-regex", "lru"]
sanitization = ["blake3", "sha2"]
scheduling = ["midstreamer-scheduler"]
temporal = ["midstreamer-temporal-compare"]

# Convenience
full = ["pattern-matching", "sanitization", "scheduling", "temporal"]
minimal = []
```

Update source files to use feature gates:

```rust
// crates/aimds-detection/src/lib.rs

#[cfg(feature = "pattern-matching")]
pub mod pattern_matcher;

#[cfg(feature = "sanitization")]
pub mod sanitizer;

#[cfg(feature = "scheduling")]
pub mod scheduler;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

#[cfg(feature = "pattern-matching")]
pub use pattern_matcher::PatternMatcher;

#[cfg(feature = "sanitization")]
pub use sanitizer::{Sanitizer, PiiMatch, PiiType};

#[cfg(feature = "scheduling")]
pub use scheduler::{DetectionScheduler, ThreatPriority};
```

### 4. Add Features to aimds-analysis

Add to `/workspaces/midstream/AIMDS/crates/aimds-analysis/Cargo.toml`:

```toml
[dependencies]
# Make heavy dependencies optional
ndarray = { version = "0.15", optional = true }
statrs = { version = "0.16", optional = true }
petgraph = { version = "0.6", optional = true }
midstreamer-attractor = { workspace = true, optional = true }
midstreamer-neural-solver = { workspace = true, optional = true }
midstreamer-strange-loop = { workspace = true, optional = true }

[features]
default = ["std", "behavioral", "policy-verification"]

# Core features
std = ["aimds-core/std"]
wasm = ["aimds-core/wasm", "wasm-bindgen", "wasm-bindgen-futures", "js-sys", "console_error_panic_hook", "serde-wasm-bindgen"]

# Analysis capabilities
behavioral = []
policy-verification = []
ltl = ["petgraph"]
neural = ["midstreamer-neural-solver", "ndarray", "statrs"]
temporal = ["midstreamer-attractor"]
strange-loop = ["midstreamer-strange-loop"]

# Convenience
full = ["behavioral", "policy-verification", "ltl", "neural", "temporal", "strange-loop"]
minimal = ["behavioral"]
```

Update source files:

```rust
// crates/aimds-analysis/src/lib.rs

#[cfg(feature = "behavioral")]
pub mod behavioral;

#[cfg(feature = "policy-verification")]
pub mod policy_verifier;

#[cfg(feature = "ltl")]
pub mod ltl_checker;

pub mod errors;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

#[cfg(feature = "behavioral")]
pub use behavioral::{BehavioralAnalyzer, BehaviorProfile, AnomalyScore};

#[cfg(feature = "policy-verification")]
pub use policy_verifier::{PolicyVerifier, SecurityPolicy, VerificationResult};

#[cfg(feature = "ltl")]
pub use ltl_checker::{LTLChecker, LTLFormula, Trace};

pub use errors::{AnalysisError, AnalysisResult};
```

### 5. Add Features to aimds-response

Add to `/workspaces/midstream/AIMDS/crates/aimds-response/Cargo.toml`:

```toml
[dependencies]
midstreamer-strange-loop = { workspace = true, optional = true }
metrics = { workspace = true, optional = true }
tracing-subscriber = { workspace = true, optional = true }

[features]
default = ["std", "adaptive", "mitigation"]

# Core features
std = ["aimds-core/std"]
wasm = ["aimds-core/wasm", "wasm-bindgen", "wasm-bindgen-futures", "js-sys", "console_error_panic_hook", "serde-wasm-bindgen"]

# Response capabilities
adaptive = []
mitigation = []
meta-learning = ["midstreamer-strange-loop"]
audit = ["tracing-subscriber"]
rollback = []
metrics-export = ["metrics"]

# Convenience
full = ["adaptive", "mitigation", "meta-learning", "audit", "rollback", "metrics-export"]
minimal = ["mitigation"]
```

## Trait-Based Refactoring (Phase 3)

### 1. Define Traits in aimds-core

Create `/workspaces/midstream/AIMDS/crates/aimds-core/src/traits.rs`:

```rust
//! Trait definitions for AIMDS layers

use crate::types::*;
use async_trait::async_trait;
use std::sync::Arc;

/// Trait for threat detection implementations
#[async_trait]
pub trait ThreatDetector: Send + Sync {
    /// Detect threats in the given input
    async fn detect(&self, input: &DetectionInput) -> Result<DetectionResult, AimdsError>;

    /// Get detector capabilities
    fn capabilities(&self) -> &[DetectorCapability];

    /// Check if this detector can handle the given input type
    fn can_handle(&self, input_type: &InputType) -> bool;
}

/// Trait for behavioral analysis implementations
#[async_trait]
pub trait BehaviorAnalyzer: Send + Sync {
    /// Analyze behavior patterns
    async fn analyze(&self, detection: &DetectionResult) -> Result<AnalysisResult, AimdsError>;

    /// Get analyzer capabilities
    fn capabilities(&self) -> &[AnalyzerCapability];

    /// Get confidence threshold
    fn confidence_threshold(&self) -> f64;
}

/// Trait for response strategies
#[async_trait]
pub trait ResponseStrategy: Send + Sync {
    /// Execute response to a threat
    async fn respond(&self, threat: &ThreatContext) -> Result<ResponseOutcome, AimdsError>;

    /// Evaluate if this strategy is appropriate for the threat
    fn is_applicable(&self, threat: &ThreatContext) -> bool;

    /// Get strategy priority (higher = more urgent)
    fn priority(&self) -> u8;
}

/// Trait for meta-learning engines
#[async_trait]
pub trait MetaLearner: Send + Sync {
    /// Learn from response outcome
    async fn learn(&mut self, outcome: &ResponseOutcome) -> Result<(), AimdsError>;

    /// Get learned patterns
    fn patterns(&self) -> &[LearnedPattern];

    /// Reset learning state
    fn reset(&mut self);
}

/// Detector capability enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DetectorCapability {
    PatternMatching,
    AnomalyDetection,
    PiiSanitization,
    TemporalAnalysis,
}

/// Analyzer capability enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AnalyzerCapability {
    BehavioralProfiling,
    PolicyVerification,
    LTLChecking,
    NeuralVerification,
    TemporalAttraction,
}

/// Input type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum InputType {
    Text,
    Json,
    Binary,
    Stream,
}

/// Types for trait implementations
#[derive(Debug, Clone)]
pub struct DetectionInput {
    pub data: Vec<u8>,
    pub input_type: InputType,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct DetectionResult {
    pub threats: Vec<Threat>,
    pub confidence: f64,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct Threat {
    pub id: String,
    pub severity: Severity,
    pub category: ThreatCategory,
    pub description: String,
}

#[derive(Debug, Clone)]
pub struct AnalysisResult {
    pub behavior_profile: serde_json::Value,
    pub anomaly_score: f64,
    pub policy_violations: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ThreatContext {
    pub threat: Threat,
    pub detection: DetectionResult,
    pub analysis: Option<AnalysisResult>,
}

#[derive(Debug, Clone)]
pub struct ResponseOutcome {
    pub success: bool,
    pub actions_taken: Vec<String>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct LearnedPattern {
    pub pattern_id: String,
    pub effectiveness: f64,
    pub usage_count: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ThreatCategory {
    PromptInjection,
    DataExfiltration,
    Jailbreak,
    PiiLeak,
    Malicious,
}
```

Update `/workspaces/midstream/AIMDS/crates/aimds-core/src/lib.rs`:

```rust
pub mod config;
pub mod error;
pub mod types;
pub mod traits;  // ← Add this

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use config::AimdsConfig;
pub use error::{AimdsError, Result};
pub use types::*;
pub use traits::*;  // ← Add this
```

### 2. Implement Traits in aimds-detection

Update `/workspaces/midstream/AIMDS/crates/aimds-detection/src/lib.rs`:

```rust
use aimds_core::{ThreatDetector, DetectionInput, DetectionResult, AimdsError};
use aimds_core::{DetectorCapability, InputType};
use async_trait::async_trait;

pub struct AimdsDetectionEngine {
    #[cfg(feature = "pattern-matching")]
    pattern_matcher: PatternMatcher,

    #[cfg(feature = "sanitization")]
    sanitizer: Sanitizer,

    capabilities: Vec<DetectorCapability>,
}

#[async_trait]
impl ThreatDetector for AimdsDetectionEngine {
    async fn detect(&self, input: &DetectionInput) -> Result<DetectionResult, AimdsError> {
        // Implementation using pattern matcher, sanitizer, etc.
        todo!("Implement detection logic")
    }

    fn capabilities(&self) -> &[DetectorCapability] {
        &self.capabilities
    }

    fn can_handle(&self, input_type: &InputType) -> bool {
        matches!(input_type, InputType::Text | InputType::Json)
    }
}
```

### 3. Implement Traits in aimds-analysis

Update `/workspaces/midstream/AIMDS/crates/aimds-analysis/src/lib.rs`:

```rust
use aimds_core::{BehaviorAnalyzer, DetectionResult, AnalysisResult, AimdsError};
use aimds_core::AnalyzerCapability;
use async_trait::async_trait;

pub struct AimdsAnalysisEngine {
    #[cfg(feature = "behavioral")]
    behavioral_analyzer: BehavioralAnalyzer,

    #[cfg(feature = "policy-verification")]
    policy_verifier: PolicyVerifier,

    capabilities: Vec<AnalyzerCapability>,
    confidence_threshold: f64,
}

#[async_trait]
impl BehaviorAnalyzer for AimdsAnalysisEngine {
    async fn analyze(&self, detection: &DetectionResult) -> Result<AnalysisResult, AimdsError> {
        // Implementation using behavioral analyzer, policy verifier, etc.
        todo!("Implement analysis logic")
    }

    fn capabilities(&self) -> &[AnalyzerCapability] {
        &self.capabilities
    }

    fn confidence_threshold(&self) -> f64 {
        self.confidence_threshold
    }
}
```

### 4. Refactor aimds-response to Use Traits

Update `/workspaces/midstream/AIMDS/crates/aimds-response/Cargo.toml`:

```toml
[dependencies]
aimds-core.workspace = true
# Remove direct dependencies on detection and analysis
# aimds-detection.workspace = true  ← Remove
# aimds-analysis.workspace = true   ← Remove

# Only keep strange-loop for meta-learning
midstreamer-strange-loop = { workspace = true, optional = true }

# Add async-trait
async-trait = "0.1"
```

Update `/workspaces/midstream/AIMDS/crates/aimds-response/src/lib.rs`:

```rust
use aimds_core::{ResponseStrategy, ThreatContext, ResponseOutcome, AimdsError};
use aimds_core::MetaLearner;
use async_trait::async_trait;
use std::sync::Arc;

pub struct AimdsResponseEngine {
    strategies: Vec<Box<dyn ResponseStrategy>>,

    #[cfg(feature = "meta-learning")]
    meta_learner: Option<Box<dyn MetaLearner>>,
}

impl AimdsResponseEngine {
    /// Create new response engine with strategies
    pub fn new(strategies: Vec<Box<dyn ResponseStrategy>>) -> Self {
        Self {
            strategies,
            #[cfg(feature = "meta-learning")]
            meta_learner: None,
        }
    }

    /// Execute best response strategy for threat
    pub async fn respond(&self, threat: &ThreatContext) -> Result<ResponseOutcome, AimdsError> {
        // Find applicable strategies
        let mut applicable: Vec<_> = self.strategies
            .iter()
            .filter(|s| s.is_applicable(threat))
            .collect();

        // Sort by priority
        applicable.sort_by_key(|s| std::cmp::Reverse(s.priority()));

        // Execute highest priority strategy
        if let Some(strategy) = applicable.first() {
            let outcome = strategy.respond(threat).await?;

            // Learn from outcome if meta-learning enabled
            #[cfg(feature = "meta-learning")]
            if let Some(ref learner) = self.meta_learner {
                learner.learn(&outcome).await?;
            }

            Ok(outcome)
        } else {
            Err(AimdsError::NoApplicableStrategy)
        }
    }
}
```

### 5. Create Integration Crate (Optional)

Create `/workspaces/midstream/AIMDS/crates/aimds-integration/Cargo.toml`:

```toml
[package]
name = "aimds-integration"
version.workspace = true
edition.workspace = true
authors.workspace = true
license.workspace = true
repository.workspace = true
description = "Integration layer that wires AIMDS components together"

[dependencies]
aimds-core.workspace = true
aimds-detection = { workspace = true, optional = true }
aimds-analysis = { workspace = true, optional = true }
aimds-response = { workspace = true, optional = true }

tokio.workspace = true
async-trait = "0.1"

[features]
default = ["full-pipeline"]
full-pipeline = ["detection", "analysis", "response"]
detection = ["dep:aimds-detection"]
analysis = ["dep:aimds-analysis"]
response = ["dep:aimds-response"]
```

Create `/workspaces/midstream/AIMDS/crates/aimds-integration/src/lib.rs`:

```rust
//! Integration layer for AIMDS components

use aimds_core::*;
use std::sync::Arc;

#[cfg(feature = "detection")]
use aimds_detection::AimdsDetectionEngine;

#[cfg(feature = "analysis")]
use aimds_analysis::AimdsAnalysisEngine;

#[cfg(feature = "response")]
use aimds_response::AimdsResponseEngine;

pub struct AimdsPipeline {
    #[cfg(feature = "detection")]
    detector: Arc<dyn ThreatDetector>,

    #[cfg(feature = "analysis")]
    analyzer: Arc<dyn BehaviorAnalyzer>,

    #[cfg(feature = "response")]
    responder: Arc<AimdsResponseEngine>,
}

impl AimdsPipeline {
    /// Create new AIMDS pipeline with default components
    #[cfg(all(feature = "detection", feature = "analysis", feature = "response"))]
    pub fn new() -> Self {
        Self {
            detector: Arc::new(AimdsDetectionEngine::default()),
            analyzer: Arc::new(AimdsAnalysisEngine::default()),
            responder: Arc::new(AimdsResponseEngine::default()),
        }
    }

    /// Process input through full pipeline
    #[cfg(all(feature = "detection", feature = "analysis", feature = "response"))]
    pub async fn process(&self, input: DetectionInput) -> Result<ResponseOutcome, AimdsError> {
        // Detect threats
        let detection = self.detector.detect(&input).await?;

        // Analyze behavior
        let analysis = self.analyzer.analyze(&detection).await?;

        // Respond to threats
        for threat in &detection.threats {
            let context = ThreatContext {
                threat: threat.clone(),
                detection: detection.clone(),
                analysis: Some(analysis.clone()),
            };

            self.responder.respond(&context).await?;
        }

        Ok(ResponseOutcome {
            success: true,
            actions_taken: vec!["Full pipeline executed".to_string()],
            metadata: serde_json::json!({}),
        })
    }
}
```

## Build Configuration (Phase 4)

Create `/workspaces/midstream/AIMDS/.cargo/config.toml`:

```toml
[build]
jobs = 8                      # Adjust based on CPU cores
incremental = true
pipelined = true

[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[target.wasm32-unknown-unknown]
rustflags = [
    "-C", "link-arg=-zstack-size=131072",
    "-C", "opt-level=z",
]

[profile.dev]
opt-level = 1                 # Faster dev builds
incremental = true
debug = true
split-debuginfo = "unpacked"

[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
strip = true
panic = "abort"

[profile.release-fast]
inherits = "release"
lto = false
codegen-units = 16
strip = false

[profile.wasm-release]
inherits = "release"
opt-level = "z"               # Optimize for size
lto = true
codegen-units = 1
panic = "abort"
```

## Testing Strategy

Create `/workspaces/midstream/AIMDS/scripts/test-features.sh`:

```bash
#!/bin/bash
set -e

echo "Testing feature combinations..."

# Test minimal build
echo "→ Testing minimal features..."
cargo build --no-default-features --features minimal

# Test each layer independently
echo "→ Testing detection only..."
cargo build --no-default-features --features detection

echo "→ Testing analysis only..."
cargo build --no-default-features --features analysis

echo "→ Testing response only..."
cargo build --no-default-features --features response

# Test full build
echo "→ Testing full features..."
cargo build --all-features

# Test WASM build
echo "→ Testing WASM build..."
cargo build --target wasm32-unknown-unknown --features wasm

# Run tests with different features
echo "→ Running tests..."
cargo test --all-features
cargo test --no-default-features --features minimal

echo "✓ All feature combinations build successfully!"
```

## Migration Checklist

### Phase 1: Workspace Dependencies ✓
- [ ] Update `aimds-response/Cargo.toml`
- [ ] Run `cargo check --workspace`
- [ ] Run `cargo test --workspace`
- [ ] Verify no version conflicts
- [ ] Commit changes

### Phase 2: Feature Flags
- [ ] Add feature definitions to root `Cargo.toml`
- [ ] Update `aimds-core` features
- [ ] Update `aimds-detection` features and add `#[cfg]` gates
- [ ] Update `aimds-analysis` features and add `#[cfg]` gates
- [ ] Update `aimds-response` features and add `#[cfg]` gates
- [ ] Create `scripts/test-features.sh`
- [ ] Run feature tests
- [ ] Update CI configuration
- [ ] Commit changes

### Phase 3: Trait Refactoring
- [ ] Add `traits.rs` to `aimds-core`
- [ ] Add `async-trait` to workspace dependencies
- [ ] Implement `ThreatDetector` for detection
- [ ] Implement `BehaviorAnalyzer` for analysis
- [ ] Refactor `aimds-response` to use traits
- [ ] Create `aimds-integration` crate (optional)
- [ ] Update examples and tests
- [ ] Benchmark compilation time
- [ ] Commit changes

### Phase 4: Build Configuration
- [ ] Create `.cargo/config.toml`
- [ ] Add build profiles
- [ ] Test build performance
- [ ] Update documentation
- [ ] Commit changes

## Success Metrics

Track these metrics before and after each phase:

```bash
# Compilation time
time cargo build --release --timings

# Binary size
ls -lh target/release/aimds-*

# Dependency count
cargo tree | wc -l

# Feature test matrix
./scripts/test-features.sh
```

## Rollback Plan

If issues arise:

1. **Phase 1:** Revert single commit
2. **Phase 2:** Disable problematic features, fix incrementally
3. **Phase 3:** Keep old concrete implementations alongside traits
4. **Phase 4:** Delete `.cargo/config.toml`

Each phase is independent and can be reverted without affecting others.
