import http from "http";
import express, { type Request } from "express";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { signToken, verifyToken, hashPassword, comparePassword } from "./auth.js";
import { createInvitation, validateInvitationToken, acceptInvitation } from "./invitation.js";
import {
  ROLES_REQUIRING_2FA,
  HQ_ROLES_REQUIRING_2FA,
  generate2FASetup,
  verifyTOTP,
  generateRecoveryCodes,
  saveRecoveryCodes,
  is2FAEnabled,
  get2FASecret,
  verifyRecoveryCode,
  issueTrustedDevice,
  isTrustedDevice,
} from "./twofa.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: env.webOrigin, credentials: true },
});

type AuthRequest = Request;
type AuthLike = Partial<ReturnType<typeof verifyToken>> & { type: "hq" | "school" };

type PolicyDefinition = {
  can: string[];
  cannot: string[];
  notifications: { receives: string[]; sends: string[] };
  tone: string;
  theme: { sidebar: string; active: string; hover: string; accent: string };
};

const ROLE_POLICY: Record<string, PolicyDefinition> = {
  ADMIN: {
    can: ["FEES", "ATTENDANCE", "RESULTS", "ASSIGNMENTS", "TIMETABLE", "STUDENTS", "STAFF", "FINANCE", "NOTIFICATIONS", "HELP", "GENERAL"],
    cannot: ["ALTER_GRADES", "VIEW_OTHER_STUDENTS_RECORDS", "ACCESS_FINANCE_RECORDS", "APPROVE_REPORTS", "EDIT_ATTENDANCE", "ACCESS_TEACHER_ANALYTICS"],
    notifications: { receives: ["New assignment uploaded", "Results available", "Timetable updated", "Attendance warning", "Portfolio approved"], sends: ["Assignment submitted", "Question posted", "Portfolio uploaded"] },
    tone: "Operational control",
    theme: { sidebar: "#0F172A", active: "#10B981", hover: "#1E293B", accent: "#D1FAE5" },
  },
  PRINCIPAL: {
    can: ["FEES", "ATTENDANCE", "RESULTS", "ASSIGNMENTS", "TIMETABLE", "STUDENTS", "STAFF", "FINANCE", "NOTIFICATIONS", "HELP", "GENERAL"],
    cannot: ["ALTER_GRADES", "VIEW_OTHER_STUDENTS_RECORDS", "ACCESS_FINANCE_RECORDS", "APPROVE_REPORTS", "EDIT_ATTENDANCE", "ACCESS_TEACHER_ANALYTICS"],
    notifications: { receives: ["New assignment uploaded", "Results available", "Timetable updated", "Attendance warning", "Portfolio approved"], sends: ["Assignment submitted", "Question posted", "Portfolio uploaded"] },
    tone: "Operational oversight",
    theme: { sidebar: "#1E293B", active: "#38BDF8", hover: "#334155", accent: "#BAE6FD" },
  },
  TEACHER: {
    can: ["ATTENDANCE", "RESULTS", "ASSIGNMENTS", "TIMETABLE", "STUDENTS", "HELP", "GENERAL"],
    cannot: ["ALTER_GRADES", "ACCESS_FINANCE_RECORDS", "APPROVE_REPORTS"],
    notifications: { receives: ["New assignment uploaded", "Results available", "Timetable updated", "Attendance warning", "Portfolio approved"], sends: ["Assignment submitted", "Question posted", "Portfolio uploaded"] },
    tone: "Teaching and delivery",
    theme: { sidebar: "#064E3B", active: "#10B981", hover: "#065F46", accent: "#A7F3D0" },
  },
  STUDENT: {
    can: ["RESULTS", "ASSIGNMENTS", "ATTENDANCE", "TIMETABLE", "HELP", "GENERAL"],
    cannot: ["ALTER_GRADES", "VIEW_OTHER_STUDENTS_RECORDS", "ACCESS_FINANCE_RECORDS", "APPROVE_REPORTS", "EDIT_ATTENDANCE", "ACCESS_TEACHER_ANALYTICS"],
    notifications: { receives: ["New assignment uploaded", "Results available", "Timetable updated", "Attendance warning", "Portfolio approved"], sends: ["Assignment submitted", "Question posted", "Portfolio uploaded"] },
    tone: "Growth and progress",
    theme: { sidebar: "#1D4ED8", active: "#38BDF8", hover: "#1E40AF", accent: "#A5F3FC" },
  },
  PARENT: {
    can: ["FEES", "RESULTS", "ATTENDANCE", "NOTIFICATIONS", "HELP", "GENERAL"],
    cannot: ["EDIT_MARKS", "EDIT_ATTENDANCE", "MODIFY_REPORTS", "ACCESS_UNRELATED_STUDENTS", "APPROVE_SCHOOL_WORKFLOWS", "ALTER_FEE_STRUCTURES"],
    notifications: { receives: ["Fee payment received", "Child absent today", "Report published", "Meeting scheduled", "Transport route updated"], sends: ["Meeting request", "Parent comment", "Payment confirmation"] },
    tone: "Trust and visibility",
    theme: { sidebar: "#1E3A8A", active: "#60A5FA", hover: "#1D4ED8", accent: "#DBEAFE" },
  },
  FINANCE: {
    can: ["FEES", "FINANCE", "STUDENTS", "NOTIFICATIONS", "HELP", "GENERAL"],
    cannot: ["EDIT_ACADEMIC_RECORDS", "PUBLISH_REPORTS", "ALTER_ATTENDANCE", "CHANGE_TEACHER_ASSIGNMENTS", "MODIFY_CBC_STRUCTURES"],
    notifications: { receives: ["M-Pesa payment received", "Payroll approval pending", "Outstanding balance threshold exceeded", "Expense awaiting approval"], sends: ["Receipt generated", "Outstanding balance reminder", "Finance report ready"] },
    tone: "Accurate financial control",
    theme: { sidebar: "#0F172A", active: "#10B981", hover: "#1E293B", accent: "#D1FAE5" },
  },
  SUPER_ADMIN: {
    can: ["FEES", "ATTENDANCE", "RESULTS", "ASSIGNMENTS", "TIMETABLE", "STUDENTS", "STAFF", "FINANCE", "NOTIFICATIONS", "HELP", "GENERAL"],
    cannot: [],
    notifications: { receives: ["New assignment uploaded", "Results available", "Timetable updated", "Attendance warning", "Portfolio approved"], sends: ["Assignment submitted", "Question posted", "Portfolio uploaded"] },
    tone: "Platform control",
    theme: { sidebar: "#111827", active: "#F59E0B", hover: "#1F2937", accent: "#FDE68A" },
  },
  SUPPORT: {
    can: ["HELP", "GENERAL"],
    cannot: [],
    notifications: { receives: [], sends: [] },
    tone: "Support operations",
    theme: { sidebar: "#334155", active: "#94A3B8", hover: "#1E293B", accent: "#E2E8F0" },
  },
  SALES: {
    can: ["HELP", "GENERAL"],
    cannot: [],
    notifications: { receives: [], sends: [] },
    tone: "Sales operations",
    theme: { sidebar: "#7C2D12", active: "#FB923C", hover: "#9A3412", accent: "#FED7AA" },
  },
  BILLING: {
    can: ["FINANCE", "HELP", "GENERAL"],
    cannot: [],
    notifications: { receives: [], sends: [] },
    tone: "Billing operations",
    theme: { sidebar: "#0F172A", active: "#22C55E", hover: "#1E293B", accent: "#DCFCE7" },
  },
};

function toPublicUser<T extends Record<string, unknown>>(user: T) {
  const { passwordHash: _passwordHash, ...publicUser } = user as T & { passwordHash?: unknown };
  return publicUser;
}

// Helper: convert numeric day-of-week (1-7) to human label
function dayLabel(day: number) {
  const map: Record<number, string> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };
  return map[day] ?? `Day ${day}`;
}

// Helper: map a numeric score to a CBC grade.
// Conservative defaults: EE >= 80, ME >= 65, AE >= 50, else BE.
function cbcGradeFromScore(score: number | null | undefined) {
  if (score == null) return null;
  if (score >= 80) return "EE" as const;
  if (score >= 65) return "ME" as const;
  if (score >= 50) return "AE" as const;
  return "BE" as const;
}

async function requireAuth(req: AuthRequest, res: express.Response, allowedRoles?: string[]): Promise<AuthLike | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  try {
    const payload = verifyToken(token);
    const auth: AuthLike = payload.type === "hq"
      ? {
          type: "hq",
          platformUserId: payload.platformUserId,
          userId: undefined,
          tenantId: undefined,
          role: payload.hqRole ?? "SUPER_ADMIN",
          hqRole: payload.hqRole,
          fullName: payload.fullName,
          email: payload.email,
        }
      : {
          type: "school",
          platformUserId: undefined,
          userId: payload.userId,
          tenantId: payload.tenantId,
          role: payload.role ?? "ADMIN",
          hqRole: payload.hqRole,
          fullName: payload.fullName,
          email: payload.email,
          schoolName: payload.schoolName,
          subdomain: payload.subdomain,
        };

    const effectiveRole = auth.role ?? auth.hqRole ?? null;
    if (allowedRoles?.length && (!effectiveRole || !allowedRoles.includes(effectiveRole))) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }

    return auth;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}


function resolveActor(auth: AuthLike) {
  if ("platformUserId" in auth && auth.platformUserId) {
    return {
      kind: "hq" as const,
      platformUserId: auth.platformUserId,
      userId: null,
      tenantId: null,
      role: auth.hqRole ?? "SUPER_ADMIN",
    };
  }
  return {
    kind: "school" as const,
    platformUserId: null,
    userId: auth.userId ?? null,
    tenantId: auth.tenantId ?? null,
    role: auth.role ?? "ADMIN",
  };
}

async function logAudit(params: {
  auth: AuthLike;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
}) {
  const actor = resolveActor(params.auth);
  await prisma.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.userId,
      platformUserId: actor.platformUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      oldValues: params.oldValues as never,
      newValues: params.newValues as never,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

async function createNotification(params: {
  tenantId?: string | null;
  recipientUserId?: string | null;
  recipientPlatformUserId?: string | null;
  type: string;
  title: string;
  message: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  channel?: "IN_APP" | "SMS" | "EMAIL" | "PUSH" | "WHATSAPP";
  relatedType?: string | null;
  relatedId?: string | null;
}) {
  const created = await prisma.notification.create({
    data: {
      tenantId: params.tenantId ?? null,
      recipientUserId: params.recipientUserId ?? null,
      recipientPlatformUserId: params.recipientPlatformUserId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority ?? "MEDIUM",
      channel: params.channel ?? "IN_APP",
      relatedType: params.relatedType ?? null,
      relatedId: params.relatedId ?? null,
    },
  });

  // emit realtime event for frontends
  try {
    io.emit("notification:new", { notification: created });
  } catch (e) {
    // non-fatal
    console.warn("Socket emit failed", e);
  }

  return created;
}

async function notifyUser(params: {
  tenantId?: string | null;
  userId?: string | null;
  platformUserId?: string | null;
  type: string;
  title: string;
  message: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  channel?: "IN_APP" | "SMS" | "EMAIL" | "PUSH" | "WHATSAPP";
  relatedType?: string | null;
  relatedId?: string | null;
}) {
  if (!params.userId && !params.platformUserId) return null;
  const created = await createNotification({
    tenantId: params.tenantId ?? null,
    recipientUserId: params.userId ?? null,
    recipientPlatformUserId: params.platformUserId ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    priority: params.priority,
    channel: params.channel,
    relatedType: params.relatedType,
    relatedId: params.relatedId,
  });
  // dispatch delivery asynchronously (non-blocking)
  try {
    // dynamic import to avoid circular deps during startup
    const delivery = await import("./delivery.js");
    void delivery.deliverNotification({
      notificationId: created.notificationId,
      channel: created.channel,
      message: created.message,
      title: created.title,
      recipientUserId: created.recipientUserId ?? undefined,
      recipientPlatformUserId: created.recipientPlatformUserId ?? undefined,
    });
  } catch (e) {
    console.warn("Failed to dispatch delivery", e);
  }
  return created;
}

async function notifyLinkedParents(tenantId: string, studentId: string, payload: { title: string; message: string; type: string; priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; channel?: "IN_APP" | "SMS" | "EMAIL" | "PUSH" | "WHATSAPP"; relatedType?: string; relatedId?: string }) {
  const links = await prisma.parentStudentLink.findMany({
    where: { tenantId, studentId },
    include: { parent: { include: { user: true } } },
  });
  await Promise.all(
    links
      .filter((link) => Boolean(link.parent.userId))
      .map((link) =>
        notifyUser({
          tenantId,
          userId: link.parent.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: payload.priority,
          channel: payload.channel,
          relatedType: payload.relatedType,
          relatedId: payload.relatedId,
        }),
      ),
  );
}

async function notifyClassUsers(
  tenantId: string,
  classId: string,
  payload: {
    title: string;
    message: string;
    type: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    channel?: "IN_APP" | "SMS" | "EMAIL" | "PUSH" | "WHATSAPP";
    relatedType?: string;
    relatedId?: string;
    includeParents?: boolean;
  },
) {
  const students = await prisma.student.findMany({
    where: { tenantId, classId, isActive: true },
    select: { userId: true, studentId: true },
  });
  await Promise.all(
    students.map(async (student) => {
      if (student.userId) {
        await notifyUser({
          tenantId,
          userId: student.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: payload.priority,
          channel: payload.channel,
          relatedType: payload.relatedType,
          relatedId: payload.relatedId,
        });
      }
      if (payload.includeParents) {
        await notifyLinkedParents(tenantId, student.studentId, payload);
      }
    }),
  );
}

async function notifySchoolStaff(
  tenantId: string,
  roles: Array<"ADMIN" | "PRINCIPAL" | "FINANCE" | "TEACHER">,
  payload: {
    title: string;
    message: string;
    type: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    channel?: "IN_APP" | "SMS" | "EMAIL" | "PUSH" | "WHATSAPP";
    relatedType?: string;
    relatedId?: string;
  },
) {
  const users = await prisma.user.findMany({
    where: { tenantId, role: { in: roles } },
    select: { userId: true },
  });
  await Promise.all(
    users.map((user) =>
      notifyUser({
        tenantId,
        userId: user.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        priority: payload.priority,
        channel: payload.channel,
        relatedType: payload.relatedType,
        relatedId: payload.relatedId,
      }),
    ),
  );
}

async function recordSystemEvent(tenantId: string | null | undefined, eventType: string, payload: unknown) {
  return prisma.systemEvent.create({
    data: {
      tenantId: tenantId ?? null,
      eventType,
      payload: payload as never,
    },
  });
}

function getPolicyForRole(role?: string | null): PolicyDefinition | null {
  if (!role) return null;
  return ROLE_POLICY[role] ?? null;
}

app.get("/health", (_, res) => {
  res.json({ status: "ok", app: "CBCNexus API" });
});

app.post("/auth/hq/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const input = schema.parse(req.body);
  const user = await prisma.platformUser.findUnique({ where: { email: input.email } });
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken({
    type: "hq",
    platformUserId: user.platformUserId,
    hqRole: user.hqRole,
    fullName: user.fullName,
    email: user.email,
  });
  await prisma.platformUser.update({
    where: { platformUserId: user.platformUserId },
    data: { lastLoginAt: new Date() },
  });
  return res.json({ token, user: toPublicUser(user), type: "hq" });
});

// GET /auth/school/lookup?code=greenvalley
// Public endpoint — verifies a school code exists and returns safe info
app.get("/auth/school/lookup", async (req, res) => {
  const code = String(req.query.code ?? "").toLowerCase().trim();
  if (!code) return res.status(400).json({ error: "School code is required" });

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: code },
    select: {
      tenantId: true,
      schoolName: true,
      subdomain: true,
      county: true,
      schoolType: true,
    },
  });

  if (!tenant) {
    return res.status(404).json({ error: "No school found with that code. Check with your administrator." });
  }

  // Only return safe public fields — never return IDs or sensitive data
  return res.json({
    schoolName: tenant.schoolName,
    subdomain:  tenant.subdomain,
    county:     tenant.county,
    schoolType: tenant.schoolType,
  });
});

app.post("/auth/school/login", async (req, res) => {
  const schema = z.object({
    subdomain: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(1),
    trustedDeviceToken: z.string().optional(),
  });
  const input = schema.parse(req.body);
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: input.subdomain.toLowerCase() } });
  if (!tenant) {
    return res.status(404).json({ error: "School not found" });
  }

  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.tenantId, email: input.email } },
    include: { student: true, staff: true, parent: true },
  });
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // ── 2FA Check ────────────────────────────────────────────────────────────
  const requires2FA = ROLES_REQUIRING_2FA.includes(user.role);
  if (requires2FA) {
    const twoFAEnabled = await is2FAEnabled({ userId: user.userId });
    if (twoFAEnabled) {
      const trusted = input.trustedDeviceToken
        ? await isTrustedDevice(input.trustedDeviceToken, { userId: user.userId })
        : false;
      if (!trusted) {
        const tempToken = signToken({
          type: "school", userId: user.userId, tenantId: tenant.tenantId,
          role: "PENDING_2FA", fullName: user.fullName ?? "", email: user.email,
          schoolName: tenant.schoolName, subdomain: tenant.subdomain,
        });
        return res.json({ requires2FA: true, temporaryToken: tempToken, user: toPublicUser(user), tenant });
      }
    } else {
      const tempToken = signToken({
        type: "school", userId: user.userId, tenantId: tenant.tenantId,
        role: "PENDING_2FA_SETUP", fullName: user.fullName ?? "", email: user.email,
        schoolName: tenant.schoolName, subdomain: tenant.subdomain,
      });
      return res.json({ requires2FASetup: true, temporaryToken: tempToken, user: toPublicUser(user), tenant });
    }
  }

  const token = signToken({
    type: "school",
    userId: user.userId,
    tenantId: tenant.tenantId,
    role: user.role,
    fullName: user.fullName ?? "",
    email: user.email,
    schoolName: tenant.schoolName,
    subdomain: tenant.subdomain,
  });

  await prisma.user.update({
    where: { userId: user.userId },
    data: { lastLoginAt: new Date() },
  });

  return res.json({ token, user: toPublicUser(user), tenant, type: "school" });
});

app.get("/auth/me", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;

  if (auth.type === "school" && auth.userId) {
    const userDb = await prisma.user.findUnique({
      where: { userId: auth.userId },
      include: {
        staff: { select: { staffId: true } },
        student: { select: { studentId: true, classId: true } },
      },
    });
    return res.json({
      ...auth,
      staffId: userDb?.staff?.staffId,
      studentId: userDb?.student?.studentId,
      classId: userDb?.student?.classId,
    });
  }

  return res.json(auth);
});

app.get("/auth/matrix", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const role = auth.role ?? auth.hqRole ?? "ADMIN";
  const policy = getPolicyForRole(role);
  if (!policy) {
    return res.status(404).json({ error: "Policy not found" });
  }
  return res.json({
    role,
    policy,
    matrix: {
      actions: policy.can,
      restrictions: policy.cannot,
      notifications: policy.notifications,
      tone: policy.tone,
      theme: policy.theme,
    },
  });
});

app.get("/notifications", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const unreadOnly = String(req.query.unreadOnly ?? "false") === "true";
  const actor = resolveActor(auth);
  const where = actor.kind === "hq"
    ? {
        recipientPlatformUserId: actor.platformUserId ?? undefined,
        ...(unreadOnly ? { isRead: false } : {}),
      }
    : {
        tenantId: actor.tenantId ?? undefined,
        recipientUserId: actor.userId ?? undefined,
        ...(unreadOnly ? { isRead: false } : {}),
      };
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 100,
  });
  return res.json(notifications);
});

app.get("/notification-templates", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "ADMIN", "PRINCIPAL", "FINANCE"]);
  if (!auth) return;
  const templates = await prisma.notificationTemplate.findMany({ orderBy: { templateKey: "asc" } });
  return res.json(templates);
});

app.post("/notifications/:notificationId/read", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const actor = resolveActor(auth);
  const notification = await prisma.notification.findUnique({
    where: { notificationId: req.params.notificationId },
  });
  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }
  const allowed =
    (actor.kind === "hq" && notification.recipientPlatformUserId === actor.platformUserId) ||
    (actor.kind === "school" &&
      notification.recipientUserId === actor.userId &&
      notification.tenantId === actor.tenantId);
  if (!allowed) {
    return res.status(403).json({ error: "Not allowed" });
  }
  const updated = await prisma.notification.update({
    where: { notificationId: notification.notificationId },
    data: { isRead: true, readAt: new Date() },
  });
  return res.json(updated);
});

app.post("/notifications/read-all", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const actor = resolveActor(auth);
  const where =
    actor.kind === "hq"
      ? { recipientPlatformUserId: actor.platformUserId ?? undefined, isRead: false }
      : { tenantId: actor.tenantId ?? undefined, recipientUserId: actor.userId ?? undefined, isRead: false };
  const updated = await prisma.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  });
  return res.json(updated);
});

app.get("/audit-logs", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "ADMIN", "PRINCIPAL"]);
  if (!auth) return;
  const tenantId = auth.tenantId ?? String(req.query.tenantId ?? "");
  const logs = await prisma.auditLog.findMany({
    where: auth.platformUserId
      ? {
          ...(tenantId ? { tenantId } : {}),
        }
      : {
          tenantId: tenantId || auth.tenantId || undefined,
        },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return res.json(logs);
});

app.get("/hq/stats", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "SUPPORT", "SALES", "BILLING"]);
  if (!auth) return;
  const [totalSchools, totalStudents, totalStaff, plans] = await Promise.all([
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.student.count({ where: { isActive: true } }),
    prisma.staff.count({ where: { isActive: true } }),
    prisma.subscriptionPlan.findMany({
      include: { tenants: { where: { isActive: true }, select: { tenantId: true } } },
    }),
  ]);

  const monthlyRevenue = plans.reduce((sum, plan) => {
    const multiplier = plan.billingCycle === "TERMLY" ? 1 / 3 : plan.billingCycle === "ANNUAL" ? 1 / 12 : 1;
    return sum + plan.priceKes * multiplier * plan.tenants.length;
  }, 0);

  return res.json({
    total_schools: totalSchools,
    total_students: totalStudents,
    total_staff: totalStaff,
    monthly_revenue: Number(monthlyRevenue.toFixed(2)),
    plans: plans.map((plan) => ({
      plan_name: plan.planName,
      price_kes: plan.priceKes,
      billing_cycle: plan.billingCycle,
      school_count: plan.tenants.length,
    })),
  });
});

app.get("/school/overview", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const tenantId = auth.tenantId;
  const [tenant, totalStudents, totalStaff, totalClasses, totalParents, feePayments] = await Promise.all([
    prisma.tenant.findUnique({ where: { tenantId } }),
    prisma.student.count({ where: { tenantId, isActive: true } }),
    prisma.staff.count({ where: { tenantId, isActive: true } }),
    prisma.class.count({ where: { tenantId } }),
    prisma.parent.count({ where: { tenantId } }),
    prisma.feePayment.aggregate({ where: { tenantId }, _sum: { amountPaid: true } }),
  ]);

  return res.json({
    tenant,
    total_students: totalStudents,
    total_staff: totalStaff,
    total_classes: totalClasses,
    total_parents: totalParents,
    fee_collected: feePayments._sum.amountPaid ?? 0,
  });
});

app.get("/school/features", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const features = await prisma.tenantFeatureAssignment.findMany({
    where: { tenantId: auth.tenantId, isEnabled: true },
    include: {
      feature: true,
      dashboard: true,
    },
    orderBy: [{ assignedAt: "desc" }],
  });
  return res.json(
    features.map((feature) => ({
      ...feature,
      feature_key: feature.feature.featureKey,
      feature_name: feature.feature.featureName,
      dashboard_key: feature.dashboard.dashboardKey,
      dashboard_name: feature.dashboard.dashboardName,
    })),
  );
});

app.get("/school/academic-years", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const years = await prisma.academicYear.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { startDate: "desc" },
    include: { terms: true },
  });
  return res.json(years);
});

app.get("/school/tiers", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const tiers = await prisma.educationTier.findMany({
    where: { tenantId: auth.tenantId, isActive: true },
    orderBy: { tierName: "asc" },
  });
  return res.json(tiers);
});

app.get("/school/classes", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER"]);
  if (!auth || !auth.tenantId) return;
  const classes = await prisma.class.findMany({
    where: { tenantId: auth.tenantId },
    include: {
      tier: true,
      year: true,
      students: { where: { isActive: true }, select: { studentId: true } },
    },
    orderBy: [{ grade: "asc" }, { stream: "asc" }],
  });
  return res.json(
    classes.map((schoolClass) => ({
      ...schoolClass,
      student_count: schoolClass.students.length,
    })),
  );
});

app.post("/school/classes", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const schema = z.object({
    tierId: z.string().min(1),
    yearId: z.string().min(1),
    grade: z.string().min(1),
    stream: z.string().optional(),
    className: z.string().min(1),
    capacity: z.number().int().positive().optional(),
  });
  const input = schema.parse(req.body);
  const created = await prisma.class.create({
    data: {
      tenantId: auth.tenantId,
      tierId: input.tierId,
      yearId: input.yearId,
      grade: input.grade,
      stream: input.stream,
      className: input.className,
      capacity: input.capacity ?? 40,
    },
  });
  await logAudit({
    auth,
    action: "class.created",
    entityType: "class",
    entityId: created.classId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(created);
});

app.get("/school/staff", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const staff = await prisma.staff.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { fullName: "asc" },
    include: { user: true },
  });
  return res.json(staff);
});

app.post("/school/staff", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const schema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().optional().default("Staff@2025!"),
    tscNumber: z.string().optional(),
    nationalId: z.string().min(1),
    staffType: z.enum(["TEACHING", "NON_TEACHING", "SUPPORT"]),
    specialization: z.string().optional(),
    employmentType: z.enum(["PERMANENT", "CONTRACT", "INTERN"]),
    joinedDate: z.string().min(1),
  });
  const input = schema.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const created = await prisma.staff.create({
    data: {
      tenant: { connect: { tenantId: auth.tenantId } },
      fullName: input.fullName,
      nationalId: input.nationalId,
      staffType: input.staffType,
      specialization: input.specialization,
      employmentType: input.employmentType,
      joinedDate: new Date(input.joinedDate),
      phone: input.phone,
      email: input.email,
      tscNumber: input.tscNumber,
      user: {
        create: {
          tenant: { connect: { tenantId: auth.tenantId } },
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: "TEACHER",
          fullName: input.fullName,
        },
      },
    },
    include: { user: true },
  });
  await logAudit({
    auth,
    action: "staff.created",
    entityType: "staff",
    entityId: created.staffId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(created);
});

app.get("/school/students", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const students = await prisma.student.findMany({
    where: { tenantId: auth.tenantId, isActive: true },
    include: { class: true, tier: true, user: true },
    orderBy: { fullName: "asc" },
  });
  return res.json(students);
});

app.post("/school/students", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const schema = z.object({
    fullName: z.string().min(1),
    email: z.string().email().optional(),
    password: z.string().optional().default("Student@2025!"),
    nemisNumber: z.string().min(1),
    dateOfBirth: z.string().min(1),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    classId: z.string().min(1),
    admissionNumber: z.string().min(1),
    admittedDate: z.string().min(1).optional(),
    currentGrade: z.string().min(1),
    tierId: z.string().min(1),
  });
  const input = schema.parse(req.body);
  const email = input.email ?? `${input.admissionNumber.toLowerCase()}@student.local`;
  const passwordHash = await hashPassword(input.password);
  const created = await prisma.student.create({
    data: {
      tenant: { connect: { tenantId: auth.tenantId } },
      nemisNumber: input.nemisNumber,
      fullName: input.fullName,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      admissionNumber: input.admissionNumber,
      admittedDate: new Date(input.admittedDate ?? new Date().toISOString()),
      currentGrade: input.currentGrade,
      class: { connect: { classId: input.classId } },
      tier: { connect: { tierId: input.tierId } },
      user: {
        create: {
          tenant: { connect: { tenantId: auth.tenantId } },
          email,
          passwordHash,
          role: "STUDENT",
          fullName: input.fullName,
        },
      },
    },
    include: { user: true },
  });
  await logAudit({
    auth,
    action: "student.created",
    entityType: "student",
    entityId: created.studentId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(created);
});

app.get("/principal/analytics", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PRINCIPAL", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const [avgMarks, cbcDistribution, topStudents, teacherPerformance] = await Promise.all([
    prisma.mark.groupBy({
      by: ["subjectId"],
      where: { tenantId: auth.tenantId, isPublished: true },
      _avg: { rawScore: true },
      _count: { markId: true },
    }),
    prisma.mark.groupBy({
      by: ["cbcGrade"],
      where: { tenantId: auth.tenantId },
      _count: { markId: true },
    }),
    prisma.student.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      include: { marks: { where: { isPublished: true }, select: { rawScore: true } } },
      take: 10,
    }),
    prisma.staff.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      include: { user: { select: { userId: true } } },
    }),
  ]);

  return res.json({
    avg_marks: avgMarks,
    cbc_distribution: cbcDistribution,
    top_students: topStudents.map((student) => ({
      full_name: student.fullName,
      current_grade: student.currentGrade,
      admission_number: student.admissionNumber,
      avg_score:
        student.marks.length > 0
          ? Number((student.marks.reduce((sum, mark) => sum + (mark.rawScore ?? 0), 0) / student.marks.length).toFixed(1))
          : 0,
      subjects: student.marks.length,
    })),
    teacher_performance: teacherPerformance.map((staff) => ({
      full_name: staff.fullName,
      marks_entered: 0,
      students_assessed: 0,
    })),
  });
});

app.get("/teacher/my-classes", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const staff = await prisma.staff.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
  });
  if (!staff) return res.json([]);
  const assignments = await prisma.classTeacherAssignment.findMany({
    where: { tenantId: auth.tenantId, staffId: staff.staffId, isActive: true },
    include: { class: true, year: true, subject: true },
  });
  return res.json(assignments);
});

app.get("/teacher/my-subjects", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const staff = await prisma.staff.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
  });
  if (!staff) return res.json([]);
  const assignments = await prisma.classTeacherAssignment.findMany({
    where: { tenantId: auth.tenantId, staffId: staff.staffId, isActive: true, subjectId: { not: null } },
    include: { class: true, subject: true },
  });
  return res.json(assignments);
});

app.get("/student/portfolio", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["STUDENT"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const student = await prisma.student.findFirst({ where: { tenantId: auth.tenantId, userId: auth.userId } });
  if (!student) return res.json([]);
  const portfolios = await prisma.studentPortfolio.findMany({
    where: { tenantId: auth.tenantId, studentId: student.studentId },
    include: { subject: true, term: true },
    orderBy: { uploadedAt: "desc" },
  });
  return res.json(portfolios);
});

app.get("/teacher/dashboard-stats", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const teacher = await prisma.staff.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
  });
  if (!teacher) return res.status(404).json({ error: "Staff not found" });

  const [myClasses, myStudents] = await Promise.all([
    prisma.classTeacherAssignment.count({ where: { tenantId: auth.tenantId, staffId: teacher.staffId, isActive: true } }),
    prisma.classTeacherAssignment.findMany({
      where: { tenantId: auth.tenantId, staffId: teacher.staffId, isActive: true },
      select: { classId: true },
    }).then((assignments) =>
      prisma.student.count({
        where: {
          tenantId: auth.tenantId,
          isActive: true,
          classId: { in: assignments.map((assignment) => assignment.classId) },
        },
      }),
    ),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const attendanceToday = await prisma.attendance.count({
    where: {
      tenantId: auth.tenantId,
      attendanceDate: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`),
      },
    },
  });

  const recentMarks = await prisma.mark.findMany({
    where: { tenantId: auth.tenantId, enteredBy: auth.userId },
    include: { student: { select: { fullName: true, admissionNumber: true } }, subject: { select: { subjectName: true } } },
    orderBy: { enteredAt: "desc" },
    take: 8,
  });

  return res.json({
    my_classes: myClasses,
    my_students: myStudents,
    pending_assignments: await prisma.assignment.count({ where: { tenantId: auth.tenantId, createdBy: auth.userId } }),
    attendance_today: attendanceToday,
    recent_marks: recentMarks.map((mark) => ({
      mark_id: mark.markId,
      student_name: mark.student.fullName,
      admission_number: mark.student.admissionNumber,
      subject_name: mark.subject.subjectName,
      raw_score: mark.rawScore,
      cbc_grade: mark.cbcGrade,
      assessment_type: mark.assessmentType,
      entered_at: mark.enteredAt,
    })),
    staff: teacher,
  });
});

app.get("/student/dashboard", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["STUDENT"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const student = await prisma.student.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
    include: { class: true, tier: true },
  });
  if (!student) return res.status(404).json({ error: "Student not found" });

  const feesPaid = await prisma.feePayment.aggregate({
    where: { tenantId: auth.tenantId, studentId: student.studentId },
    _sum: { amountPaid: true },
  });
  const marks = await prisma.mark.findMany({
    where: { tenantId: auth.tenantId, studentId: student.studentId, isPublished: true },
    include: { subject: { select: { subjectName: true, subjectCode: true } } },
    orderBy: { enteredAt: "desc" },
  });
  const attendance = await prisma.attendance.groupBy({
    by: ["status"],
    where: { tenantId: auth.tenantId, studentId: student.studentId },
    _count: { attendanceId: true },
  });
  const attendancePresent = attendance.find((row) => row.status === "PRESENT")?._count.attendanceId ?? 0;
  const attendanceAbsent = attendance.find((row) => row.status === "ABSENT")?._count.attendanceId ?? 0;
  const attendanceTotal = attendance.reduce((sum, row) => sum + row._count.attendanceId, 0);
  const assignments = await prisma.assignment.findMany({
    where: { tenantId: auth.tenantId, classId: student.classId },
    include: { subject: { select: { subjectName: true } } },
    orderBy: { dueDate: "asc" },
  });
  const competencies = await prisma.cbcCompetency.findMany({
    where: { tenantId: auth.tenantId, studentId: student.studentId },
    orderBy: { competencyArea: "asc" },
  });

  return res.json({
    student,
    marks: marks.map((mark) => ({
      mark_id: mark.markId,
      subject_name: mark.subject.subjectName,
      subject_code: mark.subject.subjectCode,
      raw_score: mark.rawScore,
      cbc_grade: mark.cbcGrade,
      assessment_type: mark.assessmentType,
      entered_at: mark.enteredAt,
    })),
    subject_averages: [],
    attendance: {
      PRESENT: attendancePresent,
      ABSENT: attendanceAbsent,
      pct: attendanceTotal > 0 ? Number(((attendancePresent / attendanceTotal) * 100).toFixed(1)) : 0,
    },
    assignments: assignments.map((assignment) => ({
      assignment_id: assignment.assignmentId,
      title: assignment.title,
      due_date: assignment.dueDate,
      subject_name: assignment.subject.subjectName,
      max_score: assignment.maxScore,
    })),
    competencies,
    fees_paid: feesPaid._sum.amountPaid ?? 0,
    fees_due: 0,
    fee_balance: 0,
  });
});

app.get("/parent/dashboard", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PARENT"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const parent = await prisma.parent.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
  });
  if (!parent) return res.status(404).json({ error: "Parent not found" });
  const children = await prisma.parentStudentLink.findMany({
    where: { tenantId: auth.tenantId, parentId: parent.parentId },
    include: { student: { include: { class: true, tier: true } } },
  });
  const childDetails = await Promise.all(
    children.map(async (link) => {
      const recentMarks = await prisma.mark.findMany({
        where: { tenantId: auth.tenantId, studentId: link.studentId, isPublished: true },
        include: { subject: { select: { subjectName: true } } },
        orderBy: { enteredAt: "desc" },
        take: 5,
      });
      const attendance = await prisma.attendance.groupBy({
        by: ["status"],
        where: { tenantId: auth.tenantId, studentId: link.studentId },
        _count: { attendanceId: true },
      });
      const paid = await prisma.feePayment.aggregate({
        where: { tenantId: auth.tenantId, studentId: link.studentId },
        _sum: { amountPaid: true },
      });
      const presentCount = attendance.find((row) => row.status === "PRESENT")?._count.attendanceId ?? 0;
      const absentCount = attendance.find((row) => row.status === "ABSENT")?._count.attendanceId ?? 0;
      const totalAttendance = attendance.reduce((sum, row) => sum + row._count.attendanceId, 0);
      // Outstanding balance = sum of all mandatory fees - amount paid
      const feeStructures = await prisma.feeStructure.findMany({
        where: { tenantId: auth.tenantId, tierId: link.student.tierId, isMandatory: true },
        select: { amountKes: true },
      });
      const totalFee = feeStructures.reduce((s, f) => s + f.amountKes, 0);
      const totalPaid = paid._sum.amountPaid ?? 0;
      const balance = Math.max(0, totalFee - totalPaid);

      return {
        ...link.student,
        can_view_results: link.canViewResults,
        can_view_fees: link.canViewFees,
        recent_marks: recentMarks.map((mark) => ({
          raw_score: mark.rawScore,
          cbc_grade: mark.cbcGrade,
          subject_name: mark.subject.subjectName,
        })),
        attendance_pct: totalAttendance > 0 ? Number(((presentCount / totalAttendance) * 100).toFixed(1)) : 0,
        attendance_absent: absentCount,
        fees_paid: totalPaid,
        fee_balance: balance,
        total_fee: totalFee,
      };
    }),
  );
  // also include fee_balance for backward compat
  const firstChild = childDetails[0];
  const feePaid = firstChild ? Number(firstChild.fees_paid ?? 0) : 0;
  return res.json({
    parent,
    children: childDetails,
    fee_balance: {
      termFee: 0,
      amountPaid: feePaid,
      balance: 0,
    },
    recent_payments: [],
  });
});

// GET /parent/fees?studentId=  — per-child fee history (PARENT-scoped)
app.get("/parent/fees", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PARENT"]);
  if (!auth || !auth.tenantId || !auth.userId) return;

  // 1. Resolve this parent
  const parent = await prisma.parent.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
  });
  if (!parent) return res.status(404).json({ error: "Parent profile not found" });

  // 2. Confirm the requested student belongs to this parent
  const requestedStudentId = String(req.query.studentId ?? "");
  if (!requestedStudentId) {
    return res.status(400).json({ error: "studentId query param required" });
  }
  const link = await prisma.parentStudentLink.findFirst({
    where: { tenantId: auth.tenantId, parentId: parent.parentId, studentId: requestedStudentId },
  });
  if (!link) {
    return res.status(403).json({ error: "You do not have permission to view this student's fees" });
  }

  // 3. Return fee payments for that child only
  const payments = await prisma.feePayment.findMany({
    where: { tenantId: auth.tenantId, studentId: requestedStudentId },
    include: { feeStructure: { select: { feeType: true } } },
    orderBy: { paidAt: "desc" },
  });

  return res.json(
    payments.map((p) => ({
      paymentId: p.paymentId,
      receiptNumber: p.receiptNumber,
      amountPaid: p.amountPaid,
      paymentMethod: p.paymentMethod,
      mpesaCode: p.mpesaCode,
      feeType: p.feeStructure.feeType,
      paidAt: p.paidAt,
      notes: p.notes,
    })),
  );
});

// GET /parent/reports?studentId= — term reports (PARENT-scoped, child-isolated)
app.get("/parent/reports", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PARENT"]);
  if (!auth || !auth.tenantId || !auth.userId) return;

  const parent = await prisma.parent.findFirst({
    where: { tenantId: auth.tenantId, userId: auth.userId },
  });
  if (!parent) return res.status(404).json({ error: "Parent profile not found" });

  const requestedStudentId = String(req.query.studentId ?? "");
  if (!requestedStudentId) {
    return res.status(400).json({ error: "studentId query param required" });
  }

  const link = await prisma.parentStudentLink.findFirst({
    where: { tenantId: auth.tenantId, parentId: parent.parentId, studentId: requestedStudentId, canViewResults: true },
  });
  if (!link) {
    return res.status(403).json({ error: "You do not have permission to view this student's reports" });
  }

  const reports = await prisma.report.findMany({
    where: { tenantId: auth.tenantId, studentId: requestedStudentId, isPublished: true },
    include: { term: { select: { termName: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return res.json(
    reports.map((r) => ({
      reportId: r.reportId,
      reportType: r.reportType,
      termName: r.term?.termName ?? null,
      publishedAt: r.publishedAt,
      approvedAt: r.approvedAt,
    })),
  );
});

app.get("/finance/dashboard", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "PRINCIPAL", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const [totalCollected, totalExpenses, pendingExpenses, payrollTotal] = await Promise.all([
    prisma.feePayment.aggregate({ where: { tenantId: auth.tenantId }, _sum: { amountPaid: true } }),
    prisma.expense.aggregate({ where: { tenantId: auth.tenantId, status: "APPROVED" }, _sum: { amountKes: true } }),
    prisma.expense.aggregate({ where: { tenantId: auth.tenantId, status: "PENDING" }, _sum: { amountKes: true } }),
    prisma.payroll.aggregate({ where: { tenantId: auth.tenantId, paymentStatus: "PAID" }, _sum: { netSalary: true } }),
  ]);
  const recentPayments = await prisma.feePayment.findMany({
    where: { tenantId: auth.tenantId },
    include: {
      student: { select: { fullName: true, admissionNumber: true } },
      feeStructure: { select: { feeType: true } },
      recorder: { select: { fullName: true } },
    },
    orderBy: { paidAt: "desc" },
    take: 15,
  });
  const byMethod = await prisma.feePayment.groupBy({
    by: ["paymentMethod"],
    where: { tenantId: auth.tenantId },
    _sum: { amountPaid: true },
    _count: { paymentId: true },
  });
  const allPayments = await prisma.feePayment.findMany({
    where: { tenantId: auth.tenantId },
    select: { paidAt: true, amountPaid: true },
  });
  const monthlyMap = new Map<string, number>();
  for (const payment of allPayments) {
    const month = payment.paidAt.toISOString().slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + payment.amountPaid);
  }

  return res.json({
    total_collected: totalCollected._sum.amountPaid ?? 0,
    total_expenses: totalExpenses._sum.amountKes ?? 0,
    pending_expenses: pendingExpenses._sum.amountKes ?? 0,
    payroll_total: payrollTotal._sum.netSalary ?? 0,
    net_balance: (totalCollected._sum.amountPaid ?? 0) - (totalExpenses._sum.amountKes ?? 0) - (payrollTotal._sum.netSalary ?? 0),
    by_method: byMethod.map((item) => ({
      payment_method: item.paymentMethod,
      total: item._sum.amountPaid ?? 0,
      count: item._count.paymentId,
    })),
    recent_payments: recentPayments.map((payment) => ({
      payment_id: payment.paymentId,
      receipt_number: payment.receiptNumber,
      amount_paid: payment.amountPaid,
      payment_method: payment.paymentMethod,
      student_name: payment.student.fullName,
      admission_number: payment.student.admissionNumber,
      fee_type: payment.feeStructure.feeType,
      recorded_by_name: payment.recorder.fullName,
      paid_at: payment.paidAt,
    })),
    fee_structures: [],
    monthly_collection: Array.from(monthlyMap.entries()).map(([month, total]) => ({ month, total })),
  });
});

app.get("/hq/plans", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "SUPPORT", "SALES", "BILLING"]);
  if (!auth) return;
  return res.json(await prisma.subscriptionPlan.findMany({ orderBy: { createdAt: "desc" } }));
});

app.get("/hq/platform-users", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "SUPPORT", "SALES", "BILLING"]);
  if (!auth) return;
  return res.json(await prisma.platformUser.findMany({ orderBy: { createdAt: "desc" } }));
});

app.get("/hq/tenants", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "SUPPORT", "SALES", "BILLING"]);
  if (!auth) return;
  const tenants = await prisma.tenant.findMany({
    include: {
      plan: true,
      onboardedUser: true,
      dashboards: true,
      featureAssignments: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(tenants);
});

app.get("/hq/tenants/:tenantId/features", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "SUPPORT", "SALES", "BILLING"]);
  if (!auth) return;
  const features = await prisma.tenantFeatureAssignment.findMany({
    where: { tenantId: req.params.tenantId },
    include: { feature: true, dashboard: true, assignee: true },
    orderBy: [{ dashboardId: "asc" }, { assignedAt: "desc" }],
  });
  return res.json(features);
});

app.post("/hq/tenants/:tenantId/features/:tfaId/toggle", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["SUPER_ADMIN", "SUPPORT", "SALES", "BILLING"]);
  if (!auth) return;
  const assignment = await prisma.tenantFeatureAssignment.findFirst({
    where: { tenantId: req.params.tenantId, tfaId: req.params.tfaId },
  });
  if (!assignment) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.tenantFeatureAssignment.update({
    where: { tfaId: assignment.tfaId },
    data: {
      isEnabled: !assignment.isEnabled,
      lastToggledAt: new Date(),
      lastToggledBy: auth.platformUserId ?? auth.userId ?? null,
    },
  });
  await notifySchoolStaff(req.params.tenantId, ["ADMIN", "PRINCIPAL"], {
    title: "Feature entitlement changed",
    message: `HQ updated access for ${assignment.featureId}.`,
    type: "hq.feature.toggled",
    priority: "LOW",
    channel: "IN_APP",
    relatedType: "tenant_feature_assignment",
    relatedId: assignment.tfaId,
  });
  await logAudit({
    auth,
    action: "hq.feature.toggle",
    entityType: "tenant_feature_assignment",
    entityId: assignment.tfaId,
    oldValues: assignment,
    newValues: updated,
    ipAddress: req.ip,
  });
  return res.json(updated);
});

app.get("/school/subjects", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.subject.findMany({
      where: { tenantId: auth.tenantId },
      include: { tier: true },
      orderBy: [{ tierId: "asc" }, { subjectName: "asc" }],
    }),
  );
});

app.post("/school/subjects", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    tierId: z.string().min(1),
    subjectName: z.string().min(1),
    subjectCode: z.string().optional(),
    cbcLearningArea: z.string().optional(),
    isCore: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const subject = await prisma.subject.create({
    data: {
      tenantId: auth.tenantId,
      tierId: input.tierId,
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      cbcLearningArea: input.cbcLearningArea,
      isCore: input.isCore ?? true,
      isActive: input.isActive ?? true,
    },
  });
  return res.status(201).json(subject);
});

app.put("/school/subjects/:subjectId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    tierId: z.string().optional(),
    subjectName: z.string().optional(),
    subjectCode: z.string().optional(),
    cbcLearningArea: z.string().optional(),
    isCore: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const subject = await prisma.subject.updateMany({
    where: { tenantId: auth.tenantId, subjectId: req.params.subjectId },
    data: input,
  });
  return res.json(subject);
});

app.get("/school/academic-years", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const years = await prisma.academicYear.findMany({
    where: { tenantId: auth.tenantId },
    include: { terms: true },
    orderBy: { startDate: "desc" },
  });
  return res.json(years);
});

app.post("/school/academic-years", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    yearLabel: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    isCurrent: z.boolean().optional(),
  }).parse(req.body);
  const year = await prisma.academicYear.create({
    data: {
      tenantId: auth.tenantId,
      yearLabel: input.yearLabel,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isCurrent: input.isCurrent ?? false,
    },
  });
  return res.status(201).json(year);
});

app.get("/school/terms", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.term.findMany({
      where: { tenantId: auth.tenantId },
      include: { year: true },
      orderBy: [{ yearId: "desc" }, { termNumber: "asc" }],
    }),
  );
});

app.post("/school/terms", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    yearId: z.string().min(1),
    termNumber: z.number().int().min(1).max(3),
    termName: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    isCurrent: z.boolean().optional(),
  }).parse(req.body);
  const term = await prisma.term.create({
    data: {
      tenantId: auth.tenantId,
      yearId: input.yearId,
      termNumber: input.termNumber,
      termName: input.termName,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isCurrent: input.isCurrent ?? false,
    },
  });
  return res.status(201).json(term);
});

app.get("/school/tiers", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.educationTier.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { tierName: "asc" },
    }),
  );
});

app.post("/school/tiers", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    tierKey: z.enum(["PRIMARY", "JSS", "SSS"]),
    tierName: z.string().min(1),
    gradeFrom: z.string().min(1),
    gradeTo: z.string().min(1),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const tier = await prisma.educationTier.create({
    data: {
      tenant: { connect: { tenantId: auth.tenantId } },
      tierKey: input.tierKey,
      tierName: input.tierName,
      gradeFrom: input.gradeFrom,
      gradeTo: input.gradeTo,
      isActive: input.isActive ?? true,
    },
  });
  return res.status(201).json(tier);
});

app.get("/school/class-subject-assignments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.classSubjectAssignment.findMany({
      where: { tenantId: auth.tenantId },
      include: { class: true, subject: true, year: true },
      orderBy: { isActive: "desc" },
    }),
  );
});

app.post("/school/class-subject-assignments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    yearId: z.string().min(1),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const assignment = await prisma.classSubjectAssignment.upsert({
    where: {
      tenantId_classId_subjectId_yearId: {
        tenantId: auth.tenantId,
        classId: input.classId,
        subjectId: input.subjectId,
        yearId: input.yearId,
      },
    },
    update: { isActive: input.isActive ?? true },
    create: {
      tenant: { connect: { tenantId: auth.tenantId } },
      class: { connect: { classId: input.classId } },
      subject: { connect: { subjectId: input.subjectId } },
      year: { connect: { yearId: input.yearId } },
      isActive: input.isActive ?? true,
    },
  });
  return res.status(201).json(assignment);
});

app.get("/school/teacher-assignments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.classTeacherAssignment.findMany({
      where: { tenantId: auth.tenantId },
      include: { class: true, staff: true, year: true, subject: true },
      orderBy: { assignedAt: "desc" },
    }),
  );
});

app.post("/school/teacher-assignments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    classId: z.string().min(1),
    staffId: z.string().min(1),
    yearId: z.string().min(1),
    assignmentType: z.enum(["FORM_TEACHER", "SUBJECT_TEACHER"]),
    subjectId: z.string().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const assignment = await prisma.classTeacherAssignment.create({
    data: {
      tenantId: auth.tenantId,
      classId: input.classId,
      staffId: input.staffId,
      yearId: input.yearId,
      assignmentType: input.assignmentType,
      subjectId: input.subjectId ?? null,
      isActive: input.isActive ?? true,
    },
  });
  return res.status(201).json(assignment);
});

app.get("/school/parents", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.parent.findMany({ where: { tenantId: auth.tenantId }, include: { links: true } }));
});

app.post("/school/parents", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    fullName: z.string().min(1),
    email: z.string().email().optional(),
    phonePrimary: z.string().min(1),
    phoneSecondary: z.string().optional(),
    relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN", "OTHER"]),
    nationalId: z.string().optional(),
    password: z.string().optional(),
  }).parse(req.body);
  const user = input.email
    ? await prisma.user.create({
        data: {
          tenantId: auth.tenantId,
          email: input.email,
          phone: input.phonePrimary,
          passwordHash: await hashPassword(input.password ?? "Parent@2025!"),
          role: "PARENT",
          fullName: input.fullName,
        },
      })
    : null;
  const parent = await prisma.parent.create({
    data: {
      tenantId: auth.tenantId,
      userId: user?.userId,
      fullName: input.fullName,
      nationalId: input.nationalId,
      phonePrimary: input.phonePrimary,
      phoneSecondary: input.phoneSecondary,
      relationship: input.relationship,
    },
  });
  await logAudit({
    auth,
    action: "parent.created",
    entityType: "parent",
    entityId: parent.parentId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(parent);
});

app.post("/school/parent-links", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    parentId: z.string().min(1),
    studentId: z.string().min(1),
    isPrimaryContact: z.boolean().optional(),
    canViewResults: z.boolean().optional(),
    canViewFees: z.boolean().optional(),
  }).parse(req.body);
  const link = await prisma.parentStudentLink.upsert({
    where: {
      tenantId_parentId_studentId: {
        tenantId: auth.tenantId,
        parentId: input.parentId,
        studentId: input.studentId,
      },
    },
    update: {
      isPrimaryContact: input.isPrimaryContact ?? false,
      canViewResults: input.canViewResults ?? true,
      canViewFees: input.canViewFees ?? true,
    },
    create: {
      tenantId: auth.tenantId,
      parentId: input.parentId,
      studentId: input.studentId,
      isPrimaryContact: input.isPrimaryContact ?? false,
      canViewResults: input.canViewResults ?? true,
      canViewFees: input.canViewFees ?? true,
    },
  });
  await logAudit({
    auth,
    action: "parent_link.upsert",
    entityType: "parent_student_link",
    entityId: link.linkId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(link);
});

app.get("/school/role-visibility", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.schoolRoleVisibility.findMany({ where: { tenantId: auth.tenantId }, include: { tfa: true } }));
});

app.post("/school/role-visibility", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    tfaId: z.string().min(1),
    roleKey: z.enum(["PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE", "ADMIN"]),
    isVisible: z.boolean().optional(),
  }).parse(req.body);
  const visibility = await prisma.schoolRoleVisibility.upsert({
    where: {
      tenantId_tfaId_roleKey: {
        tenantId: auth.tenantId,
        tfaId: input.tfaId,
        roleKey: input.roleKey,
      },
    },
    update: { isVisible: input.isVisible ?? true, setBy: auth.userId ?? auth.platformUserId ?? "" },
    create: {
      tenantId: auth.tenantId,
      tfaId: input.tfaId,
      roleKey: input.roleKey,
      isVisible: input.isVisible ?? true,
      setBy: auth.userId ?? auth.platformUserId ?? "",
    },
  });
  await logAudit({
    auth,
    action: "role_visibility.upsert",
    entityType: "school_role_visibility",
    entityId: visibility.visibilityId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(visibility);
});

app.get("/school/timetable", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT"]);
  if (!auth || !auth.tenantId) return;
  const entries = await prisma.timetableEntry.findMany({
    where: { tenantId: auth.tenantId, isActive: true },
    include: { class: true, subject: true, staffMember: true, year: true, term: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return res.json(entries.map((entry) => ({ ...entry, dayLabel: dayLabel(entry.dayOfWeek) })));
});

app.post("/school/timetable", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    yearId: z.string().min(1),
    termId: z.string().min(1),
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    staffId: z.string().optional(),
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    room: z.string().optional(),
  }).parse(req.body);
  const entry = await prisma.timetableEntry.create({
    data: {
      tenant: { connect: { tenantId: auth.tenantId } },
      year: { connect: { yearId: input.yearId } },
      term: { connect: { termId: input.termId } },
      class: { connect: { classId: input.classId } },
      subject: { connect: { subjectId: input.subjectId } },
      staffMember: input.staffId ? { connect: { staffId: input.staffId } } : undefined,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room ?? null,
      creator: { connect: { userId: auth.userId ?? "" } },
    },
  });
  await notifyClassUsers(auth.tenantId, input.classId, {
    title: "Timetable updated",
    message: `A new ${dayLabel(input.dayOfWeek)} lesson has been scheduled.`,
    type: "timetable.updated",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "timetable_entry",
    relatedId: entry.timetableEntryId,
  });
  await notifySchoolStaff(auth.tenantId, ["ADMIN", "PRINCIPAL", "TEACHER"], {
    title: "Timetable updated",
    message: `A timetable slot has changed for class ${input.classId}.`,
    type: "timetable.updated",
    priority: "LOW",
    channel: "IN_APP",
    relatedType: "timetable_entry",
    relatedId: entry.timetableEntryId,
  });
  await logAudit({
    auth,
    action: "timetable.created",
    entityType: "timetable_entry",
    entityId: entry.timetableEntryId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(entry);
});

app.get("/school/messages", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const threads = await prisma.messageThread.findMany({
    where: { tenantId: auth.tenantId },
    include: {
      participants: { include: { user: true } },
      messages: { include: { sender: true }, orderBy: { sentAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  return res.json(threads);
});

app.post("/school/messages", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "PARENT", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    recipientUserIds: z.array(z.string()).optional().default([]),
  }).parse(req.body);
  const thread = await prisma.messageThread.create({
    data: {
      tenantId: auth.tenantId,
      subject: input.subject,
      createdBy: auth.userId ?? auth.platformUserId ?? "",
      participants: {
        create: [
          ...(auth.userId
            ? [{ tenantId: auth.tenantId, userId: auth.userId, roleLabel: auth.role ?? auth.hqRole ?? "SENDER" }]
            : []),
          ...input.recipientUserIds.map((userId) => ({
            tenantId: auth.tenantId,
            userId,
            roleLabel: "RECIPIENT",
          })),
        ],
      },
      messages: {
        create: {
          tenantId: auth.tenantId,
          senderId: auth.userId ?? auth.platformUserId ?? "",
          body: input.body,
        },
      },
    },
  });
  for (const userId of input.recipientUserIds) {
    await notifyUser({
      tenantId: auth.tenantId,
      userId,
      type: "message.thread.created",
      title: input.subject,
      message: input.body,
      priority: "MEDIUM",
      channel: "IN_APP",
      relatedType: "message_thread",
      relatedId: thread.threadId,
    });
  }
  await logAudit({
    auth,
    action: "message.thread.created",
    entityType: "message_thread",
    entityId: thread.threadId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(thread);
});

app.post("/school/notifications", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL", "TEACHER", "FINANCE"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    recipientUserId: z.string().optional(),
    recipientPlatformUserId: z.string().optional(),
    recipientUserIds: z.array(z.string()).optional(),
    title: z.string().min(1),
    message: z.string().min(1),
    type: z.string().min(1),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    channel: z.enum(["IN_APP", "SMS", "EMAIL", "PUSH", "WHATSAPP"]).optional(),
    relatedType: z.string().optional(),
    relatedId: z.string().optional(),
  }).parse(req.body);
  const recipients = [
    ...(input.recipientUserId ? [{ recipientUserId: input.recipientUserId }] : []),
    ...(input.recipientPlatformUserId ? [{ recipientPlatformUserId: input.recipientPlatformUserId }] : []),
    ...(input.recipientUserIds ?? []).map((recipientUserId) => ({ recipientUserId })),
  ];
  if (!recipients.length) {
    return res.status(400).json({ error: "At least one recipient is required" });
  }
  const notifications = await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        tenantId: auth.tenantId,
        ...recipient,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority,
        channel: input.channel,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      }),
    ),
  );
  await logAudit({
    auth,
    action: "notification.manual.send",
    entityType: "notification",
    entityId: notifications[0]?.notificationId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(notifications);
});

app.get("/school/promotions", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.studentPromotion.findMany({
      where: { tenantId: auth.tenantId },
      include: { student: true, fromClass: true, toClass: true, fromYear: true, toYear: true, decider: true },
      orderBy: { decidedAt: "desc" },
    }),
  );
});

app.post("/school/promotions", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    studentId: z.string().min(1),
    fromClassId: z.string().min(1),
    toClassId: z.string().optional(),
    fromYearId: z.string().min(1),
    toYearId: z.string().optional(),
    autoFlagged: z.boolean().optional(),
    decision: z.enum(["PROMOTED", "HELD", "TRANSFERRED", "GRADUATED"]),
    notes: z.string().optional(),
  }).parse(req.body);
  const promotion = await prisma.studentPromotion.create({
    data: {
      tenant: { connect: { tenantId: auth.tenantId } },
      student: { connect: { studentId: input.studentId } },
      fromClass: { connect: { classId: input.fromClassId } },
      fromYear: { connect: { yearId: input.fromYearId } },
      toClass: input.toClassId ? { connect: { classId: input.toClassId } } : undefined,
      toYear: input.toYearId ? { connect: { yearId: input.toYearId } } : undefined,
      autoFlagged: input.autoFlagged ?? false,
      decision: input.decision,
      notes: input.notes ?? null,
      decider: auth.userId ? { connect: { userId: auth.userId } } : undefined,
      decidedAt: new Date(),
    },
  });
  await notifyUser({
    tenantId: auth.tenantId,
    userId: (await prisma.student.findUnique({ where: { studentId: input.studentId }, select: { userId: true } }))?.userId ?? null,
    type: "promotion.decided",
    title: "Promotion decision updated",
    message: `Your promotion decision is now ${input.decision.toLowerCase()}.`,
    priority: "HIGH",
    channel: "IN_APP",
    relatedType: "promotion",
    relatedId: promotion.promotionId,
  });
  await notifyLinkedParents(auth.tenantId, input.studentId, {
    title: "Promotion decision updated",
    message: `A promotion decision has been recorded for your child.`,
    type: "promotion.decided",
    priority: "HIGH",
    channel: "IN_APP",
    relatedType: "promotion",
    relatedId: promotion.promotionId,
  });
  await notifySchoolStaff(auth.tenantId, ["ADMIN", "PRINCIPAL"], {
    title: "Promotion workflow completed",
    message: `Student promotion decision recorded: ${input.decision}.`,
    type: "promotion.decided",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "promotion",
    relatedId: promotion.promotionId,
  });
  await logAudit({
    auth,
    action: "promotion.created",
    entityType: "promotion",
    entityId: promotion.promotionId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(promotion);
});

app.get("/teacher/attendance/class/:classId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const dateParam = String(req.query.date ?? new Date().toISOString().slice(0, 10));
  const records = await prisma.student.findMany({
    where: { tenantId: auth.tenantId, classId: req.params.classId, isActive: true },
    include: {
      attendance: {
        where: { attendanceDate: { gte: new Date(`${dateParam}T00:00:00.000Z`), lt: new Date(`${dateParam}T23:59:59.999Z`) } },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });
  return res.json(records.map((student) => ({ ...student, status: student.attendance[0]?.status ?? null })));
});

app.post("/teacher/attendance", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    records: z.array(z.object({
      studentId: z.string().min(1),
      classId: z.string().min(1),
      termId: z.string().min(1),
      date: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
      notes: z.string().optional(),
    })),
  }).parse(req.body);
  const saved = await prisma.$transaction(
    input.records.map((record) =>
      prisma.attendance.upsert({
        where: {
          tenantId_studentId_attendanceDate_classId: {
            tenantId: auth.tenantId!,
            studentId: record.studentId,
            attendanceDate: new Date(`${record.date}T00:00:00.000Z`),
            classId: record.classId,
          },
        },
        update: {
          status: record.status,
          markedBy: auth.userId!,
          notes: record.notes,
        },
        create: {
          tenantId: auth.tenantId!,
          studentId: record.studentId,
          classId: record.classId,
          termId: record.termId,
          attendanceDate: new Date(`${record.date}T00:00:00.000Z`),
          status: record.status,
          markedBy: auth.userId!,
          notes: record.notes,
        },
      }),
    ),
  );
  for (const record of input.records) {
    if (record.status === "ABSENT" || record.status === "LATE") {
      await notifyLinkedParents(auth.tenantId, record.studentId, {
        title: `Attendance update for ${record.date}`,
        message: `Your child was marked ${record.status.toLowerCase()} in class today.`,
        type: "attendance.marked",
        priority: record.status === "ABSENT" ? "HIGH" : "MEDIUM",
        channel: "SMS",
        relatedType: "attendance",
        relatedId: record.studentId,
      });
      await notifySchoolStaff(auth.tenantId, ["ADMIN", "PRINCIPAL"], {
        title: "Attendance alert",
        message: `A student was marked ${record.status.toLowerCase()} in class ${record.classId}.`,
        type: "attendance.alert",
        priority: record.status === "ABSENT" ? "HIGH" : "MEDIUM",
        channel: "IN_APP",
        relatedType: "attendance",
        relatedId: record.studentId,
      });
    }
  }
  await logAudit({
    auth,
    action: "attendance.bulk.upsert",
    entityType: "attendance",
    entityId: input.records[0]?.studentId ?? null,
    newValues: input.records,
    ipAddress: req.ip,
  });
  return res.json({ success: true, saved: saved.length });
});

app.get("/teacher/marks/class/:classId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const termId = String(req.query.termId ?? "");
  const subjectId = String(req.query.subjectId ?? "");
  const marks = await prisma.mark.findMany({
    where: {
      tenantId: auth.tenantId,
      classId: req.params.classId,
      ...(termId ? { termId } : {}),
      ...(subjectId ? { subjectId } : {}),
    },
    include: { student: true, subject: true },
    orderBy: [{ student: { fullName: "asc" } }, { subject: { subjectName: "asc" } }],
  });
  return res.json(marks);
});

app.post("/teacher/marks", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    studentId: z.string().min(1),
    subjectId: z.string().min(1),
    classId: z.string().min(1),
    termId: z.string().min(1),
    assessmentType: z.enum(["FORMATIVE", "SUMMATIVE", "PROJECT", "EXAM"]),
    rawScore: z.number(),
    maxScore: z.number().optional(),
  }).parse(req.body);
  const existing = await prisma.mark.findFirst({
    where: {
      tenantId: auth.tenantId,
      studentId: input.studentId,
      subjectId: input.subjectId,
      classId: input.classId,
      termId: input.termId,
      assessmentType: input.assessmentType,
    },
  });
  const cbcGrade = cbcGradeFromScore(input.rawScore);
  const mark = existing
    ? await prisma.mark.update({
        where: { markId: existing.markId },
        data: {
          rawScore: input.rawScore,
          cbcGrade,
          enteredBy: auth.userId,
          maxScore: input.maxScore ?? 100,
        },
      })
    : await prisma.mark.create({
        data: {
          tenantId: auth.tenantId,
          studentId: input.studentId,
          subjectId: input.subjectId,
          classId: input.classId,
          termId: input.termId,
          assessmentType: input.assessmentType,
          rawScore: input.rawScore,
          cbcGrade,
          maxScore: input.maxScore ?? 100,
          enteredBy: auth.userId,
      },
    });
  if (mark.isPublished) {
    await notifyLinkedParents(auth.tenantId, input.studentId, {
      title: "Results updated",
      message: `A new ${input.assessmentType.toLowerCase()} result is available.`,
      type: "marks.published",
      priority: "MEDIUM",
      channel: "IN_APP",
      relatedType: "mark",
      relatedId: mark.markId,
    });
  }
  await logAudit({
    auth,
    action: existing ? "mark.updated" : "mark.created",
    entityType: "mark",
    entityId: mark.markId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(mark);
});

app.post("/teacher/marks/publish", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({ markIds: z.array(z.string()).min(1) }).parse(req.body);
  await prisma.mark.updateMany({
    where: { tenantId: auth.tenantId, markId: { in: input.markIds } },
    data: { isPublished: true, publishedAt: new Date() },
  });
  const marks = await prisma.mark.findMany({
    where: { tenantId: auth.tenantId, markId: { in: input.markIds } },
    select: { markId: true, studentId: true, assessmentType: true },
  });
  await Promise.all(
    marks.map((mark) =>
      notifyLinkedParents(auth.tenantId, mark.studentId, {
        title: "Results published",
        message: `Your child's ${mark.assessmentType.toLowerCase()} result is now visible.`,
        type: "report.results.published",
        priority: "MEDIUM",
        channel: "IN_APP",
        relatedType: "mark",
        relatedId: mark.markId,
      }),
    ),
  );
  await logAudit({
    auth,
    action: "mark.published",
    entityType: "mark",
    entityId: input.markIds.join(","),
    newValues: input,
    ipAddress: req.ip,
  });
  return res.json({ success: true });
});

app.post("/teacher/assignments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    termId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    maxScore: z.number().optional(),
  }).parse(req.body);
  const assignment = await prisma.assignment.create({
    data: {
      tenantId: auth.tenantId,
      classId: input.classId,
      subjectId: input.subjectId,
      termId: input.termId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      maxScore: input.maxScore ?? 100,
      createdBy: auth.userId,
    },
  });
  await notifyClassUsers(auth.tenantId, input.classId, {
    title: `New assignment: ${input.title}`,
    message: input.description ?? "A new class assignment has been posted.",
    type: "assignment.created",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "assignment",
    relatedId: assignment.assignmentId,
    includeParents: true,
  });
  await logAudit({
    auth,
    action: "assignment.created",
    entityType: "assignment",
    entityId: assignment.assignmentId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(assignment);
});

app.get("/teacher/assignments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  return res.json(await prisma.assignment.findMany({ where: { tenantId: auth.tenantId, createdBy: auth.userId }, include: { class: true, subject: true } }));
});

app.get("/teacher/portfolio", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL", "STUDENT"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.studentPortfolio.findMany({ where: { tenantId: auth.tenantId }, include: { student: true, subject: true, term: true }, orderBy: { uploadedAt: "desc" } }));
});

app.post("/teacher/portfolio", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    studentId: z.string().min(1),
    subjectId: z.string().optional(),
    termId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    fileUrl: z.string().optional(),
    fileType: z.string().optional(),
    isVisibleParent: z.boolean().optional(),
  }).parse(req.body);
  const portfolio = await prisma.studentPortfolio.create({
    data: {
      tenantId: auth.tenantId,
      studentId: input.studentId,
      subjectId: input.subjectId,
      termId: input.termId,
      title: input.title,
      description: input.description,
      fileUrl: input.fileUrl,
      fileType: input.fileType,
      uploadedBy: auth.userId,
      isVisibleParent: input.isVisibleParent ?? true,
    },
  });
  if (portfolio.isVisibleParent) {
    await notifyLinkedParents(auth.tenantId, input.studentId, {
      title: "Portfolio updated",
      message: `A new portfolio item was added: ${input.title}.`,
      type: "portfolio.updated",
      priority: "LOW",
      channel: "IN_APP",
      relatedType: "portfolio",
      relatedId: portfolio.portfolioId,
    });
  }
  await logAudit({
    auth,
    action: "portfolio.created",
    entityType: "portfolio",
    entityId: portfolio.portfolioId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(portfolio);
});

app.post("/teacher/competencies", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    studentId: z.string().min(1),
    termId: z.string().min(1),
    competencyArea: z.string().min(1),
    level: z.enum(["EE", "ME", "AE", "BE"]),
    notes: z.string().optional(),
  }).parse(req.body);
  const existing = await prisma.cbcCompetency.findFirst({
    where: {
      tenantId: auth.tenantId,
      studentId: input.studentId,
      termId: input.termId,
      competencyArea: input.competencyArea,
    },
  });
  const competency = existing
    ? await prisma.cbcCompetency.update({
        where: { competencyId: existing.competencyId },
        data: {
          level: input.level,
          notes: input.notes,
          assessedBy: auth.userId,
        },
      })
    : await prisma.cbcCompetency.create({
        data: {
          tenantId: auth.tenantId,
          studentId: input.studentId,
          termId: input.termId,
          competencyArea: input.competencyArea,
          level: input.level,
          notes: input.notes,
          assessedBy: auth.userId,
        },
      });
  return res.status(201).json(competency);
});

app.get("/principal/reports", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PRINCIPAL", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.report.findMany({ where: { tenantId: auth.tenantId }, include: { student: true, class: true, term: true, generator: true, approver: true }, orderBy: { generatedAt: "desc" } }));
});

app.post("/principal/reports/:reportId/approve", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PRINCIPAL", "ADMIN"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const report = await prisma.report.findUnique({
    where: { reportId: req.params.reportId },
    include: { student: { select: { studentId: true, userId: true, fullName: true } } },
  });
  if (!report || report.tenantId !== auth.tenantId) {
    return res.status(404).json({ error: "Report not found" });
  }
  const updated = await prisma.report.updateMany({
    where: { tenantId: auth.tenantId, reportId: req.params.reportId },
    data: { approvedBy: auth.userId, approvedAt: new Date(), isPublished: true, publishedAt: new Date() },
  });
  if (report.student.userId) {
    await notifyUser({
      tenantId: auth.tenantId,
      userId: report.student.userId,
      type: "report.published",
      title: "Report approved",
      message: "Your report card has been approved and published.",
      priority: "HIGH",
      channel: "IN_APP",
      relatedType: "report",
      relatedId: report.reportId,
    });
  }
  await notifyLinkedParents(auth.tenantId, report.studentId, {
    title: "Report card published",
    message: `The term report for ${report.student.fullName} is now available.`,
    type: "report.published",
    priority: "HIGH",
    channel: "IN_APP",
    relatedType: "report",
    relatedId: report.reportId,
  });
  await logAudit({
    auth,
    action: "report.approved",
    entityType: "report",
    entityId: report.reportId,
    oldValues: report,
    newValues: updated,
    ipAddress: req.ip,
  });
  return res.json(updated);
});

app.post("/reports/generate", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    studentId: z.string().min(1),
    classId: z.string().min(1),
    termId: z.string().min(1),
    reportType: z.enum(["TERM_REPORT", "ANNUAL_REPORT"]).optional(),
  }).parse(req.body);
  const report = await prisma.report.create({
    data: {
      tenantId: auth.tenantId,
      studentId: input.studentId,
      classId: input.classId,
      termId: input.termId,
      reportType: input.reportType ?? "TERM_REPORT",
      generatedBy: auth.userId,
    },
  });
  await notifySchoolStaff(auth.tenantId, ["PRINCIPAL", "ADMIN"], {
    title: "Report ready for review",
    message: `A term report has been generated for student ${input.studentId}.`,
    type: "report.generated",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "report",
    relatedId: report.reportId,
  });
  await logAudit({
    auth,
    action: "report.generated",
    entityType: "report",
    entityId: report.reportId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(report);
});

app.get("/reports/student/:studentId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["TEACHER", "PRINCIPAL", "STUDENT", "PARENT", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.report.findMany({ where: { tenantId: auth.tenantId, studentId: req.params.studentId }, include: { class: true, term: true, generator: true, approver: true }, orderBy: { generatedAt: "desc" } }));
});

app.get("/finance/fee-structures", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.feeStructure.findMany({ where: { tenantId: auth.tenantId }, include: { year: true, tier: true, term: true }, orderBy: { feeType: "asc" } }));
});

app.get("/finance/payment-intents", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(
    await prisma.paymentIntent.findMany({
      where: { tenantId: auth.tenantId },
      include: { student: true, feeStructure: true, feePayment: true },
      orderBy: { createdAt: "desc" },
    }),
  );
});

app.post("/finance/fee-structures", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    yearId: z.string().min(1),
    tierId: z.string().min(1),
    termId: z.string().optional(),
    feeType: z.string().min(1),
    amountKes: z.number(),
    isMandatory: z.boolean().optional(),
    dueDate: z.string().optional(),
  }).parse(req.body);
  const feeStructure = await prisma.feeStructure.create({
    data: {
      tenantId: auth.tenantId,
      yearId: input.yearId,
      tierId: input.tierId,
      termId: input.termId,
      feeType: input.feeType,
      amountKes: input.amountKes,
      isMandatory: input.isMandatory ?? true,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
  await notifySchoolStaff(auth.tenantId, ["ADMIN", "PRINCIPAL"], {
    title: "Fee structure created",
    message: `${input.feeType} has been configured for the new term.`,
    type: "finance.fee_structure.created",
    priority: "LOW",
    channel: "IN_APP",
    relatedType: "fee_structure",
    relatedId: feeStructure.feeStructureId,
  });
  await logAudit({
    auth,
    action: "fee_structure.created",
    entityType: "fee_structure",
    entityId: feeStructure.feeStructureId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(feeStructure);
});

app.get("/finance/payments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL", "PARENT"]);
  if (!auth || !auth.tenantId) return;
  if (auth.role === "PARENT" && auth.userId) {
    const parent = await prisma.parent.findFirst({ where: { tenantId: auth.tenantId, userId: auth.userId } });
    if (!parent) return res.status(404).json({ error: "Parent not found" });
    const childLinks = await prisma.parentStudentLink.findMany({ where: { tenantId: auth.tenantId, parentId: parent.parentId } });
    return res.json(
      await prisma.feePayment.findMany({
        where: { tenantId: auth.tenantId, studentId: { in: childLinks.map((link) => link.studentId) } },
        include: { student: true, feeStructure: true, recorder: true },
        orderBy: { paidAt: "desc" },
      }),
    );
  }
  return res.json(await prisma.feePayment.findMany({ where: { tenantId: auth.tenantId }, include: { student: true, feeStructure: true, recorder: true }, orderBy: { paidAt: "desc" } }));
});

app.get("/finance/payments/student/:studentId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL", "PARENT"]);
  if (!auth || !auth.tenantId) return;
  if (auth.role === "PARENT" && auth.userId) {
    const parent = await prisma.parent.findFirst({ where: { tenantId: auth.tenantId, userId: auth.userId } });
    if (!parent) return res.status(404).json({ error: "Parent not found" });
    const link = await prisma.parentStudentLink.findFirst({
      where: { tenantId: auth.tenantId, parentId: parent.parentId, studentId: req.params.studentId },
    });
    if (!link) return res.status(403).json({ error: "Not allowed" });
  }
  return res.json(
    await prisma.feePayment.findMany({
      where: { tenantId: auth.tenantId, studentId: req.params.studentId },
      include: { student: true, feeStructure: true, recorder: true },
      orderBy: { paidAt: "desc" },
    }),
  );
});

app.post("/finance/payments", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    studentId: z.string().min(1),
    feeStructureId: z.string().min(1),
    amountPaid: z.number(),
    paymentMethod: z.enum(["MPESA", "CASH", "BANK", "CHEQUE"]),
    mpesaCode: z.string().optional(),
    notes: z.string().optional(),
  }).parse(req.body);
  const payment = await prisma.feePayment.create({
    data: {
      tenantId: auth.tenantId,
      studentId: input.studentId,
      feeStructureId: input.feeStructureId,
      amountPaid: input.amountPaid,
      paymentMethod: input.paymentMethod,
      mpesaCode: input.mpesaCode,
      receiptNumber: `RCP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      recordedBy: auth.userId,
      notes: input.notes,
    },
  });
  const receiptNumber = payment.receiptNumber;
  await prisma.receipt.create({
    data: {
      tenantId: auth.tenantId,
      paymentId: payment.paymentId,
      receiptNumber,
      verificationCode: `VER-${receiptNumber.slice(-6)}`,
    },
  });
  await recordSystemEvent(auth.tenantId, "fees.payment.completed", {
    paymentId: payment.paymentId,
    studentId: payment.studentId,
    amount: payment.amountPaid,
    paymentMethod: payment.paymentMethod,
    receiptNumber,
  });
  await notifyLinkedParents(auth.tenantId, input.studentId, {
    title: "Fee payment recorded",
    message: `KES ${input.amountPaid.toLocaleString()} was received successfully.`,
    type: "fee.paid",
    priority: "HIGH",
    channel: "SMS",
    relatedType: "fee_payment",
    relatedId: payment.paymentId,
  });
  await notifySchoolStaff(auth.tenantId, ["FINANCE", "ADMIN", "PRINCIPAL"], {
    title: "Fee payment received",
    message: `Receipt ${payment.receiptNumber} has been created.`,
    type: "fee.paid",
    priority: "HIGH",
    channel: "IN_APP",
    relatedType: "fee_payment",
    relatedId: payment.paymentId,
  });
  await logAudit({
    auth,
    action: "fee_payment.created",
    entityType: "fee_payment",
    entityId: payment.paymentId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(payment);
});

app.get("/finance/expenses", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.expense.findMany({ where: { tenantId: auth.tenantId }, include: { recorder: true, approver: true }, orderBy: { expenseDate: "desc" } }));
});

app.post("/finance/expenses", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    yearId: z.string().min(1),
    category: z.string().min(1),
    description: z.string().min(1),
    amountKes: z.number(),
    expenseDate: z.string().min(1),
  }).parse(req.body);
  const expense = await prisma.expense.create({
    data: {
      tenantId: auth.tenantId,
      yearId: input.yearId,
      category: input.category,
      description: input.description,
      amountKes: input.amountKes,
      expenseDate: new Date(input.expenseDate),
      recordedBy: auth.userId,
      status: "PENDING",
    },
  });
  await notifySchoolStaff(auth.tenantId, ["PRINCIPAL", "ADMIN"], {
    title: "Expense awaiting approval",
    message: `${input.category}: ${input.description}`,
    type: "expense.created",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "expense",
    relatedId: expense.expenseId,
  });
  await logAudit({
    auth,
    action: "expense.created",
    entityType: "expense",
    entityId: expense.expenseId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(expense);
});

app.post("/finance/expenses/:expenseId/approve", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["PRINCIPAL", "ADMIN"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const updated = await prisma.expense.updateMany({
    where: { tenantId: auth.tenantId, expenseId: req.params.expenseId },
    data: { approvedBy: auth.userId, status: "APPROVED" },
  });
  await notifySchoolStaff(auth.tenantId, ["FINANCE"], {
    title: "Expense approved",
    message: "A submitted expense has been approved.",
    type: "expense.approved",
    priority: "LOW",
    channel: "IN_APP",
    relatedType: "expense",
    relatedId: req.params.expenseId,
  });
  await logAudit({
    auth,
    action: "expense.approved",
    entityType: "expense",
    entityId: req.params.expenseId,
    newValues: updated,
    ipAddress: req.ip,
  });
  return res.json(updated);
});

app.get("/finance/payroll", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  return res.json(await prisma.payroll.findMany({ where: { tenantId: auth.tenantId }, include: { staffMember: true, processor: true, year: true }, orderBy: { month: "desc" } }));
});

app.post("/finance/payroll", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE"]);
  if (!auth || !auth.tenantId || !auth.userId) return;
  const input = z.object({
    staffId: z.string().min(1),
    yearId: z.string().min(1),
    month: z.number().int().min(1).max(12),
    grossSalary: z.number(),
    deductions: z.number().optional(),
  }).parse(req.body);
  const deductions = input.deductions ?? 0;
  const payroll = await prisma.payroll.create({
    data: {
      tenantId: auth.tenantId,
      staffId: input.staffId,
      yearId: input.yearId,
      month: input.month,
      grossSalary: input.grossSalary,
      deductions,
      netSalary: input.grossSalary - deductions,
      paymentStatus: "PENDING",
      processedBy: auth.userId,
    },
  });
  await notifySchoolStaff(auth.tenantId, ["PRINCIPAL", "ADMIN"], {
    title: "Payroll awaiting approval",
    message: `Payroll generated for staff ${input.staffId}.`,
    type: "payroll.created",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "payroll",
    relatedId: payroll.payrollId,
  });
  await logAudit({
    auth,
    action: "payroll.created",
    entityType: "payroll",
    entityId: payroll.payrollId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json(payroll);
});

app.post("/finance/payroll/:payrollId/pay", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const payroll = await prisma.payroll.updateMany({
    where: { tenantId: auth.tenantId, payrollId: req.params.payrollId },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });
  await notifySchoolStaff(auth.tenantId, ["FINANCE", "ADMIN", "PRINCIPAL"], {
    title: "Payroll paid",
    message: `Payroll ${req.params.payrollId} has been marked as paid.`,
    type: "payroll.paid",
    priority: "MEDIUM",
    channel: "IN_APP",
    relatedType: "payroll",
    relatedId: req.params.payrollId,
  });
  await logAudit({
    auth,
    action: "payroll.paid",
    entityType: "payroll",
    entityId: req.params.payrollId,
    newValues: payroll,
    ipAddress: req.ip,
  });
  return res.json(payroll);
});

app.post("/finance/mpesa/stk-push", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "PARENT", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    studentId: z.string().optional(),
    phoneNumber: z.string().min(1),
    amount: z.number(),
    feeStructureId: z.string().optional(),
  }).parse(req.body);
  const resolvedStudentId = input.studentId ?? (await prisma.student.findFirst({ where: { tenantId: auth.tenantId }, orderBy: { admittedDate: "asc" } }))?.studentId;
  if (!resolvedStudentId) {
    return res.status(400).json({ error: "studentId is required" });
  }
  const referenceCode = `PI-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const paymentIntent = await prisma.paymentIntent.create({
    data: {
      tenantId: auth.tenantId,
      studentId: resolvedStudentId,
      feeStructureId: input.feeStructureId,
      amount: input.amount,
      currency: "KES",
      paymentMethod: "MPESA",
      provider: "M-PESA",
      status: "PENDING",
      referenceCode,
      phoneNumber: input.phoneNumber,
      metadata: { requestedBy: auth.userId ?? auth.platformUserId ?? null, feeStructureId: input.feeStructureId ?? null },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const request = await prisma.mpesaRequest.create({
    data: {
      tenantId: auth.tenantId,
      paymentIntentId: paymentIntent.paymentIntentId,
      merchantRequestId: `MR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      checkoutRequestId: `ws_CO_${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      phoneNumber: input.phoneNumber,
      amount: input.amount,
      payload: { feeStructureId: input.feeStructureId ?? null, requestedBy: auth.userId ?? auth.platformUserId ?? null },
    },
  });
  const tx = await prisma.mpesaTransaction.create({
    data: {
      tenantId: auth.tenantId,
      studentId: resolvedStudentId,
      phoneNumber: input.phoneNumber,
      amount: input.amount,
      status: "PENDING",
      rawPayload: JSON.stringify({ feeStructureId: input.feeStructureId, requestedBy: auth.userId ?? auth.platformUserId, paymentIntentId: paymentIntent.paymentIntentId, checkoutRequestId: request.checkoutRequestId }),
    },
  });
  await recordSystemEvent(auth.tenantId, "payment.initiated", {
    paymentIntentId: paymentIntent.paymentIntentId,
    checkoutRequestId: request.checkoutRequestId,
    amount: input.amount,
    phoneNumber: input.phoneNumber,
  });
  if (resolvedStudentId) {
    await notifyLinkedParents(auth.tenantId, resolvedStudentId, {
      title: "M-Pesa STK push sent",
      message: `A payment prompt for KES ${input.amount.toLocaleString()} has been sent to ${input.phoneNumber}.`,
      type: "mpesa.stk.sent",
      priority: "MEDIUM",
      channel: "SMS",
      relatedType: "mpesa_transaction",
      relatedId: tx.transactionId,
    });
  }
  await logAudit({
    auth,
    action: "mpesa.stk.push",
    entityType: "mpesa_transaction",
    entityId: tx.transactionId,
    newValues: input,
    ipAddress: req.ip,
  });
  return res.status(201).json({ success: true, transaction: tx, paymentIntent, request });
});

app.post("/finance/mpesa/webhook", async (req, res) => {
  const payload = req.body ?? {};
  const tenantId = String(payload.tenantId ?? "");
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId missing" });
  }
  const stkCallback = payload.Body?.stkCallback ?? payload.stkCallback ?? payload;
  const checkoutRequestId = String(stkCallback.CheckoutRequestID ?? payload.checkoutRequestId ?? "");
  const resultCode = Number(stkCallback.ResultCode ?? payload.resultCode ?? 0);
  const resultDesc = String(stkCallback.ResultDesc ?? payload.resultDesc ?? "");
  const callbackItems = stkCallback.CallbackMetadata?.Item ?? [];
  const mpesaCode = String(payload.mpesaCode ?? callbackItems.find((item: { Name?: string; Value?: unknown }) => item.Name === "MpesaReceiptNumber")?.Value ?? "");
  const amount = Number(payload.amount ?? callbackItems.find((item: { Name?: string; Value?: unknown }) => item.Name === "Amount")?.Value ?? 0);
  const phoneNumber = String(payload.phoneNumber ?? callbackItems.find((item: { Name?: string; Value?: unknown }) => item.Name === "PhoneNumber")?.Value ?? "");
  const studentId = String(payload.studentId ?? "");
  const feeStructureId = String(payload.feeStructureId ?? "");

  try {
    const callback = await prisma.mpesaCallback.create({
      data: {
        tenantId,
        mpesaReceiptNumber: mpesaCode || null,
        checkoutRequestId: checkoutRequestId || null,
        callbackPayload: payload,
        resultCode,
        resultDesc,
      },
    });

    const request = checkoutRequestId
      ? await prisma.mpesaRequest.findUnique({ where: { checkoutRequestId } })
      : null;
    const paymentIntent = request?.paymentIntentId
      ? await prisma.paymentIntent.findUnique({ where: { paymentIntentId: request.paymentIntentId } })
      : await prisma.paymentIntent.findFirst({
          where: {
            tenantId,
            ...(payload.referenceCode ? { referenceCode: String(payload.referenceCode) } : {}),
          },
          orderBy: { createdAt: "desc" },
        });

    if (paymentIntent) {
      await prisma.mpesaCallback.update({
        where: { callbackId: callback.callbackId },
        data: { paymentIntentId: paymentIntent.paymentIntentId },
      });
      await prisma.paymentIntent.update({
        where: { paymentIntentId: paymentIntent.paymentIntentId },
        data: {
          status: resultCode === 0 ? "SUCCESS" : "FAILED",
          providerReference: mpesaCode || paymentIntent.providerReference,
          metadata: {
            ...(typeof paymentIntent.metadata === "object" && paymentIntent.metadata ? (paymentIntent.metadata as Record<string, unknown>) : {}),
            callbackResultCode: resultCode,
            callbackResultDesc: resultDesc,
          },
        },
      });
    }

    const existingPayment = mpesaCode
      ? await prisma.feePayment.findFirst({ where: { tenantId, mpesaCode } })
      : null;

    let payment = existingPayment;
    if (!payment && resultCode === 0 && studentId && feeStructureId) {
      const recordedByUser = await prisma.user.findFirst({
        where: { tenantId, role: { in: ["FINANCE", "ADMIN", "PRINCIPAL"] } },
        orderBy: { createdAt: "asc" },
      });
      payment = await prisma.feePayment.create({
        data: {
          tenantId,
          studentId,
          feeStructureId,
          amountPaid: amount,
          paymentMethod: "MPESA",
          mpesaCode: mpesaCode || null,
          receiptNumber: `RCP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          recordedBy: recordedByUser?.userId ?? studentId,
          notes: payload.notes ?? "Auto-confirmed from M-Pesa webhook",
        },
      });
      if (paymentIntent) {
        await prisma.paymentIntent.update({
          where: { paymentIntentId: paymentIntent.paymentIntentId },
          data: { feePaymentId: payment.paymentId, status: "SUCCESS", paymentMethod: "MPESA", providerReference: mpesaCode || undefined },
        });
        await prisma.paymentAllocation.create({
          data: {
            tenantId,
            paymentIntentId: paymentIntent.paymentIntentId,
            feeStructureId,
            amount,
          },
        });
      }
      await prisma.receipt.create({
        data: {
          tenantId,
          paymentId: payment.paymentId,
          receiptNumber: payment.receiptNumber,
          verificationCode: `VER-${payment.receiptNumber.slice(-6)}`,
        },
      });
      await recordSystemEvent(tenantId, "fees.payment.completed", {
        studentId,
        feeStructureId,
        amount,
        mpesaCode,
        paymentId: payment.paymentId,
        paymentIntentId: paymentIntent?.paymentIntentId ?? null,
      });
      await notifyLinkedParents(tenantId, studentId, {
        title: "Payment received",
        message: `We received KES ${amount.toLocaleString()} via M-Pesa.`,
        type: "fee.paid",
        priority: "HIGH",
        channel: "SMS",
        relatedType: "fee_payment",
        relatedId: payment.paymentId,
      });
      await notifySchoolStaff(tenantId, ["FINANCE", "ADMIN", "PRINCIPAL"], {
        title: "M-Pesa payment confirmed",
        message: `Payment ${payment.receiptNumber} has been confirmed.`,
        type: "fee.paid",
        priority: "HIGH",
        channel: "IN_APP",
        relatedType: "fee_payment",
        relatedId: payment.paymentId,
      });
    }

    await prisma.mpesaTransaction.create({
      data: {
        tenantId,
        studentId: studentId || null,
        phoneNumber: phoneNumber || "",
        amount,
        mpesaCode: mpesaCode || null,
        status: resultCode === 0 ? "CONFIRMED" : "FAILED",
        rawPayload: JSON.stringify(payload),
      },
    });

    return res.json({ success: true, transactionId: callback.callbackId, duplicate: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "duplicate callback";
    if (message.toLowerCase().includes("unique")) {
      return res.json({ success: true, duplicate: true });
    }
    return res.status(400).json({ error: message });
  }
});

app.put("/school/classes/:classId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    tierId: z.string().optional(),
    yearId: z.string().optional(),
    grade: z.string().optional(),
    stream: z.string().optional(),
    className: z.string().optional(),
    capacity: z.number().int().positive().optional(),
  }).parse(req.body);
  const updated = await prisma.class.updateMany({
    where: { tenantId: auth.tenantId, classId: req.params.classId },
    data: input,
  });
  return res.json(updated);
});

app.put("/school/students/:studentId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    classId: z.string().optional(),
    currentGrade: z.string().optional(),
    promotionStatus: z.enum(["ACTIVE", "PROMOTED", "HELD", "TRANSFERRED", "GRADUATED"]).optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const updated = await prisma.student.updateMany({
    where: { tenantId: auth.tenantId, studentId: req.params.studentId },
    data: input,
  });
  return res.json(updated);
});

app.put("/school/staff/:staffId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    specialization: z.string().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);
  const updated = await prisma.staff.updateMany({
    where: { tenantId: auth.tenantId, staffId: req.params.staffId },
    data: input,
  });
  return res.json(updated);
});

app.put("/finance/fee-structures/:feeStructureId", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN"]);
  if (!auth || !auth.tenantId) return;
  const input = z.object({
    yearId: z.string().optional(),
    tierId: z.string().optional(),
    termId: z.string().optional(),
    feeType: z.string().optional(),
    amountKes: z.number().optional(),
    isMandatory: z.boolean().optional(),
    dueDate: z.string().optional(),
  }).parse(req.body);
  const updated = await prisma.feeStructure.updateMany({
    where: { tenantId: auth.tenantId, feeStructureId: req.params.feeStructureId },
    data: {
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
  });
  return res.json(updated);
});

// POST /finance/payments/:paymentId/receipt — generate/resend receipt
app.post("/finance/payments/:paymentId/receipt", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;

  const payment = await prisma.feePayment.findFirst({
    where: { tenantId: auth.tenantId, paymentId: req.params.paymentId },
    include: {
      student: { include: { user: true } },
      feeStructure: true,
    },
  });
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  // Try to find or create a receipt record
  let receipt = await prisma.receipt.findFirst({
    where: { tenantId: auth.tenantId, paymentId: payment.paymentId },
  });
  if (!receipt) {
    receipt = await prisma.receipt.create({
      data: {
        tenantId: auth.tenantId,
        paymentId: payment.paymentId,
        receiptNumber: payment.receiptNumber,
        verificationCode: `VER-${payment.receiptNumber.slice(-6)}`,
      },
    });
  }

  // Optionally send email receipt via SendGrid
  const parentLinks = await prisma.parentStudentLink.findMany({
    where: { tenantId: auth.tenantId, studentId: payment.studentId },
    include: { parent: { include: { user: true } } },
  });

  for (const link of parentLinks) {
    const parentUser = link.parent.user;
    if (!parentUser?.email) continue;
    try {
      const delivery = await import("./delivery.js");
      await delivery.sendFeeReceiptEmail(
        parentUser.email,
        link.parent.fullName,
        payment.student.fullName,
        payment.amountPaid,
        payment.receiptNumber,
        payment.mpesaCode,
      );
    } catch { /* non-fatal */ }
  }

  await logAudit({
    auth,
    action: "receipt.generated",
    entityType: "payment",
    entityId: payment.paymentId,
    ipAddress: req.ip,
  });

  return res.json({ receipt, payment: { receiptNumber: payment.receiptNumber, amountPaid: payment.amountPaid } });
});

// GET /finance/payment-intents
app.get("/finance/payment-intents", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["FINANCE", "ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;

  const intents = await prisma.paymentIntent.findMany({
    where: { tenantId: auth.tenantId },
    include: { student: { select: { fullName: true, admissionNumber: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.json(
    intents.map((pi) => ({
      paymentIntentId: pi.paymentIntentId,
      referenceCode: pi.referenceCode,
      amount: pi.amount,
      paymentMethod: pi.paymentMethod,
      status: pi.status,
      phoneNumber: pi.phoneNumber,
      studentName: pi.student?.fullName ?? null,
      createdAt: pi.createdAt,
    })),
  );
});

// ── 2FA ROUTES ───────────────────────────────────────────────────────────────

// POST /auth/2fa/setup — Generate QR code and secret (requires PENDING_2FA_SETUP or valid session)
app.post("/auth/2fa/setup", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const userId = auth.userId;
  if (!userId) return res.status(400).json({ error: "No user ID in token" });

  const user = await prisma.user.findUnique({ where: { userId }, select: { email: true, role: true } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const setup = await generate2FASetup(user.email);

  // Save secret (not yet enabled until verified)
  await prisma.twoFactorSetup.upsert({
    where: { userId },
    update: { secret: setup.secret, isEnabled: false },
    create: { userId, secret: setup.secret, isEnabled: false },
  });

  return res.json({ qrCode: setup.qrDataUrl, secret: setup.secret, otpauthUrl: setup.otpauthUrl });
});

// POST /auth/2fa/verify-setup — Verify and enable 2FA, returns recovery codes
app.post("/auth/2fa/verify-setup", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const userId = auth.userId;
  if (!userId) return res.status(400).json({ error: "No user ID" });

  const input = z.object({ code: z.string().min(6).max(6) }).parse(req.body);

  const setup = await prisma.twoFactorSetup.findFirst({ where: { userId } });
  if (!setup) return res.status(404).json({ error: "2FA setup not started" });

  const valid = verifyTOTP(setup.secret, input.code);
  if (!valid) return res.status(400).json({ error: "Invalid verification code. Please try again." });

  await prisma.twoFactorSetup.update({
    where: { twoFaId: setup.twoFaId },
    data: { isEnabled: true, setupCompletedAt: new Date() },
  });

  // Generate recovery codes
  const codes = await generateRecoveryCodes();
  const plainCodes = await saveRecoveryCodes(codes, { userId });

  await logAudit({ auth, action: "2fa.enabled", entityType: "user", entityId: userId, ipAddress: req.ip });

  // Now issue full access token
  const user = await prisma.user.findUnique({
    where: { userId },
    include: { tenant: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = signToken({
    type: "school", userId: user.userId, tenantId: user.tenantId, role: user.role,
    fullName: user.fullName ?? "", email: user.email,
    schoolName: user.tenant.schoolName, subdomain: user.tenant.subdomain,
  });

  return res.json({
    ok: true,
    recoveryCodes: plainCodes,
    token,
    user: {
      userId: user.userId,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
    },
    tenant: {
      tenantId: user.tenantId,
      schoolName: user.tenant.schoolName,
      subdomain: user.tenant.subdomain,
    },
  });
});

// POST /auth/2fa/login — Verify TOTP code after password login (step 2)
app.post("/auth/2fa/login", async (req, res) => {
  const input = z.object({
    temporaryToken: z.string().min(1),
    code: z.string().min(6).max(8),
    trustDevice: z.boolean().optional(),
  }).parse(req.body);

  let payload: ReturnType<typeof verifyToken> | null = null;
  try {
    payload = verifyToken(input.temporaryToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired temporary token" });
  }

  const userId = payload?.userId;
  if (!userId || (payload.role !== "PENDING_2FA" && payload.role !== "PENDING_2FA_SETUP")) {
    return res.status(401).json({ error: "Token not valid for 2FA step" });
  }

  const secret = await get2FASecret({ userId });
  if (!secret) return res.status(400).json({ error: "2FA not set up for this account" });

  // Try TOTP first, then recovery code
  let valid = verifyTOTP(secret, input.code);
  if (!valid && input.code.includes("-")) {
    valid = await verifyRecoveryCode(input.code, { userId });
  }

  if (!valid) {
    const auth = { type: "school" as const, userId, tenantId: payload.tenantId ?? "", role: "ADMIN" };
    await logAudit({ auth, action: "2fa.login_failed", entityType: "user", entityId: userId, ipAddress: req.ip });
    return res.status(401).json({ error: "Invalid 2FA code. Please try again." });
  }

  const user = await prisma.user.findUnique({ where: { userId }, include: { tenant: true } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = signToken({
    type: "school", userId: user.userId, tenantId: user.tenantId, role: user.role,
    fullName: user.fullName ?? "", email: user.email,
    schoolName: user.tenant.schoolName, subdomain: user.tenant.subdomain,
  });

  await prisma.user.update({ where: { userId }, data: { lastLoginAt: new Date() } });

  let trustedDeviceToken: string | undefined;
  if (input.trustDevice) {
    trustedDeviceToken = await issueTrustedDevice({ userId, userAgent: req.headers["user-agent"] });
  }

  const auth = { type: "school" as const, userId, tenantId: user.tenantId, role: user.role };
  await logAudit({ auth, action: "2fa.login_success", entityType: "user", entityId: userId, ipAddress: req.ip });

  return res.json({
    token,
    user: { userId: user.userId, role: user.role, fullName: user.fullName, email: user.email },
    tenant: { tenantId: user.tenantId, schoolName: user.tenant.schoolName, subdomain: user.tenant.subdomain },
    trustedDeviceToken,
  });
});

// GET /auth/2fa/status — Check 2FA status for current user
app.get("/auth/2fa/status", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const userId = auth.userId;
  if (!userId) return res.status(400).json({ error: "No user ID" });

  const setup = await prisma.twoFactorSetup.findFirst({ where: { userId } });
  const recoveryCodes = await prisma.twoFactorRecoveryCode.count({ where: { userId, usedAt: null } });

  return res.json({
    isEnabled: setup?.isEnabled ?? false,
    setupCompleted: !!setup?.setupCompletedAt,
    remainingRecoveryCodes: recoveryCodes,
  });
});

// POST /auth/2fa/disable — Disable 2FA (requires current password + current TOTP)
app.post("/auth/2fa/disable", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const userId = auth.userId;
  if (!userId) return res.status(400).json({ error: "No user ID" });

  const input = z.object({ password: z.string().min(1), code: z.string().min(6) }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!(await comparePassword(input.password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const secret = await get2FASecret({ userId });
  if (!secret || !verifyTOTP(secret, input.code)) {
    return res.status(401).json({ error: "Invalid 2FA code" });
  }

  await prisma.twoFactorSetup.updateMany({ where: { userId }, data: { isEnabled: false, secret: "" } });
  await logAudit({ auth, action: "2fa.disabled", entityType: "user", entityId: userId, ipAddress: req.ip });

  return res.json({ ok: true });
});

// ── INVITATION ROUTES ─────────────────────────────────────────────────────

// POST /admin/invitations — Create and send invitation
app.post("/admin/invitations", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId || !auth.userId) return;

  const input = z.object({
    email: z.string().email(),
    fullName: z.string().min(2),
    role: z.enum(["PRINCIPAL", "FINANCE", "TEACHER", "PARENT", "STUDENT"]),
    additionalData: z.record(z.unknown()).optional(),
  }).parse(req.body);

  // Prevent duplicate active users
  const existing = await prisma.user.findFirst({ where: { tenantId: auth.tenantId, email: input.email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "A user with this email already exists in this school." });

  const { invitationId, token } = await createInvitation({
    tenantId: auth.tenantId,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    createdBy: auth.userId,
    additionalData: input.additionalData,
  });

  await logAudit({ auth, action: "invitation.created", entityType: "invitation", entityId: invitationId, ipAddress: req.ip });

  return res.status(201).json({ invitationId, message: `Invitation sent to ${input.email}` });
});

// GET /admin/invitations — List all invitations for this school
app.get("/admin/invitations", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN", "PRINCIPAL"]);
  if (!auth || !auth.tenantId) return;

  const invitations = await prisma.invitation.findMany({
    where: { tenantId: auth.tenantId },
    include: { creator: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res.json(invitations.map((inv) => ({
    invitationId: inv.invitationId,
    email: inv.email,
    fullName: inv.fullName,
    role: inv.role,
    isUsed: inv.isUsed,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    usedAt: inv.usedAt,
    createdBy: inv.creator?.fullName ?? inv.creator?.email ?? "Unknown",
    status: inv.isUsed ? "ACCEPTED" : inv.expiresAt < new Date() ? "EXPIRED" : "PENDING",
  })));
});

// GET /invite/:token — Validate invitation token (public)
app.get("/invite/:token", async (req, res) => {
  const result = await validateInvitationToken(req.params.token);
  if (!result.valid) {
    return res.status(400).json({ valid: false, reason: result.reason });
  }
  return res.json({ valid: true, invitation: result.invitation });
});

// POST /invite/:token/accept — Accept invitation and set password
app.post("/invite/:token/accept", async (req, res) => {
  const input = z.object({ password: z.string().min(8) }).parse(req.body);

  const validation = await validateInvitationToken(req.params.token);
  if (!validation.valid) {
    return res.status(400).json({ error: `Invitation ${validation.reason?.toLowerCase().replace("_", " ")}` });
  }

  const user = await acceptInvitation(req.params.token, input.password);
  if (!user) return res.status(400).json({ error: "Failed to activate account" });

  await logAudit({
    auth: { type: "school", userId: user.userId, tenantId: user.tenantId, role: user.role },
    action: "invitation.accepted",
    entityType: "user",
    entityId: user.userId,
    ipAddress: req.ip,
  });

  return res.json({ ok: true, message: "Account activated. You can now log in.", email: user.email });
});

// POST /admin/invitations/:invitationId/resend — Resend invitation
app.post("/admin/invitations/:invitationId/resend", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res, ["ADMIN"]);
  if (!auth || !auth.tenantId || !auth.userId) return;

  const inv = await prisma.invitation.findFirst({
    where: { tenantId: auth.tenantId, invitationId: req.params.invitationId },
  });
  if (!inv) return res.status(404).json({ error: "Invitation not found" });
  if (inv.isUsed) return res.status(400).json({ error: "This invitation has already been accepted" });

  const { invitationId, token } = await createInvitation({
    tenantId: auth.tenantId,
    email: inv.email,
    fullName: inv.fullName,
    role: inv.role,
    createdBy: auth.userId,
  });

  return res.json({ invitationId, message: `Invitation resent to ${inv.email}` });
});


// ── BOT CHAT ENDPOINT ─────────────────────────────────────────────────────
app.post("/bot/chat", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth || !auth.tenantId || !auth.userId) return;

  const input = z.object({ message: z.string().min(1).max(500) }).parse(req.body);
  const msg = input.message.toLowerCase().trim();
  const role = auth.role ?? "UNKNOWN";
  const tenantId = auth.tenantId;
  const userId = auth.userId;

  // ── Intent detection ──────────────────────────────────────────────────
  const intent = (() => {
    if (/fee|payment|balance|receipt|mpesa|paid|owe|outstanding/i.test(msg)) return "FEES";
    if (/attendance|absent|present|missed|days/i.test(msg)) return "ATTENDANCE";
    if (/result|mark|grade|score|cbc|performance|subject/i.test(msg)) return "RESULTS";
    if (/assignment|homework|task|due|submit/i.test(msg)) return "ASSIGNMENTS";
    if (/timetable|schedule|class|lesson|period/i.test(msg)) return "TIMETABLE";
    if (/student|enroll|admission|learner/i.test(msg)) return "STUDENTS";
    if (/staff|teacher|employee|payroll|salary/i.test(msg)) return "STAFF";
    if (/expense|budget|finance|revenue|income|report/i.test(msg)) return "FINANCE";
    if (/notif|alert|message|chat/i.test(msg)) return "NOTIFICATIONS";
    if (/help|what can|how do|guide|support/i.test(msg)) return "HELP";
    return "GENERAL";
  })();

  // ── RBAC permission map ───────────────────────────────────────────────
  const permissions: Record<string, string[]> = {
    ADMIN:     ["FEES","ATTENDANCE","RESULTS","ASSIGNMENTS","TIMETABLE","STUDENTS","STAFF","FINANCE","NOTIFICATIONS","HELP","GENERAL"],
    PRINCIPAL: ["ATTENDANCE","RESULTS","ASSIGNMENTS","TIMETABLE","STUDENTS","STAFF","FINANCE","NOTIFICATIONS","HELP","GENERAL"],
    TEACHER:   ["ATTENDANCE","RESULTS","ASSIGNMENTS","TIMETABLE","STUDENTS","HELP","GENERAL"],
    STUDENT:   ["RESULTS","ASSIGNMENTS","ATTENDANCE","TIMETABLE","HELP","GENERAL"],
    PARENT:    ["FEES","RESULTS","ATTENDANCE","NOTIFICATIONS","HELP","GENERAL"],
    FINANCE:   ["FEES","FINANCE","STUDENTS","NOTIFICATIONS","HELP","GENERAL"],
    SUPER_ADMIN: ["FEES","ATTENDANCE","RESULTS","ASSIGNMENTS","TIMETABLE","STUDENTS","STAFF","FINANCE","NOTIFICATIONS","HELP","GENERAL"],
    SUPPORT:   ["HELP","GENERAL"],
    SALES:     ["HELP","GENERAL"],
    BILLING:   ["FEES","FINANCE","STUDENTS","NOTIFICATIONS","HELP","GENERAL"],
  };

  if (!(permissions[role] ?? []).includes(intent)) {
    return res.json({ reply: `❌ Sorry, you don't have permission to access ${intent.toLowerCase()} information.` });
  }

  // ── Data fetchers ─────────────────────────────────────────────────────
  try {
    let reply = "";
    if (intent === "FEES") {
      if (role === "PARENT") {
        const parent = await prisma.parent.findFirst({ where: { tenantId, userId } });
        if (!parent) return res.json({ reply: "I couldn't find your parent profile." });
        const links = await prisma.parentStudentLink.findMany({
          where: { tenantId, parentId: parent.parentId },
          include: { student: { select: { fullName: true, admissionNumber: true, tierId: true } } },
        });
        if (!links.length) return res.json({ reply: "No children linked to your account yet." });
        const lines = await Promise.all(links.map(async (l) => {
          const paid = await prisma.feePayment.aggregate({ where: { tenantId, studentId: l.studentId }, _sum: { amountPaid: true } });
          const feeStructures = await prisma.feeStructure.findMany({ where: { tenantId, tierId: l.student.tierId, isMandatory: true }, select: { amountKes: true } });
          const total = feeStructures.reduce((s, f) => s + f.amountKes, 0);
          const paidAmt = paid._sum.amountPaid ?? 0;
          const balance = Math.max(0, total - paidAmt);
          return `• ${l.student.fullName} (${l.student.admissionNumber}): Paid KSh ${paidAmt.toLocaleString()} / Total KSh ${total.toLocaleString()} — Balance: KSh ${balance.toLocaleString()}${balance === 0 ? " ✅" : " ⚠️"}`;
        }));
        reply = `💳 Fee Summary for your child(ren):\n\n${lines.join("\n")}\n\nYou can pay via M-Pesa on the Fee Payments page.`;
      } else {
        const currentYear = await prisma.academicYear.findFirst({ where: { tenantId, isCurrent: true } });
        const totalCollected = await prisma.feePayment.aggregate({ where: { tenantId }, _sum: { amountPaid: true } });
        const receiptsCount = await prisma.feePayment.count({ where: { tenantId } });
        reply = `💰 Fee Collection Summary:\n\n• Total collected: KSh ${(totalCollected._sum.amountPaid ?? 0).toLocaleString()}\n• Total receipts: ${receiptsCount}\n• Academic Year: ${currentYear?.yearLabel ?? "N/A"}\n\nView detailed breakdown in Finance → Payments.`;
      }
    } else if (intent === "ATTENDANCE") {
      if (role === "PARENT") {
        const parent = await prisma.parent.findFirst({ where: { tenantId, userId } });
        if (!parent) return res.json({ reply: "I couldn't find your parent profile." });
        const links = await prisma.parentStudentLink.findMany({
          where: { tenantId, parentId: parent.parentId, canViewResults: true },
          include: { student: { select: { fullName: true } } },
        });
        const lines = await Promise.all(links.map(async (l) => {
          const total = await prisma.attendance.count({ where: { tenantId, studentId: l.studentId } });
          const present = await prisma.attendance.count({ where: { tenantId, studentId: l.studentId, status: "PRESENT" } });
          const pct = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";
          return `• ${l.student.fullName}: ${pct}% (${total - present} absences)`;
        }));
        reply = `📅 Attendance Report:\n\n${lines.join("\n") || "No attendance records yet."}`;
      } else if (role === "TEACHER") {
        const staff = await prisma.staff.findFirst({ where: { tenantId, userId } });
        if (!staff) return res.json({ reply: "I couldn't find your staff profile." });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecords = await prisma.attendance.count({ where: { tenantId, markedBy: userId, attendanceDate: { gte: today } } });
        reply = `✅ Attendance today: ${todayRecords} records marked.\nGo to Teacher → Attendance to mark today's class.`;
      } else {
        const total = await prisma.attendance.count({ where: { tenantId } });
        const present = await prisma.attendance.count({ where: { tenantId, status: "PRESENT" } });
        const absent = await prisma.attendance.count({ where: { tenantId, status: "ABSENT" } });
        const pct = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";
        reply = `📅 School-wide Attendance:\n\n• Overall rate: ${pct}%\n• Present records: ${present}\n• Absent records: ${absent}\n• Total records: ${total}`;
      }
    } else if (intent === "RESULTS") {
      if (role === "STUDENT") {
        const student = await prisma.student.findFirst({ where: { tenantId, userId } });
        if (!student) return res.json({ reply: "I couldn't find your student profile." });
        const marks = await prisma.mark.findMany({
          where: { tenantId, studentId: student.studentId, isPublished: true },
          include: { subject: { select: { subjectName: true } } },
          orderBy: { publishedAt: "desc" },
          take: 8,
        });
        if (!marks.length) return res.json({ reply: "No published results found yet. Check back after assessments." });
        const lines = marks.map((m) => `• ${m.subject.subjectName}: ${m.rawScore}% — ${m.cbcGrade}`);
        reply = `📊 Your Recent Results:\n\n${lines.join("\n")}\n\nGrade key: EE=Exceeds · ME=Meets · AE=Approaching · BE=Below Expectations`;
      } else if (role === "PARENT") {
        const parent = await prisma.parent.findFirst({ where: { tenantId, userId } });
        if (!parent) return res.json({ reply: "Parent profile not found." });
        const links = await prisma.parentStudentLink.findMany({
          where: { tenantId, parentId: parent.parentId, canViewResults: true },
          include: { student: true },
        });
        const lines = await Promise.all(links.map(async (l) => {
          const marks = await prisma.mark.findMany({
            where: { tenantId, studentId: l.studentId, isPublished: true },
            include: { subject: { select: { subjectName: true } } },
            orderBy: { publishedAt: "desc" },
            take: 3,
          });
          const summary = marks.map((m) => `${m.subject.subjectName}: ${m.cbcGrade}`).join(", ");
          return `• ${l.student.fullName}: ${summary || "No results yet"}`;
        }));
        reply = `📊 Your Children's Results:\n\n${lines.join("\n")}`;
      } else {
        const total = await prisma.mark.count({ where: { tenantId } });
        const published = await prisma.mark.count({ where: { tenantId, isPublished: true } });
        reply = `📊 Results Overview:\n\n• Total mark entries: ${total}\n• Published: ${published}\n• Pending: ${total - published}\n\nView details in Teacher → Mark Entry.`;
      }
    } else if (intent === "ASSIGNMENTS") {
      if (role === "STUDENT") {
        const student = await prisma.student.findFirst({ where: { tenantId, userId }, select: { classId: true } });
        if (!student) return res.json({ reply: "Student profile not found." });
        const assignments = await prisma.assignment.findMany({
          where: { tenantId, classId: student.classId, isPublished: true, dueDate: { gte: new Date() } },
          include: { subject: { select: { subjectName: true } } },
          orderBy: { dueDate: "asc" },
          take: 5,
        });
        if (!assignments.length) return res.json({ reply: "🎉 No pending assignments at the moment!" });
        const lines = assignments.map((a) => `• ${a.title} (${a.subject?.subjectName ?? "—"}) — Due: ${new Date(a.dueDate).toLocaleDateString("en-KE")}`);
        reply = `📌 Your Upcoming Assignments:\n\n${lines.join("\n")}`;
      } else {
        const now = new Date();
        const upcoming = await prisma.assignment.count({ where: { tenantId, dueDate: { gte: now } } });
        const overdue = await prisma.assignment.count({ where: { tenantId, dueDate: { lt: now } } });
        reply = `📝 Assignments Summary:\n\n• Upcoming: ${upcoming}\n• Past due: ${overdue}\n\nManage in Teacher → Assignments.`;
      }
    } else if (intent === "TIMETABLE") {
      reply = `📅 Your timetable is available in the Timetable section of your dashboard.\nGo to School → Timetable to view class schedules for all grades.`;
    } else if (intent === "STUDENTS") {
      const total = await prisma.student.count({ where: { tenantId } });
      const active = await prisma.student.count({ where: { tenantId, promotionStatus: "ACTIVE" } });
      const byGender = await prisma.student.groupBy({ by: ["gender"], where: { tenantId }, _count: true });
      const genderStr = byGender.map((g) => `${g.gender}: ${g._count}`).join(", ");
      reply = `🎓 Student Summary:\n\n• Total students: ${total}\n• Active: ${active}\n• By gender: ${genderStr || "N/A"}\n\nView full list in Admin → Students.`;
    } else if (intent === "STAFF") {
      const total = await prisma.staff.count({ where: { tenantId } });
      const teachers = await prisma.staff.count({ where: { tenantId, staffType: "TEACHING" } });
      const support = await prisma.staff.count({ where: { tenantId, staffType: "SUPPORT" } });
      reply = `👨‍🏫 Staff Summary:\n\n• Total staff: ${total}\n• Teaching staff: ${teachers}\n• Support staff: ${support}\n\nManage in Admin → Staff.`;
    } else if (intent === "FINANCE") {
      const totalPaid = await prisma.feePayment.aggregate({ where: { tenantId }, _sum: { amountPaid: true } });
      const pendingExp = await prisma.expense.count({ where: { tenantId, status: "PENDING" } });
      const totalExp = await prisma.expense.aggregate({ where: { tenantId, status: "APPROVED" }, _sum: { amountKes: true } });
      reply = `💰 Financial Summary:\n\n• Total fees collected: KSh ${(totalPaid._sum.amountPaid ?? 0).toLocaleString()}\n• Approved expenses: KSh ${(totalExp._sum.amountKes ?? 0).toLocaleString()}\n• Pending expense approvals: ${pendingExp}\n\nDetailed reports available in Finance dashboard.`;
    } else if (intent === "NOTIFICATIONS") {
      const unread = await prisma.notification.count({ where: { tenantId, recipientUserId: userId, isRead: false } });
      reply = `🔔 You have ${unread} unread notification${unread !== 1 ? "s" : ""}.\nVisit Notifications to view them all.`;
    } else if (intent === "HELP") {
      const helpMap: Record<string, string> = {
        ADMIN: "I can help you with:\n• 🎓 Student & staff counts\n• 💰 Fee collection summaries\n• 📅 Attendance overview\n• 📊 Academic performance\n• 💸 Financial reports",
        PRINCIPAL: "I can help you with:\n• 📊 Academic performance overview\n• 📅 Attendance summaries\n• 📝 Assignment status\n• 👨‍🏫 Staff information",
        TEACHER: "I can help you with:\n• 📅 Attendance marking status\n• 📊 Student results\n• 📝 Assignment due dates\n• 🎓 Class information",
        STUDENT: "I can help you with:\n• 📊 Your results & grades\n• 📌 Upcoming assignments\n• 📅 Your attendance record\n• 📅 Timetable",
        PARENT: "I can help you with:\n• 💳 Fee balance & payment status\n• 📊 Your child's results\n• 📅 Attendance report\n• 📧 Contact the school",
        FINANCE: "I can help you with:\n• 💰 Fee collection totals\n• 📊 Financial summaries\n• 💸 Expense status\n• 🎓 Student fee records",
      };
      reply = `🤖 CBC Swift Bot — ${role} Assistant\n\n${helpMap[role] ?? "I can answer questions about fees, attendance, results, assignments, and more."}\n\nJust type your question!`;
    } else {
      const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"];
      if (greetings.some((g) => msg.startsWith(g))) {
        reply = `Hello! 👋 How can I help you today? Try asking about fees, attendance, results, or assignments.`;
      } else {
        reply = `I'm not sure how to help with that. Try asking about:\n• Fee balances\n• Attendance records\n• Academic results\n• Upcoming assignments\n• Timetable\n\nOr type "help" to see what I can do.`;
      }
    }

    return res.json({ reply });

  } catch (err) {
    console.error("Bot error:", err);
    return res.json({ reply: "⚠️ Something went wrong on my end. Please try again shortly." });
  }
});

// POST /auth/forgot-password — send password reset email via SendGrid
app.post("/auth/forgot-password", async (req, res) => {
  const input = z.object({ email: z.string().email(), subdomain: z.string().optional() }).parse(req.body);

  let user = null;
  let baseUrl = env.webOrigin;

  if (input.subdomain) {
    const tenant = await prisma.tenant.findUnique({ where: { subdomain: input.subdomain.toLowerCase() } });
    if (tenant) {
      user = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.tenantId, email: input.email } },
      });
    }
  } else {
    user = await prisma.platformUser.findUnique({ where: { email: input.email } });
  }

  // Always return 200 to prevent email enumeration
  if (!user) return res.json({ ok: true });

  const resetToken = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const expiresAt = new Date(Date.now() + 60 * 60_000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      email: input.email,
      expiresAt,
    },
  }).catch(() => null); // table may not exist in all migrations; non-fatal

  try {
    const delivery = await import("./delivery.js");
    const name = (user as { fullName?: string }).fullName ?? input.email;
    await delivery.sendPasswordResetEmail(input.email, name, resetToken, baseUrl);
  } catch (e) {
    console.warn("Failed to send reset email:", e);
  }

  return res.json({ ok: true });
});

// POST /auth/change-password — change password with old password verify
app.post("/auth/change-password", async (req, res) => {
  const auth = await requireAuth(req as AuthRequest, res);
  if (!auth) return;
  const input = z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }).parse(req.body);

  // Handle both HQ and school users
  if (auth.type === "hq" && auth.platformUserId) {
    const pu = await prisma.platformUser.findUnique({ where: { platformUserId: auth.platformUserId } });
    if (!pu) return res.status(404).json({ error: "User not found" });
    if (!(await comparePassword(input.oldPassword, pu.passwordHash))) {
      return res.status(401).json({ error: "Old password incorrect" });
    }
    const newHash = await hashPassword(input.newPassword);
    await prisma.platformUser.update({ where: { platformUserId: auth.platformUserId }, data: { passwordHash: newHash } });
    await logAudit({ auth, action: "auth.password_changed", entityType: "platformUser", entityId: auth.platformUserId, ipAddress: req.ip });
  } else if (auth.userId) {
    const u = await prisma.user.findUnique({ where: { userId: auth.userId } });
    if (!u) return res.status(404).json({ error: "User not found" });
    if (!(await comparePassword(input.oldPassword, u.passwordHash))) {
      return res.status(401).json({ error: "Old password incorrect" });
    }
    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { userId: auth.userId }, data: { passwordHash: newHash } });
    await logAudit({ auth, action: "auth.password_changed", entityType: "user", entityId: auth.userId, ipAddress: req.ip });
  } else {
    return res.status(400).json({ error: "Cannot resolve user" });
  }

  return res.json({ ok: true, message: "Password changed successfully" });
});

httpServer.listen(env.port, () => {
  console.log(`CBCNexus API listening on http://localhost:${env.port}`);
});
