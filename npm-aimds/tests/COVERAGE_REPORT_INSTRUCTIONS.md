# Coverage Report Instructions

## Generating Coverage Reports

### Step 1: Install Dependencies
```bash
cd /workspaces/midstream/npm-aimds/tests
npm install
```

### Step 2: Run Tests with Coverage
```bash
npm run test:coverage
```

This will:
- Run all tests (unit, integration, performance)
- Collect coverage data from `/workspaces/midstream/AIMDS/src/**/*.ts`
- Generate reports in multiple formats
- Enforce >98% coverage thresholds

### Step 3: View Reports

#### Terminal Output
Coverage summary is displayed in the terminal after test completion.

#### HTML Report (Interactive)
```bash
open coverage/lcov-report/index.html
# or
xdg-open coverage/lcov-report/index.html
```

Navigate through files, see line-by-line coverage with color coding:
- 🟢 Green: Covered lines
- 🔴 Red: Uncovered lines
- 🟡 Yellow: Partially covered branches

#### LCOV Report (CI Integration)
```
coverage/lcov.info
```

Standard LCOV format for CI/CD integration (Jenkins, GitHub Actions, etc.)

#### JSON Summary
```
coverage/coverage-summary.json
```

Machine-readable coverage statistics.

### Step 4: Generate Markdown Report
```bash
npx ts-node generate-report.ts
```

Creates `TEST_REPORT.md` with:
- Coverage tables
- Visual progress bars
- Performance target status
- Test distribution
- Success criteria

## Coverage Thresholds

Configured in `jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 98,
    functions: 98,
    lines: 98,
    statements: 98
  }
}
```

**Tests will FAIL if any metric drops below 98%**

## Understanding Coverage

### Statements
Individual executable statements in the code.
```typescript
const x = 1;  // 1 statement
console.log(x);  // 1 statement
```

### Branches
Conditional branches (if/else, switch, ternary).
```typescript
if (condition) {  // 2 branches: true and false
  doA();
} else {
  doB();
}
```

### Functions
Function/method declarations that are called.
```typescript
function foo() {  // 1 function
  return 42;
}
foo();  // Function called - covered
```

### Lines
Physical lines of code that are executed.

## Improving Coverage

### Find Uncovered Code
1. Open HTML report
2. Navigate to file with low coverage
3. Identify red (uncovered) lines
4. Write tests to cover those lines

### Common Gaps
- Error handling paths
- Edge cases
- Async error handling
- Cleanup/shutdown code
- Rarely used utility functions

### Adding Tests
```typescript
describe('UncoveredFeature', () => {
  test('should handle error case', () => {
    // Test the red lines
  });
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests with Coverage
  run: |
    cd npm-aimds/tests
    npm install
    npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./npm-aimds/coverage/lcov.info
```

### Jenkins Example
```groovy
stage('Test with Coverage') {
  steps {
    dir('npm-aimds/tests') {
      sh 'npm install'
      sh 'npm run test:coverage'
    }
  }
  post {
    always {
      publishHTML([
        reportDir: 'npm-aimds/coverage/lcov-report',
        reportFiles: 'index.html',
        reportName: 'Coverage Report'
      ])
    }
  }
}
```

## Troubleshooting

### Coverage Not Generated
- Ensure tests are actually running
- Check `collectCoverageFrom` paths in `jest.config.js`
- Verify source files exist at specified paths

### Low Coverage
- Review HTML report for uncovered lines
- Add tests for error paths
- Test edge cases
- Verify mocks aren't hiding real code

### Tests Failing on Coverage Threshold
- Coverage dropped below 98%
- Review recent changes
- Add tests for new code
- Ensure removed tests had replacements

### Performance Issues
- Use `maxWorkers` to limit parallelization
- Run specific test files during development
- Use watch mode for TDD

## Best Practices

1. **Run coverage regularly** during development
2. **Review HTML reports** to understand gaps
3. **Test behavior, not coverage** - coverage is a metric, not a goal
4. **Cover edge cases** - errors, boundaries, nulls
5. **Keep tests maintainable** - don't sacrifice quality for coverage
6. **Use snapshots judiciously** - they can inflate coverage

## Quick Reference

```bash
# Install
cd tests && npm install

# Run all tests with coverage
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html

# Generate markdown report
npx ts-node generate-report.ts

# Run specific tests
npm test -- agentdb-client.test.ts

# Watch mode (no coverage)
npm run test:watch

# CI mode
npm run test:ci
```

## Example Output

```
---------------------------|---------|----------|---------|---------|-------------------
File                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------------------|---------|----------|---------|---------|-------------------
All files                  |   98.5  |   98.2   |  98.7   |  98.5   |                   
 agentdb/client.ts         |   99.1  |   98.8   |  100    |  99.1   | 247,389           
 lean-agentic/verifier.ts  |   98.3  |   97.9   |  98.5   |  98.3   | 189,345,412       
 gateway/server.ts         |   98.2  |   98.0   |  97.8   |  98.2   | 294,301,445       
---------------------------|---------|----------|---------|---------|-------------------
```

✅ All coverage targets met!
