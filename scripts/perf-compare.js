#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = 'perf-results';

function loadResults(runtime) {
  if (!existsSync(RESULTS_DIR)) {
    console.error(`Results directory ${RESULTS_DIR} not found`);
    return null;
  }
  
  const files = readdirSync(RESULTS_DIR)
    .filter(f => f.startsWith(runtime) && f.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first
    
  if (files.length === 0) {
    console.error(`No results found for runtime: ${runtime}`);
    return null;
  }
  
  const latestFile = files[0];
  console.log(`📂 Loading ${runtime} results from: ${latestFile}`);
  
  try {
    return JSON.parse(readFileSync(join(RESULTS_DIR, latestFile), 'utf8'));
  } catch (error) {
    console.error(`Error loading ${latestFile}:`, error.message);
    return null;
  }
}

function compareResults(nodeResults, bunResults) {
  console.log('\n🔍 PERFORMANCE COMPARISON\n');
  
  const nodeOps = new Map(nodeResults.results.map(r => [r.operation, r]));
  const bunOps = new Map(bunResults.results.map(r => [r.operation, r]));
  
  // Find common operations
  const commonOps = [...nodeOps.keys()].filter(op => bunOps.has(op));
  
  if (commonOps.length === 0) {
    console.log('❌ No common operations found between Node.js and Bun results');
    return;
  }
  
  const comparisons = [];
  
  console.log('Operation'.padEnd(25) + 'Node.js'.padEnd(12) + 'Bun'.padEnd(12) + 'Improvement'.padEnd(15) + 'Status');
  console.log('─'.repeat(80));
  
  for (const opName of commonOps) {
    const nodeOp = nodeOps.get(opName);
    const bunOp = bunOps.get(opName);
    
    if (!nodeOp.success || !bunOp.success) {
      const status = !nodeOp.success && !bunOp.success ? 'Both Failed' 
                   : !nodeOp.success ? 'Node Failed'
                   : 'Bun Failed';
      console.log(opName.padEnd(25) + 'N/A'.padEnd(12) + 'N/A'.padEnd(12) + 'N/A'.padEnd(15) + status);
      continue;
    }
    
    const nodeTime = nodeOp.duration;
    const bunTime = bunOp.duration;
    const improvement = ((nodeTime - bunTime) / nodeTime * 100);
    const speedup = nodeTime / bunTime;
    
    let status;
    let improvementStr;
    
    if (improvement > 10) {
      status = '🚀 Bun Faster';
      improvementStr = `+${improvement.toFixed(1)}% (${speedup.toFixed(1)}x)`;
    } else if (improvement < -10) {
      status = '🐌 Node Faster';
      improvementStr = `${improvement.toFixed(1)}%`;
    } else {
      status = '⚖️ Similar';
      improvementStr = `${improvement.toFixed(1)}%`;
    }
    
    console.log(
      opName.padEnd(25) + 
      `${nodeTime.toFixed(2)}s`.padEnd(12) + 
      `${bunTime.toFixed(2)}s`.padEnd(12) + 
      improvementStr.padEnd(15) + 
      status
    );
    
    comparisons.push({
      operation: opName,
      nodeTime,
      bunTime,
      improvement,
      speedup,
      status: improvement > 10 ? 'bun_faster' : improvement < -10 ? 'node_faster' : 'similar'
    });
  }
  
  // Summary statistics
  const successful = comparisons.filter(c => c.status !== 'failed');
  const bunFaster = successful.filter(c => c.status === 'bun_faster');
  const nodeFaster = successful.filter(c => c.status === 'node_faster');
  const similar = successful.filter(c => c.status === 'similar');
  
  const totalNodeTime = successful.reduce((sum, c) => sum + c.nodeTime, 0);
  const totalBunTime = successful.reduce((sum, c) => sum + c.bunTime, 0);
  const overallImprovement = ((totalNodeTime - totalBunTime) / totalNodeTime * 100);
  const overallSpeedup = totalNodeTime / totalBunTime;
  
  console.log('\n📊 SUMMARY STATISTICS');
  console.log('─'.repeat(50));
  console.log(`🚀 Bun faster: ${bunFaster.length} operations`);
  console.log(`🐌 Node faster: ${nodeFaster.length} operations`);  
  console.log(`⚖️ Similar performance: ${similar.length} operations`);
  console.log(`\n⏱️ Total time - Node.js: ${totalNodeTime.toFixed(2)}s`);
  console.log(`⏱️ Total time - Bun: ${totalBunTime.toFixed(2)}s`);
  console.log(`📈 Overall improvement: ${overallImprovement.toFixed(1)}% (${overallSpeedup.toFixed(2)}x speedup)`);
  
  if (bunFaster.length > 0) {
    console.log(`\n🏆 BIGGEST IMPROVEMENTS:`);
    bunFaster
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 5)
      .forEach(c => console.log(`   ${c.operation}: ${c.improvement.toFixed(1)}% faster (${c.speedup.toFixed(1)}x)`));
  }
  
  if (nodeFaster.length > 0) {
    console.log(`\n⚠️ AREAS WHERE NODE.JS IS FASTER:`);
    nodeFaster
      .sort((a, b) => a.improvement - b.improvement)
      .slice(0, 3)
      .forEach(c => console.log(`   ${c.operation}: ${Math.abs(c.improvement).toFixed(1)}% slower with Bun`));
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help') {
  console.log(`Usage: node perf-compare.js [node-runtime] [bun-runtime]

Examples:
  node perf-compare.js node bun
  node perf-compare.js (uses latest node and bun results)
`);
  process.exit(0);
}

const nodeRuntime = args[0] || 'node';
const bunRuntime = args[1] || 'bun';

const nodeResults = loadResults(nodeRuntime);
const bunResults = loadResults(bunRuntime);

if (nodeResults && bunResults) {
  compareResults(nodeResults, bunResults);
} else {
  console.log('\n❌ Cannot compare - missing results for one or both runtimes');
  console.log('\nRun measurements first:');
  console.log('  node scripts/perf-measure.js node all');
  console.log('  node scripts/perf-measure.js bun all');
}