/**
 * The `{ status, json }` contract (§5.1).
 *
 * Function modules never touch `req`/`res`. They take plain arguments and
 * return a Result. Routes stay thin: parse, call, `send(res, result)`.
 */
import type { Response } from 'express';

export type Result<T = unknown> = {
  status: number;
  json: T;
};

export function ok<T>(json: T, status = 200): Result<T> {
  return { status, json };
}

export function created<T>(json: T): Result<T> {
  return { status: 201, json };
}

export function noContent(): Result<null> {
  return { status: 204, json: null };
}

export type ErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

export function fail(status: number, code: string, error: string, details?: unknown): Result<ErrorBody> {
  return { status, json: details === undefined ? { error, code } : { error, code, details } };
}

export const badRequest = (error: string, details?: unknown) => fail(400, 'bad_request', error, details);
export const unauthorized = (error = 'Authentication required') => fail(401, 'unauthorized', error);
export const forbidden = (error = 'Not permitted') => fail(403, 'forbidden', error);
export const notFound = (error = 'Not found') => fail(404, 'not_found', error);
export const conflict = (error: string, details?: unknown) => fail(409, 'conflict', error, details);
export const unprocessable = (error: string, details?: unknown) => fail(422, 'unprocessable', error, details);

export function send(res: Response, result: Result<unknown>): void {
  if (result.status === 204 || result.json === null) {
    res.status(result.status).end();
    return;
  }
  res.status(result.status).json(result.json);
}

/** Wraps an async route handler so rejections reach the error middleware. */
export function route(
  handler: (...args: Parameters<import('express').RequestHandler>) => Promise<void> | void,
): import('express').RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
