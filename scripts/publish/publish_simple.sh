#!/bin/bash
set -e

cd /workspaces/midstream

echo "Publishing remaining 5 midstreamer crates..."
echo ""

# 2. midstreamer-scheduler
echo "[2/6] Publishing midstreamer-scheduler..."
cd crates/nanosecond-scheduler
cargo publish --allow-dirty
echo "✅ Published midstreamer-scheduler"
sleep 180

# 3. midstreamer-neural-solver
echo "[3/6] Publishing midstreamer-neural-solver..."
cd ../temporal-neural-solver
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
echo "🎉 All midstreamer crates published successfully!"
echo ""
echo "Published crates:"
echo "  1. midstreamer-temporal-compare v0.1.0 ✅"
echo "  2. midstreamer-scheduler v0.1.0 ✅"
echo "  3. midstreamer-neural-solver v0.1.0 ✅"
echo "  4. midstreamer-attractor v0.1.0 ✅"
echo "  5. midstreamer-quic v0.1.0 ✅"
echo "  6. midstreamer-strange-loop v0.1.0 ✅"
echo ""
echo "View at: https://crates.io/search?q=midstreamer"
