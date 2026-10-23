/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  // MapLibre (~1 MB) is lazy-loaded into its own chunk by VectorBasemap; the app chunk stays small.
  build: { chunkSizeWarningLimit: 1100 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
