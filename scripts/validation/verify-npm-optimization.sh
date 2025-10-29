#!/bin/bash

################################################################################
# NPM Packages Optimization Verification Script
# Verifies that optimizations were applied successfully
#
# Usage: bash scripts/verify-npm-optimization.sh
# Author: Code Quality Analyzer
# Date: 2025-10-29
################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Verification results
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}\n"
}

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

################################################################################
# MAIN VERIFICATION
################################################################################

print_header "NPM Optimization Verification"
check_info "Checking all packages for optimization compliance..."

################################################################################
# Check 1: Circular Dependency Removed
################################################################################
echo ""
echo -e "${BLUE}[Check 1/10]${NC} Verifying circular dependency removal..."

if ! grep -q '"midstreamer"' npm-wasm/package.json; then
    check_pass "npm-wasm: No circular dependency found"
else
    check_fail "npm-wasm: Still has midstreamer self-dependency"
fi

################################################################################
# Check 2: AgentDB Version Alignment
################################################################################
echo ""
echo -e "${BLUE}[Check 2/10]${NC} Verifying agentdb version alignment..."

WASM_AGENTDB=$(grep -o '"agentdb"[^"]*"[^"]*"' npm-wasm/package.json | grep -o '\^[0-9.]*' || echo "none")
AIMDS_AGENTDB=$(grep -o '"agentdb"[^"]*"[^"]*"' npm-aimds/package.json | grep -o '\^[0-9.]*' || echo "none")

if [ "$WASM_AGENTDB" = "^2.0.0" ]; then
    check_pass "npm-wasm: agentdb version is ^2.0.0"
else
    check_fail "npm-wasm: agentdb version is $WASM_AGENTDB (expected ^2.0.0)"
fi

if [ "$AIMDS_AGENTDB" = "^2.0.0" ]; then
    check_pass "npm-aimds: agentdb version is ^2.0.0"
else
    check_fail "npm-aimds: agentdb version is $AIMDS_AGENTDB (expected ^2.0.0)"
fi

################################################################################
# Check 3: Axios Removal
################################################################################
echo ""
echo -e "${BLUE}[Check 3/10]${NC} Verifying axios removal..."

if ! grep -q '"axios"' npm-aimds/package.json; then
    check_pass "npm-aimds: axios dependency removed"
else
    check_fail "npm-aimds: axios still present in dependencies"
fi

################################################################################
# Check 4: Security Vulnerabilities
################################################################################
echo ""
echo -e "${BLUE}[Check 4/10]${NC} Checking security vulnerabilities..."

cd npm-wasm
WASM_VULNS=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0')
if [ "$WASM_VULNS" -eq 0 ]; then
    check_pass "npm-wasm: No vulnerabilities found"
elif [ "$WASM_VULNS" -lt 5 ]; then
    check_warn "npm-wasm: $WASM_VULNS vulnerabilities (target: 0)"
else
    check_fail "npm-wasm: $WASM_VULNS vulnerabilities (target: 0)"
fi

cd ..
cd npm-aimds
AIMDS_VULNS=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0')
if [ "$AIMDS_VULNS" -eq 0 ]; then
    check_pass "npm-aimds: No vulnerabilities found"
elif [ "$AIMDS_VULNS" -lt 5 ]; then
    check_warn "npm-aimds: $AIMDS_VULNS vulnerabilities (target: 0)"
else
    check_fail "npm-aimds: $AIMDS_VULNS vulnerabilities (target: 0)"
fi
cd ..

################################################################################
# Check 5: Bundle Sizes
################################################################################
echo ""
echo -e "${BLUE}[Check 5/10]${NC} Verifying bundle sizes..."

cd npm-wasm
WASM_SIZE_KB=$(du -sk node_modules 2>/dev/null | cut -f1 || echo "0")
WASM_SIZE_MB=$((WASM_SIZE_KB / 1024))
if [ "$WASM_SIZE_MB" -lt 8 ]; then
    check_pass "npm-wasm: ${WASM_SIZE_MB}MB (target: <8MB)"
elif [ "$WASM_SIZE_MB" -lt 10 ]; then
    check_warn "npm-wasm: ${WASM_SIZE_MB}MB (target: <8MB)"
else
    check_fail "npm-wasm: ${WASM_SIZE_MB}MB (target: <8MB)"
fi

cd ..
cd npm-aimds
AIMDS_SIZE_KB=$(du -sk node_modules 2>/dev/null | cut -f1 || echo "0")
AIMDS_SIZE_MB=$((AIMDS_SIZE_KB / 1024))
if [ "$AIMDS_SIZE_MB" -lt 45 ]; then
    check_pass "npm-aimds: ${AIMDS_SIZE_MB}MB (target: <45MB)"
elif [ "$AIMDS_SIZE_MB" -lt 50 ]; then
    check_warn "npm-aimds: ${AIMDS_SIZE_MB}MB (target: <45MB)"
else
    check_fail "npm-aimds: ${AIMDS_SIZE_MB}MB (target: <45MB)"
fi
cd ..

################################################################################
# Check 6: Dependency Counts
################################################################################
echo ""
echo -e "${BLUE}[Check 6/10]${NC} Checking dependency counts..."

WASM_DEPS=$(cat npm-wasm/package.json | jq '.dependencies | length')
if [ "$WASM_DEPS" -le 2 ]; then
    check_pass "npm-wasm: $WASM_DEPS direct dependencies (optimal: ≤2)"
else
    check_warn "npm-wasm: $WASM_DEPS direct dependencies (optimal: ≤2)"
fi

AIMDS_DEPS=$(cat npm-aimds/package.json | jq '.dependencies | length')
if [ "$AIMDS_DEPS" -le 14 ]; then
    check_pass "npm-aimds: $AIMDS_DEPS direct dependencies (target: ≤14)"
else
    check_warn "npm-aimds: $AIMDS_DEPS direct dependencies (target: ≤14)"
fi

################################################################################
# Check 7: Package Versions
################################################################################
echo ""
echo -e "${BLUE}[Check 7/10]${NC} Checking updated package versions..."

cd npm-wasm
WEBPACK_VERSION=$(grep -o '"webpack-dev-server"[^"]*"[^"]*"' package.json | grep -o '[0-9]\.[0-9]\.[0-9]' || echo "none")
if [[ "$WEBPACK_VERSION" > "5.2.0" ]] || [ "$WEBPACK_VERSION" = "5.2.0" ]; then
    check_pass "npm-wasm: webpack-dev-server ≥5.2.0 ($WEBPACK_VERSION)"
else
    check_fail "npm-wasm: webpack-dev-server <5.2.0 ($WEBPACK_VERSION)"
fi

cd ..
cd npm-aimds
ESBUILD_VERSION=$(grep -o '"esbuild"[^"]*"[^"]*"' package.json | grep -o '[0-9]\.[0-9]*\.[0-9]' || echo "none")
if [[ "$ESBUILD_VERSION" > "0.25.0" ]] || [ "$ESBUILD_VERSION" = "0.25.0" ]; then
    check_pass "npm-aimds: esbuild ≥0.25.0 ($ESBUILD_VERSION)"
else
    check_fail "npm-aimds: esbuild <0.25.0 ($ESBUILD_VERSION)"
fi

VITEST_VERSION=$(grep -o '"vitest"[^"]*"[^"]*"' package.json | grep -o '[0-9]\.[0-9]\.[0-9]' || echo "none")
if [[ "$VITEST_VERSION" > "4.0.0" ]] || [ "$VITEST_VERSION" = "4.0.0" ]; then
    check_pass "npm-aimds: vitest ≥4.0.0 ($VITEST_VERSION)"
else
    check_fail "npm-aimds: vitest <4.0.0 ($VITEST_VERSION)"
fi

INQUIRER_VERSION=$(grep -o '"inquirer"[^"]*"[^"]*"' package.json | grep -o '[0-9]*\.[0-9]\.[0-9]' || echo "none")
if [[ "$INQUIRER_VERSION" > "10.0.0" ]] || [ "$INQUIRER_VERSION" = "10.0.0" ]; then
    check_pass "npm-aimds: inquirer ≥10.0.0 ($INQUIRER_VERSION)"
else
    check_fail "npm-aimds: inquirer <10.0.0 ($INQUIRER_VERSION)"
fi

cd ..

################################################################################
# Check 8: Build Tests
################################################################################
echo ""
echo -e "${BLUE}[Check 8/10]${NC} Testing package builds..."

cd npm-wasm
if npm run build > /tmp/npm-wasm-verify-build.log 2>&1; then
    check_pass "npm-wasm: Build successful"
else
    check_fail "npm-wasm: Build failed (see /tmp/npm-wasm-verify-build.log)"
fi

cd ..
cd npm-aimds
if [ -f "node_modules/.bin/vitest" ]; then
    check_pass "npm-aimds: Dependencies installed correctly"
else
    check_warn "npm-aimds: Dependencies may not be installed"
fi
cd ..

################################################################################
# Check 9: File Structure Integrity
################################################################################
echo ""
echo -e "${BLUE}[Check 9/10]${NC} Verifying file structure..."

if [ -f "npm-wasm/package.json" ] && [ -f "npm-wasm/index.js" ]; then
    check_pass "npm-wasm: Core files present"
else
    check_fail "npm-wasm: Missing core files"
fi

if [ -f "npm-aimds/package.json" ] && [ -f "npm-aimds/index.js" ]; then
    check_pass "npm-aimds: Core files present"
else
    check_fail "npm-aimds: Missing core files"
fi

if [ -f "npm-aidefense/package.json" ] && [ -f "npm-aidefense/index.js" ]; then
    check_pass "npm-aidefense: Core files present"
else
    check_fail "npm-aidefense: Missing core files"
fi

################################################################################
# Check 10: Documentation
################################################################################
echo ""
echo -e "${BLUE}[Check 10/10]${NC} Checking documentation..."

if [ -f "docs/NPM_PACKAGES_OPTIMIZATION_REPORT.md" ]; then
    check_pass "Optimization report available"
else
    check_warn "Optimization report not found"
fi

if [ -f "docs/NPM_OPTIMIZATION_ACTION_PLAN.md" ]; then
    check_pass "Action plan available"
else
    check_warn "Action plan not found"
fi

################################################################################
# SUMMARY
################################################################################
print_header "Verification Summary"

TOTAL=$((PASSED + FAILED + WARNINGS))
PASS_RATE=$((PASSED * 100 / TOTAL))

echo ""
echo "Results:"
echo -e "  ${GREEN}✓ Passed:${NC}   $PASSED"
echo -e "  ${RED}✗ Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}⚠ Warnings:${NC} $WARNINGS"
echo -e "  ${BLUE}━━━━━━━━━━━━━━${NC}"
echo "  Total:     $TOTAL"
echo ""

if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}🎉 Perfect! All optimizations verified successfully!${NC}"
    echo ""
    echo "Your packages are now:"
    echo "  ✓ Free of circular dependencies"
    echo "  ✓ Using consistent dependency versions"
    echo "  ✓ Free of unused dependencies"
    echo "  ✓ Secure (no vulnerabilities)"
    echo "  ✓ Optimally sized"
    echo ""
    exit 0
elif [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}⚠ Good, but with warnings${NC}"
    echo ""
    echo "Pass rate: ${PASS_RATE}%"
    echo ""
    echo "Review warnings above and consider additional optimizations."
    echo ""
    exit 0
else
    echo -e "${RED}❌ Verification failed${NC}"
    echo ""
    echo "Pass rate: ${PASS_RATE}%"
    echo ""
    echo "Please review failed checks above and run:"
    echo "  bash scripts/fix-npm-critical.sh"
    echo ""
    exit 1
fi
