#!/bin/bash
set -e

TOKEN=$(grep "^CRATES_API_KEY=" .env | cut -d'=' -f2)

echo "Publishing remaining midstreamer crates..."
echo ""

# 2. midstreamer-scheduler
echo "[2/6] Publishing midstreamer-scheduler..."
cd /workspaces/midstream/crates/nanosecond-scheduler
cargo publish --token "$TOKEN" --allow-dirty
echo "✅ Published"
sleep 180

# 3. midstreamer-neural-solver
echo "[3/6] Publishing midstreamer-neural-solver..."
cd /workspaces/midstream/crates/temporal-neural-solver
cargo publish --token "$TOKEN" --allow-dirty
echo "✅ Published"
sleep 180

# 4. midstreamer-attractor
echo "[4/6] Publishing midstreamer-attractor..."
cd /workspaces/midstream/crates/temporal-attractor-studio
cargo publish --token "$TOKEN" --allow-dirty
echo "✅ Published"
sleep 180

# 5. midstreamer-quic
echo "[5/6] Publishing midstreamer-quic..."
cd /workspaces/midstream/crates/quic-multistream
cargo publish --token "$TOKEN" --allow-dirty
echo "✅ Published"
sleep 180

# 6. midstreamer-strange-loop
echo "[6/6] Publishing midstreamer-strange-loop..."
cd /workspaces/midstream/crates/strange-loop
cargo publish --token "$TOKEN" --allow-dirty
echo "✅ Published"

echo ""
echo "🎉 All remaining crates published!"
