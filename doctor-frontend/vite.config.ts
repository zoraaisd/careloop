import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router-dom')) return 'react-vendor'
          if (id.includes('node_modules/react-dom')) return 'react-vendor'
          if (id.includes('node_modules/react')) return 'react-vendor'

          if (id.includes('node_modules/lucide-react')) return 'ui-vendor'

          if (id.includes('node_modules/axios')) return 'data-vendor'
          if (id.includes('node_modules/date-fns')) return 'date-vendor'
          return undefined
        },
      },
    },
  },
  server: {
    port: 5175,
  },
})
