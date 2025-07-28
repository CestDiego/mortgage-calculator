import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js'],
          'decimal': ['decimal.js']
        }
      }
    }
  }
})