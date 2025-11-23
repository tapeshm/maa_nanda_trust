#!/usr/bin/env node
import { mkdirSync, copyFileSync, existsSync, cpSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function copyLocal(src, dest) {
  const outDir = dirname(dest)
  mkdirSync(outDir, { recursive: true })
  copyFileSync(src, dest)
  console.log(`[assets] copied ${src} -> ${dest}`)
}

// Copy static styles (including modular public pages CSS) into dist so Workers can serve them.
try {
  const stylesSrc = resolve('src/styles')
  const stylesDest = resolve('dist/client/styles')
  cpSync(stylesSrc, stylesDest, { recursive: true })
  console.log(`[assets] copied ${stylesSrc} -> ${stylesDest}`)
} catch (err) {
  console.warn('[assets] copy styles skipped:', err?.message || err)
}
// No-op: UI assets (HTMX, theme toggle, elements) are bundled by Vite.
try {
  const htmxSrc = resolve('node_modules/htmx.org/dist/htmx.min.js')
  if (!existsSync(htmxSrc)) {
    console.warn('[assets] htmx not found in node_modules; skipping (bundled via Vite)')
  }
} catch (err) {
  console.warn('[assets] prepare-assets skipped:', err?.message || err)
}
