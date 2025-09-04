# Performance and Tooling Scripts

Canonical, focused scripts for Bun/Node performance checks and developer tooling.

## Canonical Scripts

- bun-build.mjs: Build all workspaces using Bun-friendly process spawning.
- bun-test.mjs: Run tests across workspaces with Bun.
- performance-benchmark.mjs: Orchestrated runtime and workflow benchmarks.
- perf-quick.js: Fast local checks (startup, lint, typecheck).
- bundle-analysis.js: Report bundle sizes for targets.
- coverage.mjs: Aggregate coverage across packages.
- measure-dev-startup.js: Measure dev server startup time.
- measure-install.js: Measure install times across managers.
- memory-usage-test.js: Basic memory profiling utility.
- perf-compare.js: Compare saved perf results under perf-results/.
- runtime-test.js: Canonical CPU/IO runtime microbenchmarks.
- watch-mode-test.js: Lightweight watch/hot-reload behavior test.

## Notes

- perf-results/: Ignored by Git; use perf-compare.js to inspect saved results.
- Prefer performance-benchmark.mjs for cross-runtime comparisons (replaces older comparison scripts).

## Examples

```bash
# Quick local checks
bun run node scripts/perf-quick.js

# Full benchmark
bun run node scripts/performance-benchmark.mjs

# Compare saved results (if any)
bun run node scripts/perf-compare.js
```
