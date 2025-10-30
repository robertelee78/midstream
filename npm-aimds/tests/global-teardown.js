/**
 * Global Test Teardown
 * Runs once after all tests complete
 */

module.exports = async () => {
  console.log('\n════════════════════════════════════════');
  console.log('  Test Suite Complete');
  console.log('════════════════════════════════════════');

  // Clean up test resources
  // (Add any global cleanup here)

  // Display test summary location
  const fs = require('fs');
  const path = require('path');

  const reportPaths = [
    { file: 'coverage/index.html', desc: 'Coverage Report' },
    { file: 'test-report.html', desc: 'Test Report' },
    { file: 'test-results/junit.xml', desc: 'JUnit Results' },
  ];

  console.log('\n📊 Test Reports:');
  reportPaths.forEach(({ file, desc }) => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${desc}: ${fullPath}`);
    }
  });

  // Display final memory usage
  const memoryUsage = process.memoryUsage();
  console.log('\n💾 Final Memory Usage:');
  console.log(`  • Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  • Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  • RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`);

  console.log('\n✨ All tests completed!\n');
};
