/**
 * Centralised rate-limiting middleware.
 *
 * Strategy
 * ──────────────────────────────────────────────────────────────────────────────
 *  • `globalLimiter`   — sane upper bound applied at the app level (DDoS guard).
 *  • `authLimiter`     — strict cap on /api/auth/* (brute-force protection).
 *  • `paymentLimiter`  — strict cap on payment & booking-create endpoints.
 *  • `searchLimiter`   — moderate cap on flight/hotel search (third-party APIs).
 *  • `webhookLimiter`  — high cap (webhooks are bursty by nature).
 *  • `passwordResetLimiter` — very strict on /forgot-password & /reset endpoints.
 *
 * All limiters share the same JSON 429 response shape so the frontend can show
 * a consistent "Too many requests, try again later." toast.
 *
 * Disabling
 * ──────────────────────────────────────────────────────────────────────────────
 * Set `DISABLE_RATE_LIMIT=1` in env (useful for local load tests).
 */
import rateLimit, { Options } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

const DISABLED = process.env.DISABLE_RATE_LIMIT === '1';

/** Build a standardised 429 handler so all responses look the same. */
const standardHandler: Options['handler'] = (req, res, _next, options) => {
  const retryAfterSeconds = Math.ceil(((options.windowMs ?? 60_000) / 1000));
  res.set('Retry-After', String(retryAfterSeconds));
  res.status(options.statusCode ?? 429).json({
    message: 'Too many requests',
    detail:
      'You have hit the rate limit for this endpoint. ' +
      `Please try again in ${retryAfterSeconds} seconds.`,
    retryAfterSeconds,
  });
};

/**
 * Skip rate-limiting for trusted internal sources:
 *  • Health check
 *  • Cron requests (Vercel/Render cron header)
 *  • When explicitly disabled via env var
 */
const internalSkip = (req: Request) => {
  if (DISABLED) return true;
  if (req.path === '/api/health') return true;
  if (req.headers['x-cron-secret'] === process.env.CRON_SECRET && process.env.CRON_SECRET) return true;
  return false;
};

/** Helper to build a limiter with our shared defaults. */
const buildLimiter = (
  windowMs: number,
  max: number,
  extra: Partial<Options> = {}
) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,    // RateLimit-* headers (RFC 6585)
    legacyHeaders: false,     // disable X-RateLimit-*
    handler: standardHandler,
    skip: internalSkip,
    ...extra,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built limiters
// ─────────────────────────────────────────────────────────────────────────────

/** Hard upper bound at the app level: 600 req / 5 min / IP (~ 2 rps sustained). */
export const globalLimiter = buildLimiter(5 * 60 * 1000, 600);

/** Auth: 20 attempts / 10 min / IP. Login, register, refresh, OAuth callback. */
export const authLimiter = buildLimiter(10 * 60 * 1000, 20, {
  // Slow brute-force: count *failed* auth attempts more aggressively
  skipSuccessfulRequests: true,
});

/** Password reset / OTP: 5 attempts / 15 min / IP. */
export const passwordResetLimiter = buildLimiter(15 * 60 * 1000, 5);

/** Booking & payment: 30 req / 5 min / IP (booking creation, refund, capture). */
export const paymentLimiter = buildLimiter(5 * 60 * 1000, 30);

/** Search: 60 req / min / IP (Amadeus / Booking.com proxies). */
export const searchLimiter = buildLimiter(60 * 1000, 60);

/** Webhooks: 300 req / min / IP. */
export const webhookLimiter = buildLimiter(60 * 1000, 300);

/**
 * Optional: log rate-limit events to console for ops visibility.
 * Mount this BEFORE limiters if you want to capture allowed traffic too,
 * or after to only see denied requests.
 */
export const rateLimitLogger = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      console.warn(
        `[rate-limit] 429 ${req.method} ${req.originalUrl} from ${req.ip} ua="${req.headers['user-agent'] || ''}"`
      );
    }
  });
  next();
};
