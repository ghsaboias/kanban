#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function run(cmd, args, cwd = root) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false })
  if (res.status !== 0) {
    process.exit(res.status ?? 1)
  }
}

function summarizeBackend() {
  const file = path.join(root, 'backend', 'coverage', 'coverage-summary.json')
  if (!existsSync(file)) return null
  const json = JSON.parse(readFileSync(file, 'utf8'))
  const t = json.total
  return {
    lines: t.lines.pct,
    branches: t.branches.pct,
    functions: t.functions.pct,
    statements: t.statements.pct,
  }
}

function summarizeFrontend() {
  const file = path.join(root, 'frontend', 'coverage', 'coverage-final.json')
  if (!existsSync(file)) return null
  const json = JSON.parse(readFileSync(file, 'utf8'))
  const entries = Object.entries(json).filter(([k]) => k.includes(`${path.sep}frontend${path.sep}src${path.sep}`))
  let sCovered = 0, sTotal = 0
  let fCovered = 0, fTotal = 0
  let bCovered = 0, bTotal = 0
  const perFile = []
  for (const [filePath, data] of entries) {
    const sHits = Object.values(data.s || {}).map(Number)
    const sFileCovered = sHits.filter(n => n > 0).length
    const sFileTotal = sHits.length
    sCovered += sFileCovered
    sTotal += sFileTotal

    const fHits = Object.values(data.f || {}).map(Number)
    const fFileCovered = fHits.filter(n => n > 0).length
    const fFileTotal = fHits.length
    fCovered += fFileCovered
    fTotal += fFileTotal

    // branches: data.b is an object of arrays
    const bVals = Object.values(data.b || {})
    let bFileCovered = 0, bFileTotal = 0
    for (const arr of bVals) {
      const hits = Array.isArray(arr) ? arr : []
      bFileCovered += hits.filter(n => Number(n) > 0).length
      bFileTotal += hits.length
    }
    bCovered += bFileCovered
    bTotal += bFileTotal

    const pct = sFileTotal ? Math.round((sFileCovered / sFileTotal) * 10000) / 100 : 0
    perFile.push({ file: filePath.replace(root + path.sep, ''), pct, uncoveredHint: '' })
  }
  perFile.sort((a, b) => a.pct - b.pct)
  return {
    statements: sTotal ? Math.round((sCovered / sTotal) * 10000) / 100 : 0,
    functions: fTotal ? Math.round((fCovered / fTotal) * 10000) / 100 : 0,
    branches: bTotal ? Math.round((bCovered / bTotal) * 10000) / 100 : 0,
    bottom: perFile.slice(0, 5),
  }
}

function banner(title) {
  const line = '='.repeat(20)
  console.log(`\n${line} ${title} ${line}`)
}

// Run backend then frontend with banners
banner('BACKEND (Jest)')
run('npm', ['run', 'test:backend:coverage'])

banner('FRONTEND (Vitest)')
run('npm', ['run', 'test:frontend:coverage'])

// Summary
banner('SUMMARY')
const be = summarizeBackend()
const fe = summarizeFrontend()
if (be) {
  console.log(`- Backend: Lines ${be.lines}% | Branches ${be.branches}% | Functions ${be.functions}% | Statements ${be.statements}%`)
}
if (fe) {
  console.log(`- Frontend (src): Statements ${fe.statements}% | Branches ${fe.branches}% | Functions ${fe.functions}%`)
  if (fe.bottom?.length) {
    console.log(`\nLowest coverage (by statements)`) 
    for (const item of fe.bottom) {
      console.log(`- ${item.file}: ${item.pct}%`)
    }
  }
}

