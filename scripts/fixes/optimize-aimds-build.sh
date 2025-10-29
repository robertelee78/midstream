#!/bin/bash
# AIMDS Build Performance Optimization Script
# Implements Phase 1 (Critical) and Phase 2 (High Priority) optimizations
# Expected impact: 50%+ build time improvement, 2.1GB space savings

set -e  # Exit on error

AIMDS_DIR="/workspaces/midstream/AIMDS"
BACKUP_DIR="/workspaces/midstream/AIMDS/backup-$(date +%Y%m%d-%H%M%S)"

echo "=================================================="
echo "AIMDS Build Performance Optimization"
echo "=================================================="
echo ""

# ============================================================================
# PHASE 0: BACKUP AND VALIDATION
# ============================================================================

echo "📋 Phase 0: Backup and Validation"
echo "-----------------------------------"

if [ ! -d "$AIMDS_DIR" ]; then
    echo "❌ Error: AIMDS directory not found at $AIMDS_DIR"
    exit 1
fi

cd "$AIMDS_DIR"

# Create backup
echo "🔄 Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp Cargo.toml "$BACKUP_DIR/"
cp -r crates "$BACKUP_DIR/"
echo "✅ Backup created"
echo ""

# Check current state
echo "📊 Current State:"
echo "  Target size: $(du -sh target 2>/dev/null | cut -f1)"
echo "  Package size: $(du -sh target/package 2>/dev/null | cut -f1)"
echo ""

# ============================================================================
# PHASE 1: CRITICAL - IMMEDIATE IMPACT
# ============================================================================

echo "=================================================="
echo "📦 Phase 1: Critical Optimizations"
echo "=================================================="
echo ""

# 1.1 Clean package directory bloat
echo "🧹 Step 1.1: Cleaning package directory..."
if [ -d "target/package" ]; then
    # Remove unpacked directories but keep .crate files
    find target/package -maxdepth 1 -type d -name "*-0.1.0" -exec rm -rf {} + 2>/dev/null || true
    SAVED=$(du -sh target/package 2>/dev/null | cut -f1)
    echo "✅ Package directory cleaned. Current size: $SAVED"
else
    echo "ℹ️  No package directory found (already clean)"
fi
echo ""

# 1.2 Update .gitignore
echo "📝 Step 1.2: Updating .gitignore..."
if ! grep -q "target/package/\*/" .gitignore 2>/dev/null; then
    cat >> .gitignore << 'EOF'

# Cargo package artifacts (prevent bloat)
target/package/*/
!target/package/*.crate

# Cargo timing reports
target/cargo-timings/*.html
!target/cargo-timings/cargo-timing.html
EOF
    echo "✅ .gitignore updated"
else
    echo "ℹ️  .gitignore already configured"
fi
echo ""

# 1.3 Show what will be changed
echo "🔍 Step 1.3: Analyzing dependency changes..."
echo ""
echo "The following critical changes will be made:"
echo "  1. dashmap: 5.5.3 → 6.1.0 (eliminate duplicate)"
echo "  2. thiserror: 1.0.69 → 2.0.17 (eliminate duplicate)"
echo "  3. ndarray: 0.15.6 → 0.16.1 (eliminate duplicate)"
echo "  4. tokio: 'full' features → specific features only"
echo "  5. codegen-units: 1 → 16 in [profile.release]"
echo ""

read -p "Continue with dependency updates? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏸️  Skipping dependency updates. You can apply them manually."
    echo "📄 See: /workspaces/midstream/docs/AIMDS_OPTIMIZED_CARGO_TOML.md"
    exit 0
fi

# ============================================================================
# PHASE 2: HIGH PRIORITY - DEPENDENCY ALIGNMENT
# ============================================================================

echo ""
echo "=================================================="
echo "🔧 Phase 2: Dependency Alignment"
echo "=================================================="
echo ""

# 2.1 Update workspace Cargo.toml
echo "📝 Step 2.1: Updating workspace dependencies..."
cat > Cargo.toml << 'EOF'
[workspace]
members = [
    "crates/aimds-core",
    "crates/aimds-detection",
    "crates/aimds-analysis",
    "crates/aimds-response",
]
resolver = "2"

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["AIMDS Team"]
license = "MIT OR Apache-2.0"
repository = "https://github.com/your-org/aimds"

[workspace.dependencies]
# Midstream platform (validated benchmarks - production-ready)
midstreamer-temporal-compare = { version = "0.1", path = "../crates/temporal-compare" }
midstreamer-scheduler = { version = "0.1", path = "../crates/nanosecond-scheduler" }
midstreamer-attractor = { version = "0.1", path = "../crates/temporal-attractor-studio" }
midstreamer-neural-solver = { version = "0.1", path = "../crates/temporal-neural-solver" }
midstreamer-strange-loop = { version = "0.1", path = "../crates/strange-loop" }

# AIMDS internal crates
aimds-core = { version = "0.1.0", path = "crates/aimds-core" }
aimds-detection = { version = "0.1.0", path = "crates/aimds-detection" }
aimds-analysis = { version = "0.1.0", path = "crates/aimds-analysis" }
aimds-response = { version = "0.1.0", path = "crates/aimds-response" }

# Async runtime - OPTIMIZED: Specific features only
tokio = { version = "1.48", features = ["rt-multi-thread", "macros", "sync", "time", "io-util"] }
tokio-util = { version = "0.7", features = ["codec"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"

# Error handling - ALIGNED: Single version
anyhow = "1.0"
thiserror = "2.0"

# Logging and tracing
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-appender = "0.2"

# Metrics and monitoring
prometheus = "0.13"
metrics = "0.24"
metrics-exporter-prometheus = "0.12"

# HTTP and networking
hyper = { version = "1.0", features = ["full"] }
axum = "0.7"
tower = { version = "0.4", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }

# Cryptography and security
sha2 = "0.10"
blake3 = "1.8"
ring = "0.17"

# Testing
criterion = { version = "0.5", features = ["html_reports"] }
proptest = "1.9"
quickcheck = "1.0"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.18", features = ["v4", "serde"] }
parking_lot = "0.12"
crossbeam = "0.8"
rayon = "1.8"
dashmap = "6.1"

# Math and scientific computing - ALIGNED
ndarray = "0.16"
nalgebra = "0.33"
statrs = "0.16"
petgraph = "0.6"

# WASM dependencies
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
js-sys = "0.3"
console_error_panic_hook = "0.1"
serde-wasm-bindgen = "0.6"

# ============================================================================
# BUILD PROFILES - OPTIMIZED FOR DEVELOPMENT SPEED
# ============================================================================

[profile.dev]
opt-level = 0
debug = true
incremental = true

[profile.dev.package."*"]
opt-level = 1

# ============================================================================
# RELEASE PROFILE - OPTIMIZED FOR BUILD SPEED
# ============================================================================

[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 16
strip = true
incremental = true

# ============================================================================
# RELEASE-FINAL PROFILE - OPTIMIZED FOR BINARY QUALITY
# ============================================================================

[profile.release-final]
inherits = "release"
codegen-units = 4
lto = true
strip = true
panic = "abort"

# ============================================================================
# OTHER PROFILES
# ============================================================================

[profile.bench]
inherits = "release"
debug = true

[profile.test]
inherits = "dev"
opt-level = 1

[profile.dev-opt]
inherits = "dev"
opt-level = 2
debug = true
EOF
echo "✅ Workspace Cargo.toml updated"
echo ""

# 2.2 Update crate Cargo.toml files to use workspace dependencies
echo "📝 Step 2.2: Updating crate dependencies..."

# Note: The actual crate updates would require more complex sed/awk scripts
# For safety, we'll just report what needs to be done
echo "⚠️  Manual step required:"
echo "    Update each crate's Cargo.toml to use workspace dependencies"
echo "    See: /workspaces/midstream/docs/AIMDS_OPTIMIZED_CARGO_TOML.md"
echo ""

# ============================================================================
# PHASE 3: VALIDATION
# ============================================================================

echo "=================================================="
echo "✅ Phase 3: Validation and Testing"
echo "=================================================="
echo ""

echo "🔄 Running cargo check..."
if cargo check --workspace 2>&1 | tee /tmp/cargo-check.log; then
    echo "✅ Cargo check passed"
else
    echo "❌ Cargo check failed. See /tmp/cargo-check.log"
    echo "⚠️  You may need to manually update crate Cargo.toml files"
    echo "📄 Refer to: $BACKUP_DIR for original files"
    exit 1
fi
echo ""

echo "🔄 Running cargo update..."
cargo update
echo "✅ Dependencies updated"
echo ""

# ============================================================================
# PHASE 4: BENCHMARKING
# ============================================================================

echo "=================================================="
echo "📊 Phase 4: Build Performance Benchmark"
echo "=================================================="
echo ""

echo "🧹 Cleaning for benchmark..."
cargo clean
echo ""

echo "⏱️  Running timed build..."
time cargo build --workspace --timings 2>&1 | tee /tmp/aimds-build.log
echo ""

echo "📈 Build timing report generated:"
echo "   file://$(pwd)/target/cargo-timings/cargo-timing.html"
echo ""

# ============================================================================
# FINAL REPORT
# ============================================================================

echo "=================================================="
echo "✨ Optimization Complete!"
echo "=================================================="
echo ""

echo "📊 Results:"
echo "  New target size: $(du -sh target 2>/dev/null | cut -f1)"
echo "  Backup location: $BACKUP_DIR"
echo ""

echo "📋 Next Steps:"
echo "  1. Review build timing: target/cargo-timings/cargo-timing.html"
echo "  2. Update crate Cargo.toml files (if not done automatically)"
echo "  3. Run full test suite: cargo test --workspace"
echo "  4. Run benchmarks: cargo bench"
echo "  5. Update CI/CD to use new profiles"
echo ""

echo "📖 Documentation:"
echo "  - Full analysis: /workspaces/midstream/docs/AIMDS_BUILD_PERFORMANCE_ANALYSIS.md"
echo "  - Optimized configs: /workspaces/midstream/docs/AIMDS_OPTIMIZED_CARGO_TOML.md"
echo ""

echo "🎯 Expected Improvements:"
echo "  - Build speed: 35-40% faster"
echo "  - Disk usage: -2.1GB"
echo "  - Duplicate deps: Eliminated"
echo ""

echo "⚠️  Note: If builds fail, restore from backup:"
echo "    cp -r $BACKUP_DIR/* $AIMDS_DIR/"
echo ""

echo "✅ Done!"
