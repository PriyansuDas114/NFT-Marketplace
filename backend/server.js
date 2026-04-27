import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import metricRoutes from './routes/metricRoutes.js';
import nftRoutes from './routes/nftRoutes.js';
import { updateAndBroadcastMetrics } from './controllers/metricsController.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/metrics', metricRoutes);
app.use('/api/nfts', nftRoutes);

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  updateAndBroadcastMetrics(io);

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
