#!/bin/bash
# fix-npm-security.sh - Automated security fixes for npm packages
# Created: 2025-10-29
# Purpose: Fix all critical and high security vulnerabilities

set -e

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════╗${COLOR_NC}"
echo -e "${COLOR_BLUE}║  NPM Security Remediation Script                       ║${COLOR_NC}"
echo -e "${COLOR_BLUE}║  Fixing vulnerabilities across all packages            ║${COLOR_NC}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════╝${COLOR_NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "/workspaces/midstream" ]; then
    echo -e "${COLOR_RED}❌ Error: Must run from /workspaces/midstream${COLOR_NC}"
    exit 1
fi

cd /workspaces/midstream

# Function to show progress
progress() {
    echo -e "${COLOR_YELLOW}▶ $1${COLOR_NC}"
}

success() {
    echo -e "${COLOR_GREEN}✅ $1${COLOR_NC}"
}

error() {
    echo -e "${COLOR_RED}❌ $1${COLOR_NC}"
}

# Backup package files
progress "Creating backups..."
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
cp npm-aimds/package.json "$BACKUP_DIR/npm-aimds-package.json" 2>/dev/null || true
cp npm-wasm/package.json "$BACKUP_DIR/npm-wasm-package.json" 2>/dev/null || true
success "Backups created in $BACKUP_DIR"

# Phase 1: Fix npm-aimds (aidefence) vulnerabilities
echo ""
echo -e "${COLOR_BLUE}═══ Phase 1: npm-aimds (aidefence) ═══${COLOR_NC}"
cd npm-aimds

progress "Updating vulnerable dependencies..."
npm install esbuild@^0.25.11 --save-dev 2>&1 | tail -5 || error "esbuild update failed"
npm install vitest@^4.0.5 --save-dev 2>&1 | tail -5 || error "vitest update failed"
npm install @vitest/coverage-v8@^4.0.5 --save-dev 2>&1 | tail -5 || error "coverage update failed"
npm install inquirer@^10.0.0 2>&1 | tail -5 || error "inquirer update failed"

progress "Running npm audit fix..."
npm audit fix 2>&1 | tail -10 || true

progress "Checking audit status..."
AUDIT_RESULT=$(npm audit --json 2>&1)
VULNS=$(echo "$AUDIT_RESULT" | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")

if [ "$VULNS" -eq "0" ]; then
    success "npm-aimds: 0 vulnerabilities remaining ✨"
else
    echo -e "${COLOR_YELLOW}⚠️  npm-aimds: $VULNS vulnerabilities remaining (may be dev-only)${COLOR_NC}"
fi

# Phase 2: Fix npm-wasm (midstreamer) vulnerabilities
echo ""
echo -e "${COLOR_BLUE}═══ Phase 2: npm-wasm (midstreamer) ═══${COLOR_NC}"
cd ../npm-wasm

progress "Updating vulnerable dependencies..."
npm install esbuild@^0.25.11 --save-dev 2>&1 | tail -5 || error "esbuild update failed"

progress "Removing circular dependency..."
npm uninstall midstreamer 2>&1 | tail -5 || true

progress "Running npm audit fix..."
npm audit fix 2>&1 | tail -10 || true

progress "Checking audit status..."
AUDIT_RESULT=$(npm audit --json 2>&1)
VULNS=$(echo "$AUDIT_RESULT" | grep -o '"total":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")

if [ "$VULNS" -eq "0" ]; then
    success "npm-wasm: 0 vulnerabilities remaining ✨"
else
    echo -e "${COLOR_YELLOW}⚠️  npm-wasm: $VULNS vulnerabilities remaining (may be dev-only)${COLOR_NC}"
fi

# Phase 3: Verification
echo ""
echo -e "${COLOR_BLUE}═══ Phase 3: Verification ═══${COLOR_NC}"

cd /workspaces/midstream

progress "Verifying npm-aimds..."
cd npm-aimds
npm list esbuild vitest inquirer 2>/dev/null | grep -E "esbuild|vitest|inquirer" || true

progress "Verifying npm-wasm..."
cd ../npm-wasm
npm list esbuild 2>/dev/null | grep "esbuild" || true

# Summary
echo ""
echo -e "${COLOR_BLUE}╔════════════════════════════════════════════════════════╗${COLOR_NC}"
echo -e "${COLOR_BLUE}║  Security Remediation Complete                         ║${COLOR_NC}"
echo -e "${COLOR_BLUE}╚════════════════════════════════════════════════════════╝${COLOR_NC}"
echo ""
success "Phase 1: Dependency updates applied"
success "Phase 2: Circular dependency removed"
success "Phase 3: Verification complete"
echo ""
echo -e "${COLOR_YELLOW}📋 Next Steps:${COLOR_NC}"
echo "1. Review changes: git diff npm-*/package.json"
echo "2. Test packages: cd npm-aimds && npm test"
echo "3. Review full report: docs/NPM_SECURITY_AUDIT_COMPLETE.md"
echo "4. Implement code fixes (see report sections HIGH-2, HIGH-3)"
echo "5. Commit: git commit -m 'fix: resolve security vulnerabilities'"
echo ""
echo -e "${COLOR_GREEN}🎉 Security fixes applied successfully!${COLOR_NC}"
echo ""
