import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import { env } from "../config/environment.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { User } from "../models/user.model.js";
import type { UserDto } from "../types/api.types.js";
import { ApiError } from "../utils/ApiError.js";

interface SessionClaims {
  sub: string;
  ver: number;
}

/** Compared against when a username does not exist so response timing doesn't reveal which usernames exist. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("brainspace-timing-equalizer", env.auth.bcryptRounds));

export function toUserDto(user: { _id: { toString(): string }; username: string; createdAt: Date }): UserDto {
  return { id: user._id.toString(), username: user.username, createdAt: user.createdAt.toISOString() };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, env.auth.bcryptRounds);
}

export function issueSessionToken(userId: string, tokenVersion: number) {
  const claims: SessionClaims = { sub: userId, ver: tokenVersion };
  return jwt.sign(claims, env.auth.jwtSecret, {
    algorithm: "HS256",
    expiresIn: `${env.auth.sessionTtlDays}d`,
  });
}

/** Returns the user ID for a valid, unexpired and unrevoked session token, otherwise null. */
export async function resolveSession(token: string): Promise<string | null> {
  let claims: unknown;
  try {
    claims = jwt.verify(token, env.auth.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
  const { sub, ver } = (claims ?? {}) as Partial<SessionClaims>;
  if (typeof sub !== "string" || !isValidObjectId(sub) || typeof ver !== "number") return null;
  const user = await User.findById(sub).select("+tokenVersion").lean();
  return user && user.tokenVersion === ver ? sub : null;
}

export async function register(username: string, password: string) {
  if (await User.exists({ username })) throw ApiError.conflict("That username is already taken");
  try {
    const user = await User.create({ username, passwordHash: await hashPassword(password) });
    return { user: toUserDto(user), token: issueSessionToken(user.id, user.tokenVersion) };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw ApiError.conflict("That username is already taken");
    throw err;
  }
}

export async function login(username: string, password: string) {
  const user = await User.findOne({ username }).select("+passwordHash +tokenVersion");
  const valid = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) throw new ApiError(401, ERROR_CODES.invalidCredentials, "Incorrect username or password");
  return { user: toUserDto(user), token: issueSessionToken(user.id, user.tokenVersion) };
}

/** Revokes every session of the user (all devices). */
export async function revokeAllSessions(userId: string) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function getUser(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw ApiError.unauthenticated();
  return toUserDto(user);
}

/** Loads the user with secrets and checks the password; used before sensitive account operations. */
export async function verifyPassword(userId: string, password: string) {
  const user = await User.findById(userId).select("+passwordHash +tokenVersion");
  if (!user) throw ApiError.unauthenticated();
  if (!(await bcrypt.compare(password, user.passwordHash)))
    throw new ApiError(401, ERROR_CODES.invalidCredentials, "Your current password is incorrect");
  return user;
}
