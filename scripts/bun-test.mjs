#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

async function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${command}`));
      }
    });
    
    proc.on('error', reject);
  });
}

async function testWorkspace(workspace) {
  console.log(`🧪 Testing ${workspace}...`);
  const start = performance.now();
  
  try {
    switch (workspace) {
      case 'frontend':
        // Use Vitest directly instead of bun test for better compatibility
        await runCommand('bunx vitest run', './frontend');
        break;
      case 'backend':
        // Use Jest via npm to avoid Bun test runner compatibility issues  
        await runCommand('npm test', './backend');
        break;
    }
    
    const end = performance.now();
    const duration = ((end - start) / 1000).toFixed(2);
    console.log(`✅ ${workspace} tests passed in ${duration}s`);
    return parseFloat(duration);
  } catch (error) {
    const end = performance.now();
    const duration = ((end - start) / 1000).toFixed(2);
    console.error(`❌ ${workspace} tests failed in ${duration}s: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🧪 Starting Bun-compatible test suite...\n');
  const totalStart = performance.now();
  
  try {
    // Run tests in parallel for speed
    await Promise.all([
      testWorkspace('backend'),
      testWorkspace('frontend')
    ]);
    
    const totalEnd = performance.now();
    const totalDuration = ((totalEnd - totalStart) / 1000).toFixed(2);
    
    console.log(`\n🎉 All tests passed in ${totalDuration}s`);
  } catch (error) {
    const totalEnd = performance.now();
    const totalDuration = ((totalEnd - totalStart) / 1000).toFixed(2);
    
    console.error(`\n💥 Tests failed after ${totalDuration}s`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});