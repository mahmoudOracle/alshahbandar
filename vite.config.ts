import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
        // Allow Vite to choose the HMR socket port dynamically so when the dev
        // server falls back to a different port (e.g., 3002) HMR still connects
        // correctly. Explicit host/port here caused the client to try the
        // wrong websocket port and show connection errors.
        hmr: {
          protocol: 'ws'
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        rollupOptions: {
            output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              // normalize path separators and strip up to node_modules
              const normalized = id.replace(/\\\\/g, '/').split('/node_modules/').pop() || id;
              // extract package name (support scoped packages)
              const parts = normalized.split('/');
              let pkg = parts[0];
              if (pkg && pkg.startsWith('@') && parts.length > 1) pkg = `${pkg}/${parts[1]}`;
              // sanitize for chunk name
              const chunkName = `vendor_${pkg.replace('@', '').replace('/', '_')}`;
              return chunkName;
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
