#!/bin/bash
# Build WASM modules for AIMDS

set -e

echo "Building AIMDS WASM modules..."

# Build for web (browser)
echo "Building for web..."
wasm-pack build --target web --out-dir pkg ../AIMDS/crates/aimds-core
wasm-pack build --target web --out-dir pkg ../AIMDS/crates/aimds-detection
wasm-pack build --target web --out-dir pkg ../AIMDS/crates/aimds-analysis
wasm-pack build --target web --out-dir pkg ../AIMDS/crates/aimds-response

# Build for Node.js
echo "Building for Node.js..."
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-core
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-detection
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-analysis
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-response

# Build for bundlers
echo "Building for bundlers..."
wasm-pack build --target bundler --out-dir pkg-bundler ../AIMDS/crates/aimds-core
wasm-pack build --target bundler --out-dir pkg-bundler ../AIMDS/crates/aimds-detection
wasm-pack build --target bundler --out-dir pkg-bundler ../AIMDS/crates/aimds-analysis
wasm-pack build --target bundler --out-dir pkg-bundler ../AIMDS/crates/aimds-response

echo "WASM build complete!"
