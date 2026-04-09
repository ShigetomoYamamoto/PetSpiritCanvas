import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@imgly/background-removal') || id.includes('onnxruntime')) {
            return 'bg-removal'
          }
          if (id.includes('konva') || id.includes('vue-konva')) {
            return 'canvas-lib'
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) {
            return 'vue-vendor'
          }
        },
      },
    },
  },
})
