import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { loadMintStatus } from './lib/mintStatus.js';

function mintStatusDevApi() {
  return {
    name: 'mint-status-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/mint-status') return next();

        try {
          const body = await loadMintStatus();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=15');
          res.end(JSON.stringify(body));
        } catch (error) {
          res.statusCode = error.statusCode || 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ error: error.message || 'Mint status failed' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ETHERSCAN_API_KEY) process.env.ETHERSCAN_API_KEY = env.ETHERSCAN_API_KEY;
  if (env.ETH_RPC_URL) process.env.ETH_RPC_URL = env.ETH_RPC_URL;

  return {
    plugins: [react(), mintStatusDevApi()],
    server: { port: 3000 },
    build: { outDir: 'build' },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    test: {
      environment: 'node',
      globals: true,
    },
  };
});
