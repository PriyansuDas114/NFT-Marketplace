// ─── Load environment variables FIRST ─────────────────────────
// This MUST be the first import to ensure dotenv runs before any other code
import './config/loadEnv.js';

// ─── Env validation must run second ────────────────────────────
import './config/env.js';
import { env } from './config/env.js';

import express        from 'express';
import http           from 'http';
import cors           from 'cors';
import helmet         from 'helmet';
import { Server }     from 'socket.io';

import connectDB      from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import nftRoutes      from './routes/nftRoutes.js';
import metricRoutes   from './routes/metricRoutes.js';
import userRoutes     from './routes/userRoutes.js';

// ─────────────────────────────────────────────────────────────
//  NexMint API Server
//
//  Changes from original:
//    [1] Env validated at boot — server refuses to start on bad config
//    [2] Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
//    [3] CORS whitelist — no more `origin: '*'` in production
//    [4] Global rate limiter on all /api/* routes
//    [5] Socket.io stored on app for use in controllers
//    [6] Graceful shutdown — drains connections before exit
//    [7] Removed Prisma — Mongoose only
//    [8] Both Mongoose models (dropped duplicate ORM import)
//    [9] Proper 404 + global error handler middleware
// ─────────────────────────────────────────────────────────────

// ── Express app setup ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());

const io = new Server(server, {
  cors: {
    origin:  allowedOrigins,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// ── Security middleware ───────────────────────────────────────

// [2] Helmet: sets 11 security-related HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      imgSrc:      ["'self'", 'data:', 'https://ipfs.io', 'https://*.ipfs.io'],
      connectSrc:  ["'self'", 'wss:', 'ws:', ...allowedOrigins],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for IPFS images
}));

// [3] CORS: whitelist only known origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));           // 10kb max body — prevents payload attacks
app.use(express.urlencoded({ extended: false }));

// ── Request logging (dev only) ────────────────────────────────
if (env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.info(`[API] ${req.method} ${req.path}`);
    next();
  });
}

// ── Global rate limit on all API routes ──────────────────────
// [4] 100 requests per minute per IP across all endpoints
app.use('/api', apiLimiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    env:       env.NODE_ENV,
  });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/nfts',    nftRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/users',   userRoutes);

// ── 404 handler ───────────────────────────────────────────────
// [9] Must be AFTER all routes
app.use(notFound);

// ── Global error handler ──────────────────────────────────────
// Must be LAST and must have 4 params (err, req, res, next)
app.use(errorHandler);

// ── Socket.io events ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.info(`[Socket] Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.info(`[Socket] Client disconnected: ${socket.id} — ${reason}`);
  });

  // Send current metrics immediately on connect
  import('./models/metricModel.js').then(({ default: Metric }) => {
    Metric.getOrCreate().then(metrics => {
      socket.emit('metricsUpdate', { metrics });
    }).catch(() => {});
  });
});

// ── Start ─────────────────────────────────────────────────────
const start = async () => {
  await connectDB();

  server.listen(env.PORT, () => {
    console.info(`[Server] NexMint API running on http://localhost:${env.PORT}`);
    console.info(`[Server] Environment: ${env.NODE_ENV}`);
    console.info(`[Server] Allowed origins: ${allowedOrigins.join(', ')}`);
  });
};

// ── Graceful shutdown ─────────────────────────────────────────
// [6] On SIGTERM/SIGINT: close HTTP server first (stop accepting new
//     requests), then disconnect from MongoDB.
const shutdown = (signal) => {
  console.info(`\n[Server] ${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    console.info('[Server] HTTP server closed');
    const mongoose = (await import('mongoose')).default;
    await mongoose.connection.close();
    console.info('[DB] MongoDB connection closed');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections — log and exit cleanly
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
  shutdown('unhandledRejection');
});

start();
