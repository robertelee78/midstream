#!/bin/bash

# AI Defence 2.0 - Docker Remote Environment Test Script
# This script runs comprehensive tests in an isolated Docker environment

set -e

echo "🚀 AI Defence 2.0 - Docker Remote Environment Testing"
echo "======================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Error: .env.local not found${NC}"
    echo "Please create .env.local with required environment variables"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: Cleaning previous Docker artifacts${NC}"
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true
docker system prune -f

echo ""
echo -e "${BLUE}📦 Step 2: Building Docker test environment${NC}"
docker-compose -f docker-compose.test.yml build --no-cache

echo ""
echo -e "${BLUE}🔐 Step 3: Loading environment variables from .env.local${NC}"
export $(cat .env.local | grep -v '^#' | xargs)
echo "✅ Environment variables loaded"

echo ""
echo -e "${BLUE}🧪 Step 4: Starting test services${NC}"
docker-compose -f docker-compose.test.yml up -d agentdb-service
sleep 5

echo ""
echo -e "${BLUE}🏃 Step 5: Running comprehensive test suite${NC}"
docker-compose -f docker-compose.test.yml run --rm aidefence-test

TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}📊 Step 6: Collecting test results${NC}"
docker cp aidefence-v2-test:/app/test-results ./test-results 2>/dev/null || echo "No test results to copy"
docker cp aidefence-v2-test:/app/coverage ./coverage 2>/dev/null || echo "No coverage to copy"

echo ""
echo -e "${BLUE}🧹 Step 7: Cleaning up${NC}"
docker-compose -f docker-compose.test.yml down -v

echo ""
echo "======================================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
    echo "Check ./test-results/test-output.log for details"
    exit $TEST_EXIT_CODE
fi
