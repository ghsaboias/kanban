#!/usr/bin/env node

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

async function getDirectorySize(dirPath) {
  try {
    const result = execSync(`du -sk "${dirPath}"`, { encoding: 'utf8' });
    const sizeKB = parseInt(result.split('\t')[0]);
    return sizeKB * 1024; // Convert to bytes
  } catch (error) {
    return 0;
  }
}

async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      exists: true
    };
  } catch (error) {
    return {
      size: 0,
      exists: false
    };
  }
}

async function cleanBuildDirs() {
  const dirsToClean = ['./dist', './build', './frontend/dist', './backend/dist', './shared/dist'];
  
  for (const dir of dirsToClean) {
    try {
      execSync(`rm -rf "${dir}"`, { stdio: 'pipe' });
    } catch (error) {
      // Directory might not exist
    }
  }
}

async function buildAndMeasure(buildCommand, buildName) {
  console.log(`\n=== ${buildName} Build Analysis ===`);
  
  await cleanBuildDirs();
  
  const startTime = Date.now();
  console.log(`Running: ${buildCommand}`);
  
  try {
    execSync(buildCommand, { 
      stdio: 'pipe',
      timeout: 120000 // 2 minute timeout
    });
  } catch (error) {
    console.log(`Build failed: ${error.message.split('\n')[0]}`);
    return null;
  }
  
  const buildTime = Date.now() - startTime;
  
  // Analyze output sizes
  const outputDirs = ['./dist', './build', './frontend/dist', './backend/dist', './shared/dist'];
  const sizes = {};
  let totalSize = 0;
  
  for (const dir of outputDirs) {
    const size = await getDirectorySize(dir);
    if (size > 0) {
      sizes[dir] = size;
      totalSize += size;
    }
  }
  
  // Look for specific output files
  const commonOutputFiles = [
    './frontend/dist/index.html',
    './frontend/dist/assets/index.js',
    './frontend/dist/assets/index.css',
    './backend/dist/index.js',
    './shared/dist/index.js'
  ];
  
  const fileStats = {};
  for (const file of commonOutputFiles) {
    const stats = await getFileStats(file);
    if (stats.exists) {
      fileStats[file] = stats.size;
    }
  }
  
  return {
    buildTime,
    totalSize,
    directorySizes: sizes,
    fileStats,
    buildName
  };
}

async function main() {
  console.log('Bundle Size Analysis');
  console.log('====================');
  
  // Test npm builds
  const npmResult = await buildAndMeasure('npm run build:npm', 'npm');
  
  // Wait between builds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test bun builds
  const bunResult = await buildAndMeasure('bun run build:bun', 'bun');
  
  // Compare results
  console.log('\n=== BUILD COMPARISON ===');
  
  if (npmResult && bunResult) {
    console.log(`Build Time:`);
    console.log(`  npm: ${npmResult.buildTime}ms`);
    console.log(`  bun: ${bunResult.buildTime}ms`);
    
    const timeRatio = npmResult.buildTime / bunResult.buildTime;
    if (timeRatio > 1) {
      console.log(`  → Bun ${timeRatio.toFixed(1)}x faster`);
    } else {
      console.log(`  → npm ${(1/timeRatio).toFixed(1)}x faster`);
    }
    
    console.log(`\nBundle Size:`);
    console.log(`  npm total: ${(npmResult.totalSize / 1024).toFixed(0)} KB`);
    console.log(`  bun total: ${(bunResult.totalSize / 1024).toFixed(0)} KB`);
    
    if (npmResult.totalSize && bunResult.totalSize) {
      const sizeRatio = npmResult.totalSize / bunResult.totalSize;
      if (sizeRatio > 1) {
        console.log(`  → npm bundles ${sizeRatio.toFixed(1)}x larger`);
      } else {
        console.log(`  → bun bundles ${(1/sizeRatio).toFixed(1)}x larger`);
      }
    }
    
    // Detailed file comparison
    console.log(`\nDetailed File Sizes:`);
    const allFiles = new Set([...Object.keys(npmResult.fileStats), ...Object.keys(bunResult.fileStats)]);
    
    for (const file of allFiles) {
      const npmSize = npmResult.fileStats[file] || 0;
      const bunSize = bunResult.fileStats[file] || 0;
      
      if (npmSize || bunSize) {
        console.log(`  ${file}:`);
        console.log(`    npm: ${(npmSize / 1024).toFixed(1)} KB`);
        console.log(`    bun: ${(bunSize / 1024).toFixed(1)} KB`);
      }
    }
    
  } else {
    console.log('One or both builds failed');
    if (npmResult) console.log(`npm build: SUCCESS (${npmResult.buildTime}ms)`);
    if (bunResult) console.log(`bun build: SUCCESS (${bunResult.buildTime}ms)`);
  }
}

main().catch(console.error);