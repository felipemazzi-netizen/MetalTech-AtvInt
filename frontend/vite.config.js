import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: process.env.PAGES_BASE_PATH || '/',
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
});
