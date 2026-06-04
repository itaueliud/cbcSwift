import { prisma } from "./prisma.js";
import { env } from "./env.js";

type NotificationRecord = {
  notificationId: string;
  channel: string;
  message: string;
  title: string;
  recipientUserId?: string | null;
  recipientPlatformUserId?: string | null;
  attempts?: number;
};

// ── SendGrid email delivery ──────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!env.sendgridApiKey) {
    console.log(`[EMAIL STUB] → ${to}: ${subject}`);
    return true;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: {
          email: env.sendgridFromEmail,
          name: env.sendgridFromName,
        },
        content: [
          {
            type: "text/html",
            value: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 28px; margin-bottom: 4px; }
    .brand { font-weight: 800; font-size: 20px; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 13px; }
    h2 { color: #0f172a; font-size: 18px; margin: 0 0 12px; }
    p { color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">📚</div>
      <div class="brand">CBC Swift</div>
      <div class="subtitle">by TechSwiftTrix</div>
    </div>
    <h2>${subject}</h2>
    <p>${body.replace(/\n/g, "<br/>")}</p>
    <div class="footer">CBC Swift — Africa's AI School Operating System<br/>© ${new Date().getFullYear()} TechSwiftTrix</div>
  </div>
</body>
</html>
            `.trim(),
          },
          {
            type: "text/plain",
            value: body,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`SendGrid error ${response.status}: ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("SendGrid fetch error:", err);
    return false;
  }
}

// ── Africa's Talking SMS (stub – replace with real SDK) ─────────────────────
async function sendSms(to: string, body: string): Promise<boolean> {
  console.log(`[SMS] → ${to}: ${body}`);
  // TODO: Integrate Africa's Talking SDK
  // import AfricasTalking from 'africastalking';
  // const at = AfricasTalking({ apiKey: env.atApiKey, username: env.atUsername });
  // await at.SMS.send({ to: [to], message: body });
  return true;
}

// ── Firebase push (stub) ─────────────────────────────────────────────────────
async function sendPush(recipientId: string, payload: { title: string; body: string }): Promise<boolean> {
  console.log(`[PUSH] → ${recipientId}: ${payload.title}`);
  // TODO: Integrate Firebase Admin SDK
  return true;
}

// ── Main delivery dispatcher ─────────────────────────────────────────────────
export async function deliverNotification(notification: NotificationRecord): Promise<void> {
  try {
    const n = await prisma.notification.findUnique({
      where: { notificationId: notification.notificationId },
    });
    if (!n) return;

    let delivered = false;

    if (n.channel === "SMS") {
      const user = n.recipientUserId
        ? await prisma.user.findUnique({ where: { userId: n.recipientUserId } })
        : null;
      const to = user?.phone ?? null;
      if (!to) throw new Error("No phone number for SMS recipient");
      delivered = await sendSms(to, n.message);
    } else if (n.channel === "EMAIL") {
      const user = n.recipientUserId
        ? await prisma.user.findUnique({ where: { userId: n.recipientUserId } })
        : null;
      const platformUser = n.recipientPlatformUserId
        ? await prisma.platformUser.findUnique({ where: { platformUserId: n.recipientPlatformUserId } })
        : null;
      const to = user?.email ?? platformUser?.email ?? null;
      if (!to) throw new Error("No email address for recipient");
      delivered = await sendEmail(to, n.title, n.message);
    } else if (n.channel === "PUSH") {
      const recipient = n.recipientUserId ?? n.recipientPlatformUserId ?? null;
      if (!recipient) throw new Error("No push target");
      delivered = await sendPush(recipient, { title: n.title, body: n.message });
    } else {
      // IN_APP — delivered on creation, no external call needed
      return;
    }

    if (!delivered) throw new Error("Provider reported failure");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = (notification.attempts ?? 0) + 1;
    console.warn(`Delivery failed for ${notification.notificationId} (attempt ${attempts}):`, message);

    // Exponential back-off up to 3 retries
    if (attempts < 4) {
      const delay = Math.pow(2, attempts) * 1_000;
      setTimeout(() => {
        void deliverNotification({ ...notification, attempts });
      }, delay);
    }
  }
}

// ── Email verification helper (used by auth flows) ──────────────────────────
export async function sendVerificationEmail(to: string, name: string, token: string, baseUrl: string): Promise<boolean> {
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  const body = `Hello ${name},\n\nThank you for registering on CBC Swift. Please verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, please ignore this email.\n\nBest regards,\nCBC Swift Team`;
  return sendEmail(to, "Verify your CBC Swift account", body);
}

// ── Password reset helper ───────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, name: string, token: string, baseUrl: string): Promise<boolean> {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const body = `Hello ${name},\n\nWe received a request to reset your CBC Swift password. Click the link below:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\nBest regards,\nCBC Swift Team`;
  return sendEmail(to, "Reset your CBC Swift password", body);
}

// ── Fee receipt helper ────────────────────────────────────────────────────────
export async function sendFeeReceiptEmail(
  to: string,
  parent: string,
  student: string,
  amount: number,
  receiptNumber: string,
  mpesaCode: string | null,
): Promise<boolean> {
  const body = `Dear ${parent},\n\nThis confirms receipt of your fee payment for ${student}.\n\nAmount: KES ${amount.toLocaleString()}\nReceipt #: ${receiptNumber}${mpesaCode ? `\nM-Pesa Code: ${mpesaCode}` : ""}\nDate: ${new Date().toLocaleDateString("en-KE")}\n\nThank you for your prompt payment.\n\nWarm regards,\nSchool Finance Office\nCBC Swift Platform`;
  return sendEmail(to, `Fee Receipt ${receiptNumber} – CBC Swift`, body);
}
