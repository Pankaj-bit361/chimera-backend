import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import type { UserRole } from '../models/common.js';
import { HttpError } from './error.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export type TokenPayload = {
  sub: string;
  role: UserRole;
  tv: number;
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtTtl } as jwt.SignOptions);
}

function bearer(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Verifies the JWT and re-checks the user on every request.
 *
 * The DB round-trip is deliberate: `tokenVersion` is how a deactivated account
 * or a password change kills live sessions without a session store.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  void (async () => {
    const token = bearer(req.headers.authorization);
    if (!token) throw new HttpError(401, 'unauthorized', 'Authentication required');

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    } catch {
      throw new HttpError(401, 'unauthorized', 'Session expired — sign in again');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw new HttpError(401, 'unauthorized', 'Account is not active');
    if (user.tokenVersion !== payload.tv) {
      throw new HttpError(401, 'unauthorized', 'Session revoked — sign in again');
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
    };
  })().then(() => next(), next);
};

/** Role guard. `owner` passes everything — §7 A3. */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(new HttpError(401, 'unauthorized', 'Authentication required'));
      return;
    }
    if (req.user.role === 'owner' || roles.includes(req.user.role)) {
      next();
      return;
    }
    next(new HttpError(403, 'forbidden', `Requires role: ${roles.join(' or ')}`));
  };
}

/** Content editing: owner + editor. Sales may read but not publish. */
export const requireEditor = requireRole('editor');
/** Lead queue: owner + sales. */
export const requireSales = requireRole('sales');
/** User management and settings. */
export const requireOwner = requireRole();
