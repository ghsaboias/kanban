#!/usr/bin/env node

import { performance } from 'perf_hooks';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

class PerformanceBenchmark {
  constructor(runtime = 'node') {
    this.runtime = runtime;
    this.results = {
      runtime,
      timestamp: new Date().toISOString(),
      metrics: {}
    };
  }

  async measureInstallTime() {
    console.log(`📦 Measuring ${this.runtime} install time...`);
    
    // Clean node_modules first
    await execAsync('rm -rf node_modules package-lock.json bun.lockb');
    
    const start = performance.now();
    
    try {
      if (this.runtime === 'bun') {
        await execAsync('bun install', { timeout: 300000 });
      } else {
        await execAsync('npm install', { timeout: 300000 });
      }
    } catch (error) {
      console.error(`Install failed: ${error.message}`);
      return null;
    }
    
    const end = performance.now();
    const installTime = (end - start) / 1000;
    
    this.results.metrics.installTime = installTime;
    console.log(`   ✅ Install time: ${installTime.toFixed(2)}s`);
    
    return installTime;
  }

  async measureStartupTime() {
    console.log(`🚀 Measuring ${this.runtime} startup time...`);
    
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      
      const child = this.runtime === 'bun' 
        ? spawn('bun', ['run', 'dev:backend'], { stdio: 'pipe' })
        : spawn('npm', ['run', 'dev:backend'], { stdio: 'pipe' });
      
      await new Promise((resolve) => {
        let resolved = false;
        
        const onData = (data) => {
          if (resolved) return;
          const output = data.toString();
          if (output.includes('Server running') || 
              output.includes('listening') ||
              output.includes('started') ||
              output.includes('ready')) {
            const end = performance.now();
            measurements.push((end - start) / 1000);
            child.kill();
            resolved = true;
            resolve();
          }
        };
        
        const onError = (error) => {
          if (resolved) return;
          console.log(`   ⚠️  Attempt ${i + 1} failed: ${error.message}`);
          child.kill();
          resolved = true;
          resolve();
        };
        
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('error', onError);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          if (resolved) return;
          console.log(`   ⚠️  Attempt ${i + 1} timed out`);
          child.kill();
          resolved = true;
          resolve();
        }, 30000);
      });
    }
    
    if (measurements.length === 0) {
      console.log(`   ❌ Average startup time: Failed (no successful measurements)`);
      this.results.metrics.startupTime = {
        average: null,
        measurements: []
      };
      return null;
    }
    
    const avgStartupTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    this.results.metrics.startupTime = {
      average: avgStartupTime,
      measurements
    };
    
    console.log(`   ✅ Average startup time: ${avgStartupTime.toFixed(2)}s`);
    return avgStartupTime;
  }

  async measureBuildTime() {
    console.log(`🔨 Measuring ${this.runtime} build time...`);
    
    const start = performance.now();
    
    try {
      if (this.runtime === 'bun') {
        await execAsync('bun run build', { timeout: 180000 });
      } else {
        await execAsync('npm run build', { timeout: 180000 });
      }
    } catch (error) {
      console.error(`Build failed: ${error.message}`);
      return null;
    }
    
    const end = performance.now();
    const buildTime = (end - start) / 1000;
    
    this.results.metrics.buildTime = buildTime;
    console.log(`   ✅ Build time: ${buildTime.toFixed(2)}s`);
    
    return buildTime;
  }

  async measureTestTime() {
    console.log(`🧪 Measuring ${this.runtime} test time...`);
    
    const start = performance.now();
    
    try {
      if (this.runtime === 'bun') {
        await execAsync('bun run test', { timeout: 120000 });
      } else {
        await execAsync('npm run test', { timeout: 120000 });
      }
    } catch (error) {
      console.error(`Tests failed: ${error.message}`);
      return null;
    }
    
    const end = performance.now();
    const testTime = (end - start) / 1000;
    
    this.results.metrics.testTime = testTime;
    console.log(`   ✅ Test time: ${testTime.toFixed(2)}s`);
    
    return testTime;
  }

  async measureMemoryUsage() {
    console.log(`💾 Measuring ${this.runtime} memory usage...`);
    
    const child = this.runtime === 'bun'
      ? spawn('bun', ['run', 'dev:backend'], { stdio: 'pipe' })
      : spawn('npm', ['run', 'dev:backend'], { stdio: 'pipe' });
    
    const measurements = [];
    
    await new Promise((resolve) => {
      child.stdout.on('data', (data) => {
        if (data.toString().includes('Server running') || 
            data.toString().includes('listening')) {
          
          // Measure memory every second for 10 seconds
          let count = 0;
          const interval = setInterval(async () => {
            try {
              const { stdout } = await execAsync(`ps -o rss= -p ${child.pid}`);
              const memoryKB = parseInt(stdout.trim());
              measurements.push(memoryKB);
              count++;
              
              if (count >= 10) {
                clearInterval(interval);
                child.kill();
                resolve();
              }
            } catch (error) {
              clearInterval(interval);
              child.kill();
              resolve();
            }
          }, 1000);
        }
      });
      
      setTimeout(() => {
        child.kill();
        resolve();
      }, 20000);
    });
    
    if (measurements.length > 0) {
      const avgMemoryMB = measurements.reduce((a, b) => a + b, 0) / measurements.length / 1024;
      this.results.metrics.memoryUsage = {
        averageMB: avgMemoryMB,
        measurements: measurements.map(kb => kb / 1024)
      };
      console.log(`   ✅ Average memory usage: ${avgMemoryMB.toFixed(2)}MB`);
      return avgMemoryMB;
    }
    
    console.log(`   ❌ Memory usage: Failed (no measurements collected)`);
    this.results.metrics.memoryUsage = null;
    return null;
  }

  async measureColdStartPerformance() {
    console.log(`❄️  Measuring ${this.runtime} cold start performance...`);
    
    // Kill any running processes
    try {
      await execAsync('pkill -f "vite\\|tsx\\|bun"');
    } catch (error) {
      // Ignore if no processes found
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const start = performance.now();
    
    const child = this.runtime === 'bun'
      ? spawn('bun', ['run', 'dev'], { stdio: 'pipe' })
      : spawn('npm', ['run', 'dev'], { stdio: 'pipe' });
    
    let frontendReady = false;
    let backendReady = false;
    
    await new Promise((resolve) => {
      child.stdout.on('data', (data) => {
        const output = data.toString();
        
        if (output.includes('Local:') && output.includes('5173')) {
          frontendReady = true;
        }
        
        if (output.includes('Server running') || output.includes('listening')) {
          backendReady = true;
        }
        
        if (frontendReady && backendReady) {
          const end = performance.now();
          const coldStartTime = (end - start) / 1000;
          this.results.metrics.coldStartTime = coldStartTime;
          console.log(`   ✅ Cold start time: ${coldStartTime.toFixed(2)}s`);
          child.kill();
          resolve();
        }
      });
      
      setTimeout(() => {
        console.log(`   ❌ Cold start: Timed out after 60s`);
        this.results.metrics.coldStartTime = null;
        child.kill();
        resolve();
      }, 60000);
    });
  }

  async measureBundleSize() {
    console.log(`📊 Measuring ${this.runtime} bundle size...`);
    
    try {
      // Ensure build exists
      await execAsync(this.runtime === 'bun' ? 'bun run build' : 'npm run build');
      
      const { stdout } = await execAsync('find . -name "dist" -type d | head -1 | xargs du -sh');
      const bundleSize = stdout.split('\t')[0];
      
      this.results.metrics.bundleSize = bundleSize;
      console.log(`   ✅ Bundle size: ${bundleSize}`);
      
      return bundleSize;
    } catch (error) {
      console.error(`Bundle size measurement failed: ${error.message}`);
      return null;
    }
  }

  async runAllBenchmarks() {
    console.log(`\n🎯 Starting ${this.runtime.toUpperCase()} Performance Benchmark\n`);
    
    await this.measureInstallTime();
    await this.measureBuildTime();
    await this.measureTestTime();
    await this.measureStartupTime();
    await this.measureColdStartPerformance();
    await this.measureMemoryUsage();
    await this.measureBundleSize();
    
    // Save results
    const filename = `performance-${this.runtime}-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Results saved to: ${filename}\n`);
    
    return this.results;
  }
}

// CLI Usage
if (process.argv.length > 2) {
  const runtime = process.argv[2];
  if (!['node', 'bun'].includes(runtime)) {
    console.error('Usage: node performance-benchmark.mjs [node|bun]');
    process.exit(1);
  }
  
  const benchmark = new PerformanceBenchmark(runtime);
  benchmark.runAllBenchmarks().catch(console.error);
} else {
  console.log('Usage: node performance-benchmark.mjs [node|bun]');
}

export default PerformanceBenchmark;