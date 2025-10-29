#!/bin/bash
set -e

cd /workspaces/midstream

echo "Publishing remaining 4 midstreamer crates (with version fixes)..."
echo ""

# 3. midstreamer-neural-solver
echo "[3/6] Publishing midstreamer-neural-solver..."
cd crates/temporal-neural-solver
cargo publish --allow-dirty
echo "✅ Published midstreamer-neural-solver"
sleep 180

# 4. midstreamer-attractor
echo "[4/6] Publishing midstreamer-attractor..."
cd ../temporal-attractor-studio
cargo publish --allow-dirty
echo "✅ Published midstreamer-attractor"
sleep 180

# 5. midstreamer-quic
echo "[5/6] Publishing midstreamer-quic..."
cd ../quic-multistream
cargo publish --allow-dirty
echo "✅ Published midstreamer-quic"
sleep 180

# 6. midstreamer-strange-loop
echo "[6/6] Publishing midstreamer-strange-loop..."
cd ../strange-loop
cargo publish --allow-dirty
echo "✅ Published midstreamer-strange-loop"

echo ""
echo "🎉 All remaining crates published!"
