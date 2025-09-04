#!/usr/bin/env node

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

// Custom build script to avoid Bun workspace infinite loop bug
const workspaces = ['shared', 'frontend', 'backend'];

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

async function buildWorkspace(workspace) {
  console.log(`🔨 Building ${workspace}...`);
  const start = performance.now();
  
  try {
    switch (workspace) {
      case 'shared':
        await runCommand('bun run build', './shared');
        break;
      case 'frontend':
        await runCommand('bun run build', './frontend');
        break;
      case 'backend':
        await runCommand('bunx tsc', './backend');
        break;
    }
    
    const end = performance.now();
    const duration = ((end - start) / 1000).toFixed(2);
    console.log(`✅ ${workspace} built in ${duration}s`);
    return parseFloat(duration);
  } catch (error) {
    const end = performance.now();
    const duration = ((end - start) / 1000).toFixed(2);
    console.error(`❌ ${workspace} failed in ${duration}s: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Bun workspace build (custom)...\n');
  const totalStart = performance.now();
  
  try {
    // Build in dependency order: shared first, then frontend and backend in parallel
    await buildWorkspace('shared');
    
    // Build frontend and backend in parallel
    await Promise.all([
      buildWorkspace('frontend'),
      buildWorkspace('backend')
    ]);
    
    const totalEnd = performance.now();
    const totalDuration = ((totalEnd - totalStart) / 1000).toFixed(2);
    
    console.log(`\n🎉 All workspaces built successfully in ${totalDuration}s`);
  } catch (error) {
    const totalEnd = performance.now();
    const totalDuration = ((totalEnd - totalStart) / 1000).toFixed(2);
    
    console.error(`\n💥 Build failed after ${totalDuration}s`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Build script error:', error);
  process.exit(1);
});