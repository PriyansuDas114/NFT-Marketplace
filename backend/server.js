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
import { ethers }     from 'ethers';

import connectDB      from './config/db.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { startEventIndexer, stopEventIndexer } from './workers/eventIndexer.js';

import nftRoutes      from './routes/nftRoutes.js';
import metricRoutes   from './routes/metricRoutes.js';
import userRoutes     from './routes/userRoutes.js';

// ─────────────────────────────────────────────────────────────
//  NexMint API Server
//
//  Stack:
//    • Express.js for HTTP routing
//    • Prisma ORM + PostgreSQL for database
//    • Socket.io for real-time updates
//    • ethers.js for blockchain event listening
//    • Helmet for security headers
//    • CORS whitelist + rate limiting
//
//  Key features:
//    [1] Env validated at boot — server refuses to start on bad config
//    [2] Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
//    [3] CORS whitelist — no more `origin: '*'` in production
//    [4] Global rate limiter on all /api/* routes
//    [5] Socket.io for real-time metrics updates
//    [6] Graceful shutdown — drains connections before exit
//    [7] Event indexer — syncs blockchain events to PostgreSQL
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
});

// ── Event Indexer provider ────────────────────────────────────
// Create provider for listening to blockchain events
let provider = null;
let eventIndexerRunning = false;

const initializeEventIndexer = () => {
  try {
    // Use JSON-RPC provider to listen to events
    // In development, this connects to Hardhat. In production, use Infura/Alchemy
    const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(rpcUrl);
    console.info(`[Event Indexer] RPC provider initialized: ${rpcUrl}`);
  } catch (err) {
    console.warn('[Event Indexer] Failed to initialize provider:', err.message);
  }
};

// ── Start ─────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  console.info('[DB] PostgreSQL connected via Prisma');

  // Initialize blockchain provider and start event indexer
  initializeEventIndexer();
  if (provider) {
    await startEventIndexer(provider);
    eventIndexerRunning = true;
  }

  server.listen(env.PORT, () => {
    console.info(`[Server] NexMint API running on http://localhost:${env.PORT}`);
    console.info(`[Server] Environment: ${env.NODE_ENV}`);
    console.info(`[Server] Allowed origins: ${allowedOrigins.join(', ')}`);
  });
};

// ── Graceful shutdown ─────────────────────────────────────────
// [6] On SIGTERM/SIGINT: close event indexer, HTTP server, then DB
const shutdown = async (signal) => {
  console.info(`\n[Server] ${signal} received. Shutting down gracefully…`);
  
  // Stop event indexer
  if (eventIndexerRunning && provider) {
    await stopEventIndexer(provider);
  }

  server.close(async () => {
    console.info('[Server] HTTP server closed');
    // Prisma connection will auto-close when process exits
    console.info('[DB] Closing Prisma connection');
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
