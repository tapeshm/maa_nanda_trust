import { defineConfig } from 'vite'

// Build Editor.js frontend bundle into public/assets so Workers can serve it
export default defineConfig({
  build: {
    outDir: 'public',
    emptyOutDir: false,
    assetsDir: 'assets',
    sourcemap: true,
    appType: 'custom',
    rollupOptions: {
      input: {
        editor: 'src/frontend/editor.ts',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
    target: 'esnext',
  },
})

