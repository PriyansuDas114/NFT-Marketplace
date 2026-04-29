/**
 * errorHandler.js — global Express error handler.
 *
 * The original server had no error boundary at all. Any unhandled
 * error in a controller would either:
 *   a) Return an Express 500 HTML page (leaking stack traces)
 *   b) Crash the server if the error was in an async route handler
 *
 * This handler:
 *   • Catches errors thrown/passed via next(err) anywhere in the app
 *   • Returns a consistent JSON shape { error, detail, code }
 *   • Strips stack traces in production
 *   • Handles Mongoose validation errors with field-level detail
 *   • Logs to stderr for monitoring
 */

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * notFound — 404 handler. Mount AFTER all routes.
 */
export const notFound = (req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    detail: `${req.method} ${req.path} does not exist on this server.`,
  });
};

/**
 * errorHandler — catch-all error handler. Mount LAST.
 * Must have 4 parameters (err, req, res, next) for Express to recognise it.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Log everything
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    message: err.message,
    code:    err.code,
    name:    err.name,
    ...(isProd() ? {} : { stack: err.stack }),
  });

  // ── Mongoose validation error ──────────────────────────────
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(422).json({ error: 'Validation failed', errors });
  }

  // ── Mongoose duplicate key (e.g. unique tokenId) ───────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error:  'Conflict',
      detail: `Duplicate value for ${field}.`,
    });
  }

  // ── Mongoose cast error (invalid ObjectId etc) ─────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      error:  'Bad Request',
      detail: `Invalid value for field "${err.path}".`,
    });
  }

  // ── JWT / auth errors ──────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Unauthorized', detail: err.message });
  }

  // ── Custom app errors ──────────────────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message, detail: err.detail });
  }

  // ── Fallback: 500 ─────────────────────────────────────────
  const status = err.status || 500;
  res.status(status).json({
    error:  status === 500 ? 'Internal Server Error' : err.message,
    detail: isProd() ? undefined : err.message,
  });
};

/**
 * AppError — custom error class for intentional HTTP errors.
 * Usage: throw new AppError('NFT not found', 404);
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, detail = null) {
    super(message);
    this.statusCode = statusCode;
    this.detail     = detail;
    this.name       = 'AppError';
  }
}
