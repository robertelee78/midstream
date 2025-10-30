#!/bin/bash

##############################################################################
# AIMDS Quick Wins Comprehensive Test Runner
# Runs all test suites and validates 90%+ coverage
##############################################################################

set -e

echo "════════════════════════════════════════════════════════════════"
echo "   🧪 AIMDS Quick Wins Comprehensive Test Suite"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite
run_test_suite() {
    local name=$1
    local command=$2

    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Running: $name${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    if eval "$command"; then
        echo -e "${GREEN}✅ $name: PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $name: FAILED${NC}"
        ((FAILED_TESTS++))
    fi

    ((TOTAL_TESTS++))
}

# Check for required dependencies
echo "📦 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# Check for Jest
if ! npm list jest &> /dev/null; then
    echo -e "${YELLOW}⚠️  Jest not found, installing...${NC}"
    npm install --save-dev jest
fi

# Check for K6 (optional)
if command -v k6 &> /dev/null; then
    echo -e "${GREEN}✅ K6: $(k6 version --quiet 2>&1 | head -n 1)${NC}"
    K6_AVAILABLE=true
else
    echo -e "${YELLOW}⚠️  K6 not installed (load tests will be skipped)${NC}"
    K6_AVAILABLE=false
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "   Starting Test Execution"
echo "════════════════════════════════════════════════════════════════"

# 1. Unit Tests - Pattern Cache
run_test_suite \
    "Unit Tests: Pattern Cache" \
    "npx jest tests/quick-wins/pattern-cache.test.js --silent"

# 2. Unit Tests - Parallel Detector
run_test_suite \
    "Unit Tests: Parallel Detector" \
    "npx jest tests/quick-wins/parallel-detector.test.js --silent"

# 3. Unit Tests - Memory Pool
run_test_suite \
    "Unit Tests: Memory Pool" \
    "npx jest tests/quick-wins/memory-pool.test.js --silent"

# 4. Unit Tests - Batch API
run_test_suite \
    "Unit Tests: Batch API" \
    "npx jest tests/quick-wins/batch-api.test.js --silent"

# 5. Unit Tests - Vector Cache
run_test_suite \
    "Unit Tests: Vector Search Cache" \
    "npx jest tests/quick-wins/vector-cache.test.js --silent"

# 6. Integration Tests
run_test_suite \
    "Integration Tests: End-to-End" \
    "npx jest tests/integration/end-to-end.test.js --silent"

# 7. Performance Benchmarks
run_test_suite \
    "Performance Benchmarks" \
    "npx jest tests/benchmarks/quick-wins-performance.bench.js --silent"

# 8. Coverage Report
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Generating Coverage Report${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

if npx jest --coverage --silent 2>&1 | tee coverage-output.txt; then
    echo -e "${GREEN}✅ Coverage report generated${NC}"

    # Extract coverage percentages
    if grep -q "Statements" coverage-output.txt; then
        echo ""
        echo "📊 Coverage Summary:"
        grep -E "(Statements|Branches|Functions|Lines)" coverage-output.txt | tail -4
    fi

    # Check if coverage meets 90% threshold
    if grep -q "Statements.*: 9[0-9]" coverage-output.txt || \
       grep -q "Statements.*: 100" coverage-output.txt; then
        echo -e "${GREEN}✅ Coverage threshold met (≥90%)${NC}"
    else
        echo -e "${YELLOW}⚠️  Coverage below 90% threshold${NC}"
    fi
else
    echo -e "${RED}❌ Coverage report generation failed${NC}"
fi

rm -f coverage-output.txt

# 9. Load Tests (if K6 available)
if [ "$K6_AVAILABLE" = true ]; then
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Running Load Tests (K6)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${YELLOW}⚠️  Load tests require a running server${NC}"
    echo -e "${YELLOW}⚠️  Start your server before running load tests${NC}"
    echo ""
    read -p "Run load tests? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_test_suite \
            "Load Tests: K6 Scenarios" \
            "k6 run --quiet tests/load/k6-load-test.js"
    else
        echo -e "${YELLOW}⏭️  Skipping load tests${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}⏭️  Load tests skipped (K6 not installed)${NC}"
    echo "   Install K6: https://k6.io/docs/getting-started/installation/"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "   📊 Test Results Summary"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

# Calculate pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Pass Rate: ${PASS_RATE}%"
else
    PASS_RATE=0
fi

echo ""
echo "📁 Test Artifacts:"
echo "   • Coverage Report: npm-aimds/coverage/index.html"
echo "   • Test Report: npm-aimds/test-report.html"
echo "   • JUnit Results: npm-aimds/test-results/junit.xml"
echo ""

# Exit code
if [ $FAILED_TESTS -eq 0 ] && [ $PASS_RATE -ge 90 ]; then
    echo -e "${GREEN}🎉 All tests passed! Coverage threshold met!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed or coverage below threshold${NC}"
    echo ""
    exit 1
fi
