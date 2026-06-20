import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import react from '@vitejs/plugin-react';

// Ripple — Vite config
// Dev server mounts each api/*.js Vercel handler behind its matching URL path,
// so local dev and production share the same source of truth for backend logic.

function vercelToVite(handler) {
  // Shim a Vercel-style (req, res) handler onto Node's raw http req/res so we
  // can reuse api/*.js verbatim from Vite's connect-style middleware.
  return async (req, res) => {
    // Reconstruct the path + query from the base of the mount.
    req.url = req.originalUrl || req.url;

    // Populate req.query (Vercel does this; the connect middleware does not).
    if (!req.query) {
      try {
        const u = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(u.searchParams.entries());
      } catch {
        req.query = {};
      }
    }

    // Buffer body for POST/PUT
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      let buf = '';
      for await (const chunk of req) buf += chunk.toString('utf8');
      const ct = (req.headers['content-type'] || '').toLowerCase();
      try {
        if (ct.includes('application/json')) req.body = buf ? JSON.parse(buf) : {};
        else req.body = buf;
      } catch { req.body = {}; }
    }

    // Minimal Express-style response shim.
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(payload));
    };

    try {
      await handler(req, res);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'handler error', detail: String(e).slice(0, 300) }));
    }
  };
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Push env vars into process.env so the handlers (which read process.env)
  // see the same values Vercel would supply.
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  // Dynamic import so the handlers are resolved once at config-load.
  const [
    chatMod, nudgeMod, historyMod, explainMod, subscribeMod, haeMod, mcpServerMod, analyzeMod,
    discordCurrentMod,
    peerMod,
  ] = await Promise.all([
    import(pathToFileURL(resolve(__dirname, 'api/chat.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/chat/nudge.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/chat/history.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/chat/explain.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/chat/subscribe.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/ingest/hae.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/mcp.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/chat/analyze-vitals.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/discord/current.js')).href),
    import(pathToFileURL(resolve(__dirname, 'api/peer.js')).href),
  ]);

  return {
    root: '.',
    publicDir: 'public',
    server: {
      port: 5173,
      open: '/index.html',
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(env.VITE_VAPID_PUBLIC_KEY || ''),
      'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(env.VITE_MAPBOX_TOKEN || ''),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          // Ripple · multi-page
          ripple:          resolve(__dirname, 'ripple/index.html'),
          rippleTimeline:  resolve(__dirname, 'ripple/timeline.html'),
          ripplePipeline:  resolve(__dirname, 'ripple/pipeline.html'),
          rippleChat:      resolve(__dirname, 'ripple/chat.html'),
          rippleDemo:      resolve(__dirname, 'ripple/demo.html'),

          // Peer dashboard (心涟 conversation viewer)
          peerIndex:       resolve(__dirname, 'peer/index.html'),
          peerChat:        resolve(__dirname, 'peer/chat.html'),
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'ripple-api',
        configureServer(server) {
          // Order matters — sub-paths must register BEFORE /api/chat catch-all
          server.middlewares.use('/api/chat/nudge',     vercelToVite(nudgeMod.default));
          server.middlewares.use('/api/chat/history',   vercelToVite(historyMod.default));
          server.middlewares.use('/api/chat/explain',         vercelToVite(explainMod.default));
          server.middlewares.use('/api/chat/analyze-vitals',  vercelToVite(analyzeMod.default));
          server.middlewares.use('/api/chat/subscribe',       vercelToVite(subscribeMod.default));
          server.middlewares.use('/api/chat',           vercelToVite(chatMod.default));
          server.middlewares.use('/api/ingest/hae',     vercelToVite(haeMod.default));
          server.middlewares.use('/api/mcp',            vercelToVite(mcpServerMod.default));
          server.middlewares.use('/api/discord/current',  vercelToVite(discordCurrentMod.default));
          server.middlewares.use('/api/peer',           vercelToVite(peerMod.default));
        },
      },
    ],
  };
});
