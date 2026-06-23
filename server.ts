import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { createRouter } from './server/routes';
import { DB } from './server/db';

const PORT = 3000;

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);
  
  // Create Socket.IO server on the same HTTP instance
  const io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  // Enable JSON request bodies & url-encoded fields
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Register API routes
  app.use('/api', createRouter(io));

  // Initialize DB before starting
  DB.load();

  // Socket.IO active event mapping
  io.on('connection', (socket) => {
    console.log(`Socket connection incoming: [ID: ${socket.id}]`);

    // Synchronize client immediately upon joining with fresh snapshot data
    socket.emit('queue:updated', {
      patients: DB.getPatients(),
      doctors: DB.getDoctors(),
    });

    socket.emit('analytics:updated', DB.getAnalytics());

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: [ID: ${socket.id}]`);
    });
  });

  // Vite development integration or production static distribution
  if (process.env.NODE_ENV !== 'production') {
    console.log('Mounting development Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION. Serving static static-site assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Queue Cure '26 server online and listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrapping failure:', err);
  process.exit(1);
});
