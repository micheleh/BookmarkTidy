#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const tests = {
  'extension-basic': 'e2e/test-extension.js',
  'extension-ui': 'e2e/test-extension-ui.js', 
  'dead-links': 'e2e/test-dead-links.js',
  'dead-links-simple': 'e2e/test-simple.js',
  'monitor': 'e2e/monitor-extension.js',
  'add-bookmarks': 'e2e/add-test-bookmarks.js',
  'automatic-background': '__tests__/features/automatic-background.test.js'
};

function runTest(testName) {
  if (!tests[testName]) {
    console.log('Available tests:');
    Object.keys(tests).forEach(name => {
      console.log(`  - ${name}: ${tests[name]}`);
    });
    return;
  }

  const testPath = path.join(__dirname, tests[testName]);
  console.log(`🚀 Running test: ${testName}`);
  console.log(`📁 Test file: ${testPath}`);
  
  const child = spawn('node', [testPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(`✅ Test ${testName} completed successfully`);
    } else {
      console.log(`❌ Test ${testName} failed with code ${code}`);
    }
  });
}

// Get test name from command line
const testName = process.argv[2];

if (!testName) {
  console.log('Usage: node run-tests.js <test-name>');
  console.log('\nAvailable tests:');
  Object.keys(tests).forEach(name => {
    console.log(`  - ${name}`);
  });
  process.exit(1);
}

runTest(testName);
