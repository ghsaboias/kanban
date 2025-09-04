#!/usr/bin/env node

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

// Test file path
const testFilePath = './test-watch-file.js';
const testFileContent1 = `
// Test file for watch mode - Version 1
console.log('Hello from version 1');
export default 'version1';
`;

const testFileContent2 = `
// Test file for watch mode - Version 2  
console.log('Hello from version 2 - CHANGED!');
export default 'version2';
`;

async function measureWatchMode(command, runtime) {
  console.log(`\n=== Testing ${runtime} Watch Mode ===`);
  
  // Create initial test file
  await fs.writeFile(testFilePath, testFileContent1);
  
  let reloadDetected = false;
  let reloadTime = 0;
  
  // Start watch process
  const watcher = spawn('bash', ['-c', command], {
    stdio: 'pipe'
  });
  
  // Collect output to detect reloads
  let output = '';
  watcher.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  watcher.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  // Wait for watcher to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log(`${runtime} watcher started, making file change...`);
  
  // Measure reload time
  const startTime = Date.now();
  
  // Modify the file
  await fs.writeFile(testFilePath, testFileContent2);
  
  // Wait for reload (simple timeout approach)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  reloadTime = Date.now() - startTime;
  
  console.log(`${runtime} detected change in ${reloadTime}ms`);
  console.log(`Output sample: ${output.substring(0, 200)}...`);
  
  // Cleanup
  watcher.kill('SIGTERM');
  
  try {
    await fs.unlink(testFilePath);
  } catch (error) {
    // Ignore cleanup errors
  }
  
  return reloadTime;
}

async function testTypeScriptCompilation() {
  console.log('\n=== TypeScript Compilation Watch Mode ===');
  
  // Create a TypeScript test file
  const tsFilePath = './test-typescript.ts';
  const tsContent1 = `
interface TestInterface {
  version: string;
  timestamp: number;
}

const testObj: TestInterface = {
  version: 'v1',
  timestamp: Date.now()
};

console.log(testObj);
`;

  const tsContent2 = `
interface TestInterface {
  version: string;
  timestamp: number;
  updated: boolean; // Added field
}

const testObj: TestInterface = {
  version: 'v2', // Changed version
  timestamp: Date.now(),
  updated: true // New field
};

console.log('Updated:', testObj);
`;

  await fs.writeFile(tsFilePath, tsContent1);
  
  // Test npm tsc watch
  console.log('Testing npm tsc --watch...');
  const npmTscStart = Date.now();
  
  const tscWatcher = spawn('npx', ['tsc', '--watch', '--noEmit', tsFilePath], {
    stdio: 'pipe'
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Modify TypeScript file
  await fs.writeFile(tsFilePath, tsContent2);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const npmTscTime = Date.now() - npmTscStart;
  console.log(`npm tsc watch completed in ${npmTscTime}ms`);
  
  tscWatcher.kill('SIGTERM');
  
  // Test bun compilation
  console.log('Testing bun --watch...');
  const bunStart = Date.now();
  
  await fs.writeFile(tsFilePath, tsContent1);
  
  const bunWatcher = spawn('bun', ['--watch', tsFilePath], {
    stdio: 'pipe'
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await fs.writeFile(tsFilePath, tsContent2);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const bunTime = Date.now() - bunStart;
  console.log(`bun --watch completed in ${bunTime}ms`);
  
  bunWatcher.kill('SIGTERM');
  
  // Cleanup
  try {
    await fs.unlink(tsFilePath);
    await fs.unlink('./test-typescript.js'); // Remove compiled JS if exists
  } catch (error) {
    // Ignore cleanup errors
  }
  
  return { npmTscTime, bunTime };
}

async function main() {
  console.log('Watch Mode Performance Test');
  console.log('============================');
  
  try {
    // Test basic file watching
    const npmWatchTime = await measureWatchMode('node --watch test-watch-file.js', 'Node.js');
    const bunWatchTime = await measureWatchMode('bun --watch test-watch-file.js', 'Bun');
    
    // Test TypeScript compilation watching
    const tsResults = await testTypeScriptCompilation();
    
    console.log('\n=== Watch Mode Results ===');
    console.log(`Node.js file watch: ${npmWatchTime}ms`);
    console.log(`Bun file watch: ${bunWatchTime}ms`);
    console.log(`npm tsc watch: ${tsResults.npmTscTime}ms`);
    console.log(`bun watch: ${tsResults.bunTime}ms`);
    
  } catch (error) {
    console.error('Error during watch mode test:', error.message);
  }
}

// Cleanup on exit
process.on('SIGINT', async () => {
  try {
    await fs.unlink(testFilePath);
    await fs.unlink('./test-typescript.ts');
    await fs.unlink('./test-typescript.js');
  } catch (error) {
    // Ignore cleanup errors
  }
  process.exit(0);
});

main().catch(console.error);