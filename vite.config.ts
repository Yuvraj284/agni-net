/// <reference types="vitest" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleFirmsRequest } from './server/firms';

/**
 * Serves GET /api/firms from the dev and preview servers. FIRMS_MAP_KEY is read here, on the
 * server, without the VITE_ prefix, so Vite never inlines it into the client bundle.
 */
function firmsProxy(mapKey: string | undefined): Plugin {
  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== 'GET' || !req.url?.startsWith('/api/firms')) return next();
    const { status, body } = await handleFirmsRequest(new URL(req.url, 'http://localhost'), mapKey);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  };
  return {
    name: 'agninet-firms-proxy',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), firmsProxy(env.FIRMS_MAP_KEY)],
    server: { host: '127.0.0.1', port: 5173 },
    preview: { host: '127.0.0.1', port: 4173 },
    // MapLibre (~1 MB) is lazy-loaded into its own chunk by VectorBasemap; the app chunk stays small.
    build: { chunkSizeWarningLimit: 1100 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    },
  };
});
