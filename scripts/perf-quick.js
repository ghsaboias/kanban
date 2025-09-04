#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

// Quick performance tests that don't require full rebuilds
const quickTests = {
  node: {
    'startup-time': 'node --version',
    'package-info': 'npm list --depth=0',
    'lint-check': 'npm run lint 2>/dev/null || echo "lint not available"',
    'typecheck': 'npm run typecheck 2>/dev/null || echo "typecheck not available"'
  },
  bun: {
    'startup-time': 'bun --version', 
    'package-info': 'bun pm ls --depth=0',
    'lint-check': 'bun run lint 2>/dev/null || echo "lint not available"',
    'typecheck': 'bun run typecheck 2>/dev/null || echo "typecheck not available"'
  }
};

async function measureQuick(name, command) {
  return new Promise((resolve) => {
    console.log(`⚡ ${name}...`);
    const start = performance.now();
    
    const [cmd, ...args] = command.split(' ');
    const proc = spawn(cmd, args, { 
      stdio: 'pipe',
      shell: true 
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout?.on('data', (data) => stdout += data);
    proc.stderr?.on('data', (data) => stderr += data);
    
    proc.on('close', (code) => {
      const end = performance.now();
      const duration = ((end - start) / 1000).toFixed(3);
      
      if (code === 0) {
        console.log(`   ✅ ${duration}s`);
      } else {
        console.log(`   ❌ ${duration}s (exit code: ${code})`);
      }
      
      resolve({
        name,
        command,
        duration: parseFloat(duration),
        success: code === 0,
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    proc.on('error', (error) => {
      const end = performance.now();
      const duration = ((end - start) / 1000).toFixed(3);
      console.log(`   ❌ ${duration}s (${error.message})`);
      
      resolve({
        name,
        command,
        duration: parseFloat(duration),
        success: false,
        error: error.message
      });
    });
  });
}

async function runQuickTests(runtime) {
  console.log(`\n🔥 Quick ${runtime.toUpperCase()} Tests`);
  console.log('─'.repeat(30));
  
  const tests = quickTests[runtime];
  const results = [];
  
  for (const [testName, command] of Object.entries(tests)) {
    const result = await measureQuick(testName, command);
    results.push(result);
  }
  
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  const successful = results.filter(r => r.success).length;
  
  console.log(`\n📊 ${runtime} Quick Summary: ${totalTime.toFixed(3)}s total, ${successful}/${results.length} successful`);
  
  return { runtime, results, totalTime, successful };
}

// Parse arguments
const args = process.argv.slice(2);
const runtime = args[0] || 'both';

if (runtime === 'help') {
  console.log(`Usage: node perf-quick.js [runtime]

Runtime: node | bun | both

Examples:
  node perf-quick.js node
  node perf-quick.js bun  
  node perf-quick.js both
`);
  process.exit(0);
}

async function main() {
  if (runtime === 'both') {
    const nodeResults = await runQuickTests('node');
    const bunResults = await runQuickTests('bun');
    
    console.log('\n🏁 QUICK COMPARISON');
    console.log('─'.repeat(40));
    console.log(`Node.js: ${nodeResults.totalTime.toFixed(3)}s`);
    console.log(`Bun:     ${bunResults.totalTime.toFixed(3)}s`);
    
    const improvement = ((nodeResults.totalTime - bunResults.totalTime) / nodeResults.totalTime * 100);
    const speedup = nodeResults.totalTime / bunResults.totalTime;
    
    if (improvement > 0) {
      console.log(`🚀 Bun is ${improvement.toFixed(1)}% faster (${speedup.toFixed(2)}x speedup)`);
    } else {
      console.log(`🐌 Node is ${Math.abs(improvement).toFixed(1)}% faster`);
    }
    
  } else if (quickTests[runtime]) {
    await runQuickTests(runtime);
  } else {
    console.error(`Unknown runtime: ${runtime}`);
    process.exit(1);
  }
}

main().catch(console.error);