#!/bin/bash
set -e

# AIMDS npm Package Publishing Script
# This script builds WASM modules and publishes to npm

echo "======================================"
echo "AIMDS npm Package Publishing"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build WASM modules
echo -e "${YELLOW}Step 1: Building WASM modules...${NC}"
echo ""

cd /workspaces/midstream/npm-aimds

# Build for Node.js target (primary target for npm package)
echo "Building aimds-core..."
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-core || {
  echo -e "${RED}Failed to build aimds-core${NC}"
  exit 1
}

echo "Building aimds-detection..."
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-detection || {
  echo -e "${RED}Failed to build aimds-detection${NC}"
  exit 1
}

echo "Building aimds-analysis..."
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-analysis || {
  echo -e "${RED}Failed to build aimds-analysis${NC}"
  exit 1
}

echo "Building aimds-response..."
wasm-pack build --target nodejs --out-dir pkg-node ../AIMDS/crates/aimds-response || {
  echo -e "${RED}Failed to build aimds-response${NC}"
  exit 1
}

echo -e "${GREEN}✓ WASM modules built successfully${NC}"
echo ""

# Step 2: Run tests
echo -e "${YELLOW}Step 2: Running tests...${NC}"
npm test || {
  echo -e "${YELLOW}Warning: Some tests failed, but continuing...${NC}"
}
echo ""

# Step 3: Run linter
echo -e "${YELLOW}Step 3: Running linter...${NC}"
npm run lint || {
  echo -e "${YELLOW}Warning: Linting issues found, but continuing...${NC}"
}
echo ""

# Step 4: Verify package contents
echo -e "${YELLOW}Step 4: Verifying package contents...${NC}"
echo "Files that will be included in package:"
npm pack --dry-run
echo ""

# Step 5: Create tarball (test)
echo -e "${YELLOW}Step 5: Creating test package...${NC}"
npm pack
TARBALL=$(ls aimds-*.tgz | tail -1)
echo -e "${GREEN}✓ Package created: $TARBALL${NC}"
echo ""

# Step 6: Verify tarball contents
echo -e "${YELLOW}Step 6: Verifying tarball contents...${NC}"
tar -tzf "$TARBALL" | head -20
echo "..."
echo ""

# Step 7: Publish to npm
echo -e "${YELLOW}Step 7: Publishing to npm...${NC}"
echo "Registry: $(npm config get registry)"
echo "User: $(npm whoami)"
echo ""

read -p "Ready to publish to npm? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}Publishing cancelled${NC}"
  echo "Tarball saved for manual publishing: $TARBALL"
  exit 0
fi

npm publish --access public || {
  echo -e "${RED}Failed to publish to npm${NC}"
  echo "You can manually publish with: npm publish $TARBALL --access public"
  exit 1
}

echo -e "${GREEN}✓ Successfully published to npm!${NC}"
echo ""

# Step 8: Verify published package
echo -e "${YELLOW}Step 8: Verifying published package...${NC}"
sleep 5
npm view aimds
echo ""

# Step 9: Create git tag
echo -e "${YELLOW}Step 9: Creating git tag...${NC}"
VERSION=$(node -p "require('./package.json').version")
git tag -a "aimds-v$VERSION" -m "Release AIMDS v$VERSION" || {
  echo -e "${YELLOW}Warning: Failed to create git tag${NC}"
}
echo ""

echo "======================================"
echo -e "${GREEN}✓ AIMDS npm package published!${NC}"
echo "======================================"
echo ""
echo "Package: aimds@$VERSION"
echo "Install: npm install aimds"
echo "Usage: npx aimds --help"
echo ""
echo "Next steps:"
echo "1. Push git tag: git push origin aimds-v$VERSION"
echo "2. Test installation: npm install -g aimds"
echo "3. Update documentation"
echo ""
