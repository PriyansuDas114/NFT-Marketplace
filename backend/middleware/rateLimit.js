import rateLimit from 'express-rate-limit';

/**
 * rateLimit.js — per-route rate limiters.
 *
 * The original server had no rate limiting at all. A bot could:
 *   • Spam /api/nfts/mint 10,000 times — filling the DB with garbage
 *   • Enumerate all NFTs with rapid GET requests
 *   • Abuse the Socket.io connection endpoint
 *
 * These limiters are intentionally conservative for a local/dev
 * marketplace. Adjust windowMs + max for production traffic.
 */

/** Standard limiter — 100 requests per minute per IP */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max:      100,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders:   false,
  message: { error: 'Too many requests — please slow down.' },
  skip: (req) => process.env.NODE_ENV === 'test', // disable in tests
});

/**
 * mintLimiter — stricter limit for the mint endpoint.
 * Mint is expensive (IPFS + DB write) and should be user-initiated.
 *
 * 5 mints per wallet per 15 minutes.
 * Key by wallet address if authenticated, otherwise by IP.
 */
export const mintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      5,
  keyGenerator: (req) => req.walletAddress || req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many mint requests. Max 5 per 15 minutes per wallet.' },
  skip: (req) => process.env.NODE_ENV === 'test',
});

/**
 * listLimiter — moderate limit for listing endpoint.
 * 20 listings per 15 minutes per wallet.
 */
export const listLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  keyGenerator: (req) => req.walletAddress || req.ip,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many listing requests. Max 20 per 15 minutes.' },
  skip: (req) => process.env.NODE_ENV === 'test',
});
