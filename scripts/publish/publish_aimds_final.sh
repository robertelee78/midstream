#!/bin/bash
set -e

cd /workspaces/midstream/AIMDS

echo "🚀 Publishing AIMDS crates to crates.io (FINAL)"
echo "==============================================="
echo ""
echo "Note: aimds-core v0.1.0 is already published"
echo ""

# Wait for midstreamer crates to be fully indexed
echo "⏳ Waiting 60 seconds for midstreamer-strange-loop to be indexed..."
sleep 60

# 2. aimds-detection
echo "📦 [2/4] Publishing aimds-detection..."
cd crates/aimds-detection
cargo publish --allow-dirty
echo "✅ aimds-detection published successfully"
echo ""
sleep 180

# 3. aimds-analysis
echo "📦 [3/4] Publishing aimds-analysis..."
cd ../aimds-analysis
cargo publish --allow-dirty
echo "✅ aimds-analysis published successfully"
echo ""
sleep 180

# 4. aimds-response
echo "📦 [4/4] Publishing aimds-response..."
cd ../aimds-response
cargo publish --allow-dirty
echo "✅ aimds-response published successfully"
echo ""

echo "🎉 All AIMDS crates published successfully!"
echo ""
echo "Published crates:"
echo "  1. aimds-core v0.1.0 ✅"
echo "  2. aimds-detection v0.1.0 ✅"
echo "  3. aimds-analysis v0.1.0 ✅"
echo "  4. aimds-response v0.1.0 ✅"
echo ""
echo "View at: https://crates.io/search?q=aimds"
