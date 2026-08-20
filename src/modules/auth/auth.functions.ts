import { z } from 'zod';
import { signToken, type AuthUser } from '../../middleware/auth.js';
import { User, hashPassword } from '../../models/User.js';
import type { UserRole } from '../../models/common.js';
import { badRequest, ok, unauthorized, type Result } from '../../lib/http.js';
import { changePasswordInput, loginInput } from '../../validation/schemas.js';

export async function login(body: unknown): Promise<Result<unknown>> {
  const input = loginInput.parse(body);
  const user = await User.findOne({ email: input.email });

  // Same response for unknown user and wrong password — no account enumeration.
  if (!user || !user.active || !(await user.verifyPassword(input.password))) {
    return unauthorized('Email or password is incorrect');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({
    sub: String(user._id),
    role: user.role as UserRole,
    tv: user.tokenVersion,
  });

  return ok({
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

export async function me(authUser: AuthUser): Promise<Result<unknown>> {
  const user = await User.findById(authUser.id);
  if (!user) return unauthorized();
  return ok({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
  });
}

export async function changePassword(authUser: AuthUser, body: unknown): Promise<Result<unknown>> {
  const input = changePasswordInput.parse(body);
  const user = await User.findById(authUser.id);
  if (!user) return unauthorized();

  if (!(await user.verifyPassword(input.currentPassword))) {
    return badRequest('Current password is incorrect');
  }

  user.passwordHash = await hashPassword(input.newPassword);
  // Invalidates every other issued token, including any stolen one.
  user.tokenVersion += 1;
  await user.save();

  const token = signToken({
    sub: String(user._id),
    role: user.role as UserRole,
    tv: user.tokenVersion,
  });

  return ok({ token, message: 'Password updated. Other sessions have been signed out.' });
}

export const authSchemas = { loginInput, changePasswordInput } satisfies Record<string, z.ZodTypeAny>;
