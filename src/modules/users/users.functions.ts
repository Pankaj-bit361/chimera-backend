import { User, hashPassword } from '../../models/User.js';
import { badRequest, created, noContent, notFound, ok, type Result } from '../../lib/http.js';
import { userInput } from '../../validation/schemas.js';

export async function listUsers(): Promise<Result<unknown>> {
  const users = await User.find().sort({ createdAt: 1 });
  return ok({ items: users.map((user) => user.toJSON()) });
}

export async function createUser(body: unknown): Promise<Result<unknown>> {
  const input = userInput.parse(body);
  if (!input.password) return badRequest('A password is required for a new user');

  const user = await User.create({
    name: input.name,
    email: input.email,
    role: input.role,
    active: input.active ?? true,
    passwordHash: await hashPassword(input.password),
  });
  return created(user.toJSON());
}

export async function updateUser(
  id: string,
  body: unknown,
  actingUserId: string,
): Promise<Result<unknown>> {
  const input = userInput.partial().parse(body);
  const user = await User.findById(id);
  if (!user) return notFound('User not found');

  // Locking yourself out is a support ticket nobody wants at 9pm.
  if (String(user._id) === actingUserId && input.active === false) {
    return badRequest('You cannot deactivate your own account');
  }
  if (String(user._id) === actingUserId && input.role && input.role !== user.role) {
    return badRequest('You cannot change your own role');
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.email !== undefined) user.email = input.email;
  if (input.role !== undefined) user.role = input.role;
  if (input.active !== undefined) {
    user.active = input.active;
    if (!input.active) user.tokenVersion += 1; // kill live sessions immediately
  }
  if (input.password) {
    user.passwordHash = await hashPassword(input.password);
    user.tokenVersion += 1;
  }

  await user.save();
  return ok(user.toJSON());
}

export async function deleteUser(id: string, actingUserId: string): Promise<Result<unknown>> {
  if (id === actingUserId) return badRequest('You cannot delete your own account');
  const user = await User.findByIdAndDelete(id);
  if (!user) return notFound('User not found');
  return noContent();
}
