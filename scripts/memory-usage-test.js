#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { promises as fs } from 'fs';

function getProcessMemory(pid) {
  try {
    const result = execSync(`ps -o pid,rss,vsz -p ${pid}`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    if (lines.length > 1) {
      const [, rss, vsz] = lines[1].trim().split(/\s+/);
      return {
        rss: parseInt(rss) * 1024, // Convert KB to bytes
        vsz: parseInt(vsz) * 1024,
        pid: parseInt(pid)
      };
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function measureProcessMemory(command, duration = 10000) {
  console.log(`\nTesting: ${command}`);
  
  const process = spawn('bash', ['-c', command], {
    stdio: 'pipe'
  });
  
  const measurements = [];
  let maxRss = 0;
  let maxVsz = 0;
  
  // Wait for process to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const startTime = Date.now();
  const measurementInterval = setInterval(() => {
    const memory = getProcessMemory(process.pid);
    if (memory) {
      measurements.push({
        timestamp: Date.now() - startTime,
        rss: memory.rss,
        vsz: memory.vsz
      });
      
      maxRss = Math.max(maxRss, memory.rss);
      maxVsz = Math.max(maxVsz, memory.vsz);
    }
  }, 500);
  
  // Let it run for specified duration
  await new Promise(resolve => setTimeout(resolve, duration));
  
  clearInterval(measurementInterval);
  process.kill('SIGTERM');
  
  const avgRss = measurements.length > 0 ? 
    measurements.reduce((sum, m) => sum + m.rss, 0) / measurements.length : 0;
  
  return {
    maxRss,
    maxVsz, 
    avgRss,
    measurements: measurements.length,
    command
  };
}

async function testInstallMemory() {
  console.log('\n=== Package Installation Memory Usage ===');
  
  // Clean node_modules first
  try {
    execSync('rm -rf node_modules', { stdio: 'pipe' });
  } catch (error) {}
  
  // Test npm install memory
  console.log('Testing npm install memory usage...');
  const npmInstallResult = await measureProcessMemory('npm install', 20000);
  
  // Clean and test bun install memory
  try {
    execSync('rm -rf node_modules', { stdio: 'pipe' });
  } catch (error) {}
  
  console.log('Testing bun install memory usage...');
  const bunInstallResult = await measureProcessMemory('bun install', 20000);
  
  return { npm: npmInstallResult, bun: bunInstallResult };
}

async function testBuildMemory() {
  console.log('\n=== Build Process Memory Usage ===');
  
  const npmBuildResult = await measureProcessMemory('npm run build:npm', 15000);
  
  // Wait between builds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const bunBuildResult = await measureProcessMemory('bun run build:bun', 15000);
  
  return { npm: npmBuildResult, bun: bunBuildResult };
}

async function testRuntimeMemory() {
  console.log('\n=== Runtime Memory Usage ===');
  
  // Create a memory-intensive test script
  const testScript = `
    const data = [];
    for (let i = 0; i < 100000; i++) {
      data.push({
        id: i,
        name: 'item-' + i,
        value: Math.random(),
        nested: {
          timestamp: Date.now(),
          data: 'x'.repeat(100)
        }
      });
    }
    
    // Keep the process running for measurement
    setTimeout(() => {
      console.log('Memory test completed, data length:', data.length);
    }, 8000);
  `;
  
  await fs.writeFile('./memory-test.js', testScript);
  
  const nodeResult = await measureProcessMemory('node memory-test.js', 10000);
  const bunResult = await measureProcessMemory('bun memory-test.js', 10000);
  
  // Cleanup
  try {
    await fs.unlink('./memory-test.js');
  } catch (error) {}
  
  return { node: nodeResult, bun: bunResult };
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function printMemoryComparison(title, results) {
  console.log(`\n${title}:`);
  
  if (results.npm || results.node) {
    const npmResult = results.npm || results.node;
    const bunResult = results.bun;
    
    console.log(`  Max RSS (Physical Memory):`);
    console.log(`    npm/node: ${formatBytes(npmResult.maxRss)}`);
    console.log(`    bun: ${formatBytes(bunResult.maxRss)}`);
    
    const rssRatio = npmResult.maxRss / bunResult.maxRss;
    if (rssRatio > 1) {
      console.log(`    → Bun uses ${rssRatio.toFixed(1)}x less memory`);
    } else {
      console.log(`    → Node uses ${(1/rssRatio).toFixed(1)}x less memory`);
    }
    
    console.log(`  Avg RSS (Physical Memory):`);
    console.log(`    npm/node: ${formatBytes(npmResult.avgRss)}`);
    console.log(`    bun: ${formatBytes(bunResult.avgRss)}`);
    
    console.log(`  Max VSZ (Virtual Memory):`);
    console.log(`    npm/node: ${formatBytes(npmResult.maxVsz)}`);
    console.log(`    bun: ${formatBytes(bunResult.maxVsz)}`);
  }
}

async function main() {
  console.log('Memory Usage and Resource Consumption Test');
  console.log('==========================================');
  
  try {
    // Test different scenarios
    const installResults = await testInstallMemory();
    const buildResults = await testBuildMemory();
    const runtimeResults = await testRuntimeMemory();
    
    // Print comprehensive comparison
    console.log('\n=== MEMORY USAGE SUMMARY ===');
    printMemoryComparison('Package Installation', installResults);
    printMemoryComparison('Build Process', buildResults);
    printMemoryComparison('Runtime Execution', runtimeResults);
    
  } catch (error) {
    console.error('Error during memory testing:', error.message);
  }
}

main().catch(console.error);