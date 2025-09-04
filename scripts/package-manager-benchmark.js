#!/usr/bin/env node

import { execSync } from 'child_process';
import { promises as fs } from 'fs';

function timeCommand(command, description) {
  console.log(`\n${description}:`);
  const start = process.hrtime.bigint();
  
  try {
    execSync(command, { 
      stdio: 'pipe',
      timeout: 60000 // 60 second timeout
    });
    
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    console.log(`  Time: ${duration.toFixed(0)}ms`);
    return duration;
  } catch (error) {
    console.log(`  Error: ${error.message.split('\n')[0]}`);
    return null;
  }
}

async function measurePackageManagerOps() {
  console.log('Package Manager Operations Benchmark');
  console.log('=====================================');
  
  const results = {};
  
  // Test dry-run updates (safe, no actual changes)
  results.npmUpdate = timeCommand('npm update --dry-run', 'npm update (dry-run)');
  results.bunUpdate = timeCommand('bun update --dry', 'bun update (dry-run)');
  
  // Test listing dependencies
  results.npmList = timeCommand('npm list --depth=0', 'npm list dependencies');
  results.bunList = timeCommand('bun pm ls', 'bun list dependencies');
  
  // Test outdated check
  results.npmOutdated = timeCommand('npm outdated', 'npm outdated check');
  results.bunOutdated = timeCommand('bun pm ls --all', 'bun dependency analysis');
  
  console.log('\n=== SUMMARY ===');
  if (results.npmUpdate && results.bunUpdate) {
    const updateRatio = (results.npmUpdate / results.bunUpdate).toFixed(1);
    console.log(`Update check: npm ${results.npmUpdate.toFixed(0)}ms vs bun ${results.bunUpdate.toFixed(0)}ms (bun ${updateRatio}x faster)`);
  }
  
  if (results.npmList && results.bunList) {
    const listRatio = (results.npmList / results.bunList).toFixed(1);
    console.log(`List deps: npm ${results.npmList.toFixed(0)}ms vs bun ${results.bunList.toFixed(0)}ms (${listRatio < 1 ? 'npm' : 'bun'} ${Math.abs(listRatio)}x faster)`);
  }
  
  return results;
}

measurePackageManagerOps().catch(console.error);