import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 상대 경로 — 로컬 /admin/ · GitHub Pages /k.veritas/admin/ 모두 동작
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/styles.css': 'http://localhost:3000',
      '/site.js': 'http://localhost:3000',
      '/favicon.svg': 'http://localhost:3000',
      '/table-editor.js': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
