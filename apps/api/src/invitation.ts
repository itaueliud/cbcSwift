/**
 * Invitation-based user registration
 * No public signup. All accounts created by School Admin.
 */
import crypto from "crypto";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { hashPassword } from "./auth.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function sendInviteEmail(to: string, subject: string, body: string) {
  if (!env.sendgridApiKey) {
    console.log(`[INVITE EMAIL STUB] → ${to}: ${subject}`);
    return;
  }
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.sendgridApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], subject }],
      from: { email: env.sendgridFromEmail, name: env.sendgridFromName },
      content: [
        { type: "text/plain", value: body },
        { type: "text/html", value: `<pre style="font-family:sans-serif;font-size:14px;line-height:1.7">${body.replace(/\n/g, "<br>")}</pre>` },
      ],
    }),
  }).catch((e) => console.warn("SendGrid error:", e));
}

export async function createInvitation(opts: {
  tenantId: string;
  email: string;
  fullName: string;
  role: string;
  createdBy: string;
  additionalData?: Record<string, unknown>;
}): Promise<{ invitationId: string; token: string }> {
  // Invalidate old pending invitations for this user
  await prisma.invitation.updateMany({
    where: { tenantId: opts.tenantId, email: opts.email.toLowerCase(), isUsed: false },
    data: { isUsed: true, usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      tenantId: opts.tenantId,
      email: opts.email.toLowerCase(),
      fullName: opts.fullName,
      role: opts.role as never,
      tokenHash,
      expiresAt,
      createdBy: opts.createdBy,
      additionalData: opts.additionalData ? opts.additionalData as never : undefined,
    },
  });

  const tenant = await prisma.tenant.findUnique({ where: { tenantId: opts.tenantId }, select: { schoolName: true } });
  const activationUrl = `${env.webOrigin}/invite/${token}`;
  const roleLabel = opts.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const body = [
    `Hello ${opts.fullName},`,
    "",
    `You have been invited to join ${tenant?.schoolName ?? "CBC Swift"} as ${roleLabel}.`,
    "",
    "Activate your account:",
    activationUrl,
    "",
    "This link expires in 48 hours.",
    "",
    "If you did not expect this, please ignore this email.",
    "",
    `— CBC Swift / ${tenant?.schoolName ?? "School Administration"}`,
  ].join("\n");

  void sendInviteEmail(opts.email, `You're invited to join ${tenant?.schoolName ?? "CBC Swift"}`, body);

  return { invitationId: invitation.invitationId, token };
}

export async function validateInvitationToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const inv = await prisma.invitation.findUnique({
    where: { tokenHash },
    include: { tenant: { select: { schoolName: true, subdomain: true } } },
  });
  if (!inv)             return { valid: false as const, reason: "NOT_FOUND" as const };
  if (inv.isUsed)       return { valid: false as const, reason: "USED" as const };
  if (inv.expiresAt < new Date()) return { valid: false as const, reason: "EXPIRED" as const };
  return {
    valid: true as const,
    invitation: { invitationId: inv.invitationId, email: inv.email, fullName: inv.fullName, role: inv.role, tenantId: inv.tenantId, schoolName: inv.tenant?.schoolName },
  };
}

export async function acceptInvitation(rawToken: string, password: string) {
  const result = await validateInvitationToken(rawToken);
  if (!result.valid) return null;
  const { email, fullName, role, tenantId, invitationId } = result.invitation;

  const existing = await prisma.user.findFirst({ where: { tenantId, email } });
  if (existing) {
    await prisma.invitation.update({ where: { invitationId }, data: { isUsed: true, usedAt: new Date() } });
    return { userId: existing.userId, role: existing.role as string, tenantId, email };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { tenantId, email, fullName, passwordHash, role: role as never, isActive: true },
  });
  await prisma.invitation.update({ where: { invitationId }, data: { isUsed: true, usedAt: new Date() } });
  return { userId: user.userId, role: user.role as string, tenantId, email };
}
