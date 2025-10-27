#!/bin/bash
# Build npm package

set -e

echo "Building AIMDS npm package..."

# Build WASM modules first
./scripts/build-wasm.sh

# Run tests
echo "Running tests..."
npm test

# Bundle with webpack
echo "Bundling with webpack..."
npx webpack --config webpack.config.js

# Type checking
echo "Type checking..."
npm run typecheck

echo "Build complete!"
echo "Package is ready for publishing"
