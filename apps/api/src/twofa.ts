/**
 * TOTP 2FA module – speakeasy + qrcode
 * Enabled for: ADMIN, PRINCIPAL, FINANCE (school roles) + HQ SUPER_ADMIN
 */
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import { prisma } from "./prisma.js";
import { hashPassword, comparePassword } from "./auth.js";

// Roles that MUST complete 2FA setup
export const ROLES_REQUIRING_2FA = ["ADMIN", "PRINCIPAL", "FINANCE"];
export const HQ_ROLES_REQUIRING_2FA = ["SUPER_ADMIN"];

/** Generate a new TOTP secret + QR code data URL */
export async function generate2FASetup(email: string): Promise<{ secret: string; qrDataUrl: string; otpauthUrl: string }> {
  const result = speakeasy.generateSecret({
    name: `CBC Swift (${email})`,
    issuer: "CBC Swift",
    length: 32,
  });

  const qrDataUrl = await QRCode.toDataURL(result.otpauth_url ?? "");
  return {
    secret: result.base32 ?? "",
    qrDataUrl,
    otpauthUrl: result.otpauth_url ?? "",
  };
}

/** Verify a 6-digit TOTP code against a secret */
export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: token.replace(/\s/g, ""),
    window: 1, // allow 30-second drift
  });
}

/** Generate 10 single-use recovery codes, returns [plain, hashed] pairs */
export async function generateRecoveryCodes(): Promise<Array<{ plain: string; hash: string }>> {
  const codes: Array<{ plain: string; hash: string }> = [];
  for (let i = 0; i < 10; i++) {
    const a = crypto.randomBytes(3).toString("hex").toUpperCase();
    const b = crypto.randomBytes(3).toString("hex").toUpperCase();
    const plain = `${a}-${b}`;
    const hash = await hashPassword(plain);
    codes.push({ plain, hash });
  }
  return codes;
}

/** Persist recovery codes for a user (replaces existing ones) */
export async function saveRecoveryCodes(
  codes: Array<{ plain: string; hash: string }>,
  opts: { userId?: string; platformUserId?: string },
): Promise<string[]> {
  await prisma.twoFactorRecoveryCode.deleteMany({
    where: { userId: opts.userId, platformUserId: opts.platformUserId },
  });
  await prisma.twoFactorRecoveryCode.createMany({
    data: codes.map((c) => ({
      userId: opts.userId ?? null,
      platformUserId: opts.platformUserId ?? null,
      codeHash: c.hash,
    })),
  });
  return codes.map((c) => c.plain);
}

/** Check if a user has 2FA enabled */
export async function is2FAEnabled(opts: { userId?: string; platformUserId?: string }): Promise<boolean> {
  const setup = await prisma.twoFactorSetup.findFirst({
    where: opts.userId ? { userId: opts.userId } : { platformUserId: opts.platformUserId },
  });
  return setup?.isEnabled ?? false;
}

/** Get the 2FA secret for a user (for verification) */
export async function get2FASecret(opts: { userId?: string; platformUserId?: string }): Promise<string | null> {
  const setup = await prisma.twoFactorSetup.findFirst({
    where: opts.userId ? { userId: opts.userId } : { platformUserId: opts.platformUserId },
  });
  return setup?.secret ?? null;
}

/** Verify a recovery code (burns it on success) */

export async function verifyRecoveryCode(
  code: string,
  opts: { userId?: string; platformUserId?: string },
): Promise<boolean> {
  const stored = await prisma.twoFactorRecoveryCode.findMany({
    where: {
      ...(opts.userId ? { userId: opts.userId } : { platformUserId: opts.platformUserId }),
      usedAt: null,
    },
  });
  for (const record of stored) {
    const match = await comparePassword(code.toUpperCase(), record.codeHash);
    if (match) {
      await prisma.twoFactorRecoveryCode.update({
        where: { codeId: record.codeId },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}

/** Issue / verify a trusted-device token (30-day trust) */
export async function issueTrustedDevice(opts: {
  userId?: string;
  platformUserId?: string;
  userAgent?: string;
}): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await prisma.trustedDevice.create({
    data: {
      userId: opts.userId ?? null,
      platformUserId: opts.platformUserId ?? null,
      deviceToken: token,
      userAgent: opts.userAgent ?? null,
      expiresAt,
    },
  });
  return token;
}

export async function isTrustedDevice(
  token: string,
  opts: { userId?: string; platformUserId?: string },
): Promise<boolean> {
  if (!token) return false;
  const device = await prisma.trustedDevice.findFirst({
    where: {
      deviceToken: token,
      ...(opts.userId ? { userId: opts.userId } : { platformUserId: opts.platformUserId }),
      expiresAt: { gt: new Date() },
    },
  });
  return !!device;
}
