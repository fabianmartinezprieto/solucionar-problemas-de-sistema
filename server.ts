import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createApp, getDb, verifyToken } from './server/app.ts';
import type { UserRole } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

interface SocketMeta {
  ws: WebSocket;
  userId: string | null;
  role: UserRole | null;
}

const clients = new Set<SocketMeta>();

function broadcastRealtime(
  type: string,
  payload: unknown,
  target?: string[] | 'CREATOR'
) {
  const message = JSON.stringify({ type, payload });
  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    if (target === 'CREATOR' && client.role !== 'CREATOR') continue;
    if (
      Array.isArray(target) &&
      client.role !== 'CREATOR' &&
      (!client.userId || !target.includes(client.userId))
    ) {
      continue;
    }
    client.ws.send(message);
  }
}

const app = createApp(broadcastRealtime);
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const reqUrl = new URL(request.url || '/', 'http://localhost');
    if (reqUrl.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch {
    socket.destroy();
  }
});

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url || '/ws', 'http://localhost');
  const token = url.searchParams.get('token') || '';
  const uid = token ? verifyToken(token) : null;
  const db = await getDb();
  const user = uid ? db.users.find((u) => u.id === uid) : undefined;

  const meta: SocketMeta = {
    ws,
    userId: user ? user.id : null,
    role: user ? user.role : null,
  };
  clients.add(meta);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type?: string; token?: string };
      if (msg.type === 'auth' && typeof msg.token === 'string') {
        const verifiedUid = verifyToken(msg.token);
        const latestDb = await getDb();
        const found = verifiedUid ? latestDb.users.find((u) => u.id === verifiedUid) : undefined;
        meta.userId = found ? found.id : null;
        meta.role = found ? found.role : null;
      }
    } catch {
      // Ignore malformed frames
    }
  });

  ws.on('close', () => {
    clients.delete(meta);
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: isHmrDisabled ? false : { server, path: '/vite-hmr' },
        hmr: isHmrDisabled ? false : true,
      },
      appType: 'spa',
    });

    if (isHmrDisabled) {
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          const transformed = await vite.transformRequest('/@vite/client');
          if (!transformed) {
            next();
            return;
          }
          const patchedCode = transformed.code.replace(
            /const transport = normalizeModuleRunnerTransport\(\(\(\) => \{[\s\S]*?\}\)\(\)\);/,
            'const transport = normalizeModuleRunnerTransport({ async connect() {}, async disconnect() {}, send() {} });'
          );
          res.status(200).set({
            'Content-Type': 'text/javascript; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          });
          res.send(patchedCode);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT} (network 0.0.0.0:${PORT})`);
  });
}

startServer();
