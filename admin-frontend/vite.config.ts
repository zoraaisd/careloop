import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router-dom')) return 'react-vendor';
          if (id.includes('node_modules/react-dom')) return 'react-vendor';
          if (id.includes('node_modules/react')) return 'react-vendor';

          if (id.includes('node_modules/@radix-ui/react-dialog')) return 'ui-vendor';
          if (id.includes('node_modules/lucide-react')) return 'ui-vendor';
          if (id.includes('node_modules/react-icons')) return 'ui-vendor';

          if (id.includes('node_modules/recharts')) return 'charts';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5174,
  },
});
