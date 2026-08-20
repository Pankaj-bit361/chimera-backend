import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { USER_ROLES, toJSONTransform } from './common.js';

/**
 * Dashboard operators (§7). `tokenVersion` is bumped on password change or
 * deactivation, which invalidates every issued JWT without a session store.
 */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: 'editor', index: true },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 1 },
    lastLoginAt: Date,
  },
  { timestamps: true, toJSON: toJSONTransform, toObject: toJSONTransform },
);

userSchema.methods.verifyPassword = function verifyPassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, (this as unknown as { passwordHash: string }).passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs> & {
  verifyPassword(plain: string): Promise<boolean>;
};
export const User = model<UserAttrs, import('mongoose').Model<UserAttrs, object, {
  verifyPassword(plain: string): Promise<boolean>;
}>>('User', userSchema);
