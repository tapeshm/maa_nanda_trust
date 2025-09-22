import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Build browser bundles with a manifest so the worker can resolve hashed assets.
export default defineConfig({
  build: {
    manifest: true,
    outDir: 'dist/client',
    assetsDir: 'assets',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        ui: resolve(__dirname, 'src/frontend/ui.ts'),
        editor: resolve(__dirname, 'src/frontend/editor/index.ts'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    target: 'esnext',
  },
})
