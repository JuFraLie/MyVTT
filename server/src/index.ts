import { createServer } from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { registerHandlers } from './handlers';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

const httpServer = createServer(app);

// Server adalah sumber kebenaran; CORS dibatasi ke origin frontend (AGENTS.md §6).
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

registerHandlers(io);

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
