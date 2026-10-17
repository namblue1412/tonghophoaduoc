import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
 const demo = mode === 'demo' || (command === 'serve' && mode === 'development');
 return {
  plugins: [
    {
      name: 'medchem-backend-selection',
      enforce: 'pre',
      resolveId(id) {
        // Development/demo remains isolated. The normal production build uses Firebase.
        if (demo && /services\/firebase(?:\.js)?$/.test(id)) {
          return fileURLToPath(new URL('./src/services/demoBackend.js', import.meta.url));
        }
      },
      transformIndexHtml(html) {
        const connections = demo ? "'self' ws://localhost:* ws://127.0.0.1:*" : "'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://*.firebaseapp.com";
        const images = demo ? "'self' data: blob:" : "'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com";
        return html.replace('__MEDCHEM_CONNECT__', connections).replace('__MEDCHEM_IMAGES__', images);
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
          ...(!demo ? { firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/storage'] } : {}),
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
 };
});
