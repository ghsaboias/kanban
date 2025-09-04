#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

function measureDevStartup(runtime, timeout = 60000) {
  return new Promise((resolve) => {
    console.log(`🚀 Measuring ${runtime} dev server startup...`);
    
    const command = runtime === 'bun' ? 'bun run dev' : 'npm run dev';
    const [cmd, ...args] = command.split(' ');
    
    const start = performance.now();
    let serverReady = false;
    let frontendReady = false;
    let backendReady = false;
    
    const proc = spawn(cmd, args, { stdio: 'pipe', shell: true });
    
    let output = '';
    
    const checkReady = () => {
      if (serverReady && frontendReady && backendReady) {
        const end = performance.now();
        const duration = ((end - start) / 1000).toFixed(2);
        
        console.log(`✅ ${runtime} dev servers ready: ${duration}s`);
        
        proc.kill('SIGTERM');
        
        resolve({
          runtime,
          duration: parseFloat(duration),
          success: true,
          output: output.slice(-1000) // Last 1000 chars
        });
      }
    };
    
    const processOutput = (data) => {
      const text = data.toString();
      output += text;
      
      // Check for various server ready indicators
      if (text.includes('Local:') || text.includes('ready in') || text.includes('development server')) {
        frontendReady = true;
      }
      
      if (text.includes('Server running') || text.includes('listening on') || text.includes(':3000')) {
        backendReady = true;  
      }
      
      if (text.includes('ready') || text.includes('compiled') || frontendReady || backendReady) {
        serverReady = true;
      }
      
      checkReady();
    };
    
    proc.stdout.on('data', processOutput);
    proc.stderr.on('data', processOutput);
    
    // Timeout handler
    const timeoutId = setTimeout(() => {
      const end = performance.now();
      const duration = ((end - start) / 1000).toFixed(2);
      
      console.log(`❌ ${runtime} dev startup timeout: ${duration}s`);
      
      proc.kill('SIGKILL');
      
      resolve({
        runtime,
        duration: parseFloat(duration),
        success: false,
        error: 'Timeout',
        output: output.slice(-1000)
      });
    }, timeout);
    
    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      const end = performance.now();
      const duration = ((end - start) / 1000).toFixed(2);
      
      console.log(`❌ ${runtime} dev startup error: ${duration}s - ${error.message}`);
      
      resolve({
        runtime,
        duration: parseFloat(duration),
        success: false,
        error: error.message,
        output
      });
    });
    
    proc.on('exit', (code) => {
      clearTimeout(timeoutId);
      if (!serverReady) {
        const end = performance.now();
        const duration = ((end - start) / 1000).toFixed(2);
        
        console.log(`❌ ${runtime} dev server exited: ${duration}s (code: ${code})`);
        
        resolve({
          runtime,
          duration: parseFloat(duration),
          success: false,
          error: `Process exited with code ${code}`,
          output
        });
      }
    });
  });
}

async function measureHotReload(runtime, timeout = 30000) {
  console.log(`🔥 Measuring ${runtime} hot reload...`);
  
  // Start dev server first
  const command = runtime === 'bun' ? 'bun run dev' : 'npm run dev';
  const [cmd, ...args] = command.split(' ');
  
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: 'pipe', shell: true });
    let serverReady = false;
    let output = '';
    
    const processOutput = (data) => {
      const text = data.toString();
      output += text;
      
      if (text.includes('ready') || text.includes('Local:') || text.includes('Server running')) {
        if (!serverReady) {
          serverReady = true;
          
          // Give it a moment to fully start
          setTimeout(() => {
            triggerHotReload();
          }, 2000);
        }
      }
      
      // Look for hot reload indicators
      if (serverReady && (text.includes('hmr update') || text.includes('updated') || text.includes('reload'))) {
        const end = performance.now();
        const duration = ((end - start) / 1000).toFixed(2);
        
        console.log(`✅ ${runtime} hot reload: ${duration}s`);
        
        proc.kill('SIGTERM');
        
        resolve({
          runtime,
          operation: 'hot-reload',
          duration: parseFloat(duration),
          success: true
        });
      }
    };
    
    proc.stdout.on('data', processOutput);
    proc.stderr.on('data', processOutput);
    
    let start;
    
    const triggerHotReload = () => {
      console.log(`   Triggering file change...`);
      start = performance.now();
      
      // Make a small change to trigger hot reload
      try {
        const { writeFileSync, readFileSync } = await import('fs');
        const testFile = 'frontend/src/App.tsx';
        
        if (require('fs').existsSync(testFile)) {
          const content = readFileSync(testFile, 'utf8');
          const comment = `\n// Hot reload test ${Date.now()}\n`;
          writeFileSync(testFile, content + comment);
          
          // Clean up after a delay
          setTimeout(() => {
            writeFileSync(testFile, content);
          }, 5000);
        } else {
          resolve({
            runtime,
            operation: 'hot-reload',
            duration: 0,
            success: false,
            error: 'Test file not found'
          });
        }
      } catch (error) {
        resolve({
          runtime,
          operation: 'hot-reload',
          duration: 0,
          success: false,
          error: error.message
        });
      }
    };
    
    // Timeout
    setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        runtime,
        operation: 'hot-reload',
        duration: timeout / 1000,
        success: false,
        error: 'Timeout'
      });
    }, timeout);
  });
}

// Parse arguments
const args = process.argv.slice(2);
const mode = args[0] || 'startup-both';

if (mode === 'help') {
  console.log(`Usage: node measure-dev-startup.js [mode]

Modes:
  startup-node    - Measure npm dev startup only
  startup-bun     - Measure bun dev startup only
  startup-both    - Compare dev startup times
  hot-reload-node - Measure npm hot reload
  hot-reload-bun  - Measure bun hot reload
  hot-reload-both - Compare hot reload times
  all             - All measurements

Examples:
  node measure-dev-startup.js startup-both
  node measure-dev-startup.js all
`);
  process.exit(0);
}

async function main() {
  const results = [];
  
  switch (mode) {
    case 'startup-node':
      results.push(await measureDevStartup('npm'));
      break;
      
    case 'startup-bun':
      results.push(await measureDevStartup('bun'));
      break;
      
    case 'startup-both':
      console.log('🔄 Comparing dev startup times...\n');
      results.push(await measureDevStartup('npm'));
      console.log('');
      results.push(await measureDevStartup('bun'));
      break;
      
    case 'hot-reload-node':
      results.push(await measureHotReload('npm'));
      break;
      
    case 'hot-reload-bun':
      results.push(await measureHotReload('bun'));
      break;
      
    case 'hot-reload-both':
      console.log('🔄 Comparing hot reload times...\n');
      results.push(await measureHotReload('npm'));
      console.log('');
      results.push(await measureHotReload('bun'));
      break;
      
    case 'all':
      console.log('🎯 Running all dev measurements...\n');
      
      console.log('1️⃣ STARTUP TIME COMPARISON');
      console.log('─'.repeat(40));
      results.push(await measureDevStartup('npm'));
      console.log('');
      results.push(await measureDevStartup('bun'));
      
      console.log('\n2️⃣ HOT RELOAD COMPARISON');
      console.log('─'.repeat(40));
      results.push(await measureHotReload('npm'));
      console.log('');
      results.push(await measureHotReload('bun'));
      break;
      
    default:
      console.error(`Unknown mode: ${mode}`);
      process.exit(1);
  }
  
  // Print comparison if we have results
  if (results.length >= 2) {
    console.log('\n📊 DEV PERFORMANCE COMPARISON');
    console.log('─'.repeat(50));
    
    const successful = results.filter(r => r.success);
    const grouped = {};
    
    successful.forEach(result => {
      const op = result.operation || 'startup';
      if (!grouped[op]) grouped[op] = {};
      grouped[op][result.runtime] = result.duration;
    });
    
    Object.entries(grouped).forEach(([operation, runtimes]) => {
      console.log(`\n${operation.toUpperCase()}:`);
      Object.entries(runtimes).forEach(([runtime, duration]) => {
        console.log(`  ${runtime}: ${duration}s`);
      });
      
      if (runtimes.npm && runtimes.bun) {
        const improvement = ((runtimes.npm - runtimes.bun) / runtimes.npm * 100);
        const speedup = runtimes.npm / runtimes.bun;
        
        if (improvement > 0) {
          console.log(`  🚀 Bun is ${improvement.toFixed(1)}% faster (${speedup.toFixed(1)}x speedup)`);
        } else {
          console.log(`  🐌 npm is ${Math.abs(improvement).toFixed(1)}% faster`);
        }
      }
    });
  }
}

main().catch(console.error);