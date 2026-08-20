import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}`, code: 'not_found' });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code, details: error.details });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: 'Validation failed',
      code: 'validation_failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(422).json({
      error: 'Validation failed',
      code: 'validation_failed',
      details: Object.entries(error.errors).map(([path, err]) => ({ path, message: err.message })),
    });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid ${error.path}`, code: 'bad_request' });
    return;
  }

  if (error instanceof MongoServerError && error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? 'value';
    res.status(409).json({ error: `That ${field} is already in use`, code: 'conflict' });
    return;
  }

  logger.error('unhandled error', error);
  res.status(500).json({
    error: env.isProduction ? 'Something went wrong' : String((error as Error)?.message ?? error),
    code: 'internal_error',
  });
};
