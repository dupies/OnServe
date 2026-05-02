import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    open: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      include: ['src/features/**/services/*.ts'],
    },
  },
});
