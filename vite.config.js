import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'medchem-demo-isolation',
      enforce: 'pre',
      resolveId(id) {
        // This branch ALWAYS uses a local adapter, even with a production .env.
        if (/services\/firebase(?:\.js)?$/.test(id)) {
          return fileURLToPath(new URL('./src/services/demoBackend.js', import.meta.url));
        }
      }
    },
    react()
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'lucide': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
