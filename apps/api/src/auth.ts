import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "./env.js";

export type TokenPayload = {
  type: "hq" | "school";
  platformUserId?: string;
  userId?: string;
  tenantId?: string;
  role?: string;
  hqRole?: string;
  fullName: string;
  email: string;
  schoolName?: string;
  subdomain?: string;
};

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as TokenPayload & { exp: number; iat: number };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

