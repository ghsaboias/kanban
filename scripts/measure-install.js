#!/usr/bin/env node

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import { existsSync, rmSync } from 'fs';

function cleanInstall(runtime) {
  console.log(`🧹 Cleaning for ${runtime} install...`);
  
  // Remove lockfiles and node_modules
  ['node_modules', 'package-lock.json', 'bun.lockb', 'yarn.lock'].forEach(item => {
    if (existsSync(item)) {
      rmSync(item, { recursive: true, force: true });
      console.log(`   Removed ${item}`);
    }
  });
  
  // Clean workspace node_modules too
  ['frontend/node_modules', 'backend/node_modules', 'shared/node_modules'].forEach(item => {
    if (existsSync(item)) {
      rmSync(item, { recursive: true, force: true });
      console.log(`   Removed ${item}`);
    }
  });
}

function measureInstall(runtime, clean = false) {
  if (clean) {
    cleanInstall(runtime);
  }
  
  const command = runtime === 'bun' ? 'bun install' : 'npm install';
  
  console.log(`📦 Measuring ${runtime} install${clean ? ' (clean)' : ' (cached)'}...`);
  
  const start = performance.now();
  
  try {
    execSync(command, { stdio: 'pipe', timeout: 300000 });
    const end = performance.now();
    const duration = ((end - start) / 1000).toFixed(2);
    
    console.log(`✅ ${runtime} install: ${duration}s`);
    return { runtime, duration: parseFloat(duration), success: true, clean };
  } catch (error) {
    const end = performance.now();
    const duration = ((end - start) / 1000).toFixed(2);
    
    console.log(`❌ ${runtime} install failed: ${duration}s`);
    return { runtime, duration: parseFloat(duration), success: false, clean, error: error.message };
  }
}

// Parse arguments
const args = process.argv.slice(2);
const mode = args[0] || 'both';

if (mode === 'help') {
  console.log(`Usage: node measure-install.js [mode]

Modes:
  clean-node     - Clean install with npm
  cached-node    - Cached install with npm  
  clean-bun      - Clean install with bun
  cached-bun     - Cached install with bun
  compare-clean  - Compare clean installs
  compare-cached - Compare cached installs
  both           - All comparisons

Examples:
  node measure-install.js clean-node
  node measure-install.js compare-clean
`);
  process.exit(0);
}

const results = [];

switch (mode) {
  case 'clean-node':
    results.push(measureInstall('npm', true));
    break;
    
  case 'cached-node':
    results.push(measureInstall('npm', false));
    break;
    
  case 'clean-bun':
    results.push(measureInstall('bun', true));
    break;
    
  case 'cached-bun':
    results.push(measureInstall('bun', false));
    break;
    
  case 'compare-clean':
    console.log('🔄 Comparing clean installs...\n');
    results.push(measureInstall('npm', true));
    console.log('');
    results.push(measureInstall('bun', true));
    break;
    
  case 'compare-cached': 
    console.log('🔄 Comparing cached installs...\n');
    // Ensure we have a lockfile first
    if (!existsSync('package-lock.json') && !existsSync('bun.lockb')) {
      console.log('No lockfile found, running initial install...');
      measureInstall('npm', true);
      console.log('');
    }
    results.push(measureInstall('npm', false));
    console.log('');
    results.push(measureInstall('bun', false));
    break;
    
  case 'both':
    console.log('🎯 Running all install comparisons...\n');
    
    console.log('1️⃣ CLEAN INSTALL COMPARISON');
    console.log('─'.repeat(40));
    results.push(measureInstall('npm', true));
    console.log('');
    results.push(measureInstall('bun', true));
    
    console.log('\n2️⃣ CACHED INSTALL COMPARISON');  
    console.log('─'.repeat(40));
    results.push(measureInstall('npm', false));
    console.log('');
    results.push(measureInstall('bun', false));
    break;
    
  default:
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
}

// Print comparison if we have multiple results
if (results.length >= 2) {
  console.log('\n📊 INSTALL COMPARISON');
  console.log('─'.repeat(50));
  
  const successful = results.filter(r => r.success);
  
  successful.forEach(result => {
    const type = result.clean ? 'clean' : 'cached';
    console.log(`${result.runtime} (${type}): ${result.duration}s`);
  });
  
  // Compare if we have node and bun results
  const nodeResults = successful.filter(r => r.runtime === 'npm');
  const bunResults = successful.filter(r => r.runtime === 'bun');
  
  if (nodeResults.length > 0 && bunResults.length > 0) {
    nodeResults.forEach(node => {
      const bunResult = bunResults.find(b => b.clean === node.clean);
      if (bunResult) {
        const improvement = ((node.duration - bunResult.duration) / node.duration * 100);
        const speedup = node.duration / bunResult.duration;
        const type = node.clean ? 'clean' : 'cached';
        
        if (improvement > 0) {
          console.log(`🚀 Bun ${type} install is ${improvement.toFixed(1)}% faster (${speedup.toFixed(1)}x speedup)`);
        } else {
          console.log(`🐌 npm ${type} install is ${Math.abs(improvement).toFixed(1)}% faster`);
        }
      }
    });
  }
}