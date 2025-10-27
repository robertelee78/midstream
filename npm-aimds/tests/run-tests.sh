#!/bin/bash
# AIMDS Test Runner Script
# Runs comprehensive test suite with coverage reporting

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║     AIMDS Test Suite Runner                    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MIN_COVERAGE=98
PERFORMANCE_TIMEOUT=60000

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm install
  echo ""
fi

# Function to print section header
print_section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${GREEN}$1${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Parse command line arguments
SKIP_UNIT=false
SKIP_INTEGRATION=false
SKIP_PERFORMANCE=false
SKIP_BENCHMARKS=false
COVERAGE_ONLY=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --skip-unit) SKIP_UNIT=true ;;
    --skip-integration) SKIP_INTEGRATION=true ;;
    --skip-performance) SKIP_PERFORMANCE=true ;;
    --skip-benchmarks) SKIP_BENCHMARKS=true ;;
    --coverage-only) COVERAGE_ONLY=true ;;
    --help)
      echo "Usage: ./run-tests.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-unit          Skip unit tests"
      echo "  --skip-integration   Skip integration tests"
      echo "  --skip-performance   Skip performance tests"
      echo "  --skip-benchmarks    Skip benchmarks"
      echo "  --coverage-only      Run all tests with coverage only"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Start time
START_TIME=$(date +%s)

# Run coverage-only mode
if [ "$COVERAGE_ONLY" = true ]; then
  print_section "📊 Running Tests with Coverage"
  npm run test:coverage

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  echo ""
  echo -e "${GREEN}✅ Coverage run completed in ${DURATION}s${NC}"
  exit 0
fi

# Run unit tests
if [ "$SKIP_UNIT" = false ]; then
  print_section "🧪 Running Unit Tests"
  npm run test:unit -- --verbose

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Unit tests passed${NC}"
  else
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
  fi
fi

# Run integration tests
if [ "$SKIP_INTEGRATION" = false ]; then
  print_section "🔗 Running Integration Tests"
  npm run test:integration -- --verbose

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Integration tests passed${NC}"
  else
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
  fi
fi

# Run performance tests
if [ "$SKIP_PERFORMANCE" = false ]; then
  print_section "⚡ Running Performance Tests"
  npm run test:performance -- --verbose --testTimeout=$PERFORMANCE_TIMEOUT

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Performance tests passed${NC}"
  else
    echo -e "${RED}❌ Performance tests failed${NC}"
    exit 1
  fi
fi

# Generate coverage report
print_section "📊 Generating Coverage Report"
npm run test:coverage

# Check coverage thresholds
if [ -f "coverage/coverage-summary.json" ]; then
  COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
  echo ""
  echo "Total Coverage: ${COVERAGE}%"

  if (( $(echo "$COVERAGE >= $MIN_COVERAGE" | bc -l) )); then
    echo -e "${GREEN}✅ Coverage threshold met (${COVERAGE}% >= ${MIN_COVERAGE}%)${NC}"
  else
    echo -e "${RED}❌ Coverage below threshold (${COVERAGE}% < ${MIN_COVERAGE}%)${NC}"
    exit 1
  fi
fi

# Run benchmarks
if [ "$SKIP_BENCHMARKS" = false ]; then
  print_section "🏁 Running Benchmarks"
  npm run benchmark

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Benchmarks completed${NC}"
  else
    echo -e "${YELLOW}⚠️  Benchmarks encountered issues (non-fatal)${NC}"
  fi
fi

# Calculate total duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Print summary
print_section "📈 Test Summary"
echo "Duration: ${MINUTES}m ${SECONDS}s"
echo ""
echo -e "${GREEN}✅ All tests completed successfully!${NC}"
echo ""
echo "Coverage report: coverage/lcov-report/index.html"
echo ""
echo "Next steps:"
echo "  1. Review coverage report: open coverage/lcov-report/index.html"
echo "  2. Check performance metrics in test output"
echo "  3. Review benchmark results"
echo ""

exit 0
