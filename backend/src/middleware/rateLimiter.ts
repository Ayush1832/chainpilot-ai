// ============================================================
// ChainPilot AI — Rate Limiting Middleware
// ============================================================

import rateLimit from 'express-rate-limit';

// General API rate limit — 30 requests/minute
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment and try again.',
    },
  },
});

// Chat rate limit — more restrictive (10 messages/minute)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many messages. Please wait a moment.',
    },
  },
});

// Transaction rate limit — most restrictive (10 per hour)
export const txLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Transaction rate limit reached. Please wait before making more transactions.',
    },
  },
});
