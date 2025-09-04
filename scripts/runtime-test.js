#!/usr/bin/env node

// Runtime performance test script
// Tests CPU-intensive operations, file I/O, and async operations

import { promises as fs } from 'fs';
import crypto from 'crypto';

async function cpuIntensiveTask() {
  // Fibonacci calculation (CPU intensive)
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }
  
  return fibonacci(35); // Takes a moment to compute
}

async function fileIoTask() {
  // File I/O operations
  const testData = 'x'.repeat(10000); // 10KB of data
  const tempFile = '/tmp/bun-vs-npm-test.txt';
  
  await fs.writeFile(tempFile, testData);
  const data = await fs.readFile(tempFile, 'utf8');
  await fs.unlink(tempFile);
  
  return data.length;
}

async function cryptoTask() {
  // Crypto operations
  const data = 'test data for hashing';
  const hash1 = crypto.createHash('sha256').update(data).digest('hex');
  const hash2 = crypto.createHash('md5').update(data).digest('hex');
  return { sha256: hash1.length, md5: hash2.length };
}

async function asyncTask() {
  // Promise-based async operations
  const promises = Array.from({ length: 100 }, (_, i) => 
    new Promise(resolve => setTimeout(() => resolve(i), Math.random() * 10))
  );
  
  const results = await Promise.all(promises);
  return results.reduce((sum, val) => sum + val, 0);
}

async function main() {
  const startTime = process.hrtime.bigint();
  
  console.log('Running runtime performance tests...');
  
  // Run all tasks
  const [fibResult, fileResult, cryptoResult, asyncResult] = await Promise.all([
    cpuIntensiveTask(),
    fileIoTask(),
    cryptoTask(),
    asyncTask()
  ]);
  
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
  
  console.log('Results:');
  console.log(`  Fibonacci(35): ${fibResult}`);
  console.log(`  File I/O: ${fileResult} bytes`);
  console.log(`  Crypto: SHA256=${cryptoResult.sha256}, MD5=${cryptoResult.md5}`);
  console.log(`  Async: ${asyncResult}`);
  console.log(`  Total time: ${duration.toFixed(2)}ms`);
  
  return duration;
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}