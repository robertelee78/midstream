/**
 * Global Test Setup
 * Runs once before all tests
 */

module.exports = async () => {
  console.log('\n🚀 Starting AIMDS Quick Wins Test Suite\n');
  console.log('════════════════════════════════════════');
  console.log('  Test Configuration:');
  console.log(`  • Node Version: ${process.version}`);
  console.log(`  • Platform: ${process.platform}`);
  console.log(`  • Architecture: ${process.arch}`);
  console.log(`  • Memory: ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log('════════════════════════════════════════\n');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_TIMEOUT = '30000';

  // Initialize test database or services if needed
  // (Add any global setup here)

  // Verify required dependencies
  try {
    require('perf_hooks');
    console.log('✅ Performance hooks available');
  } catch (error) {
    console.warn('⚠️  Performance hooks not available');
  }

  // Check for GC availability
  if (global.gc) {
    console.log('✅ GC available for memory tests');
  } else {
    console.warn('⚠️  GC not available. Run tests with --expose-gc flag');
  }

  // Create test output directories
  const fs = require('fs');
  const path = require('path');

  const dirs = [
    'coverage',
    'test-results',
    'test-reports',
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });

  console.log('\n🧪 Test environment ready\n');
};
