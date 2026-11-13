
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false
  }
});
