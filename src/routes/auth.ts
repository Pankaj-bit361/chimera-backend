import { Router } from 'express';
import { route, send } from '../lib/http.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { changePassword, login, me } from '../modules/auth/auth.functions.js';

export const authRouter = Router();

authRouter.post('/login', authLimiter, route(async (req, res) => send(res, await login(req.body))));
authRouter.get('/me', authenticate, route(async (req, res) => send(res, await me(req.user!))));
authRouter.post(
  '/change-password',
  authenticate,
  route(async (req, res) => send(res, await changePassword(req.user!, req.body))),
);
