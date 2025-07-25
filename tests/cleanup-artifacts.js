#!/usr/bin/env node

/**
 * BookmarkTidy Test Artifacts Cleanup Utility
 * Manually clean up old test artifacts (screenshots, logs, etc.)
 */

const { cleanupOldArtifacts } = require('./test-utils/extension-helpers');

async function main() {
  const args = process.argv.slice(2);
  const maxFiles = args.length > 0 ? parseInt(args[0], 10) : 5;
  
  if (isNaN(maxFiles) || maxFiles < 0) {
    console.log('Usage: node cleanup-artifacts.js [max-files-to-keep]');
    console.log('');
    console.log('Arguments:');
    console.log('  max-files-to-keep  Number of most recent artifact files to keep (default: 5)');
    console.log('');
    console.log('Examples:');
    console.log('  node cleanup-artifacts.js     # Keep 5 most recent files');
    console.log('  node cleanup-artifacts.js 10  # Keep 10 most recent files');
    console.log('  node cleanup-artifacts.js 0   # Remove all artifact files');
    process.exit(1);
  }
  
  console.log('🧹 BookmarkTidy Test Artifacts Cleanup');
  console.log('=====================================');
  console.log(`Keeping ${maxFiles} most recent artifact files...`);
  console.log('');
  
  try {
    await cleanupOldArtifacts(maxFiles);
    console.log('');
    console.log('✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
