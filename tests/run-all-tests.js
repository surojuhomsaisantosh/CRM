/**
 * Master Test Suite Runner for CRM
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const unitTestDir = path.resolve(__dirname, 'unit');
const testFiles = fs.readdirSync(unitTestDir)
  .filter(f => f.endsWith('.test.js'))
  .map(f => path.join(unitTestDir, f));

console.log('====================================================');
console.log(' 🚀 RUNNING COMPREHENSIVE CRM UNIT TEST SUITE');
console.log('====================================================');
console.log(`Discovered ${testFiles.length} test suites:`);
testFiles.forEach((file, idx) => {
  console.log(`  ${idx + 1}. ${path.basename(file)}`);
});
console.log('----------------------------------------------------');

const args = ['--test', ...testFiles];
const proc = spawn('node', args, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

proc.on('close', (code) => {
  console.log('----------------------------------------------------');
  if (code === 0) {
    console.log(' ✅ ALL UNIT TEST SUITES PASSED CLEANLY (100% SUCCESS)');
    console.log('====================================================');
    process.exit(0);
  } else {
    console.error(` ❌ UNIT TESTS FAILED (Exit Code: ${code})`);
    console.log('====================================================');
    process.exit(code || 1);
  }
});
