// ============================================================
// ChainPilot AI — Global Error Handler Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Common error factory functions
export const Errors = {
  invalidAddress: (address: string) =>
    new AppError(400, 'INVALID_ADDRESS', `Invalid Ethereum address: ${address}`),

  invalidTxHash: (hash: string) =>
    new AppError(400, 'INVALID_TX_HASH', `Invalid transaction hash: ${hash}`),

  missingField: (field: string) =>
    new AppError(400, 'MISSING_FIELD', `Missing required field: ${field}`),

  notFound: (resource: string) =>
    new AppError(404, 'NOT_FOUND', `${resource} not found`),

  rateLimited: () =>
    new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.'),

  externalApiError: (service: string, message: string) =>
    new AppError(502, 'EXTERNAL_API_ERROR', `${service} API error: ${message}`),

  agentError: (message: string) =>
    new AppError(500, 'AGENT_ERROR', `AI agent error: ${message}`),

  txAlreadyConfirmed: () =>
    new AppError(409, 'TX_ALREADY_CONFIRMED', 'Transaction has already been confirmed.'),

  txExpired: () =>
    new AppError(410, 'TX_EXPIRED', 'Transaction has expired. Please create a new one.'),

  internal: (message?: string) =>
    new AppError(500, 'INTERNAL_ERROR', message || 'An unexpected error occurred.'),
};

// Express error handler middleware
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log full error internally
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    const errorResponse: { error: ApiError } = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    };
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  // Handle unknown errors — don't leak internals
  const errorResponse: { error: ApiError } = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    },
  };
  res.status(500).json(errorResponse);
}
