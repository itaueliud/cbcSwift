import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { verifyToken } from "./auth.js";

type ChatRole = "SUPER_ADMIN" | "SUPPORT" | "SALES" | "BILLING" | "ADMIN" | "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT" | "FINANCE";

type ChatActor = {
  type: "hq" | "school";
  tenantId: string | null;
  userId: string | null;
  platformUserId: string | null;
  role: ChatRole;
  fullName: string;
  schoolName?: string;
  tierKey?: string | null;
};

type SocketUser = {
  type: "hq" | "school";
  tenantId?: string | null;
  userId?: string | null;
  platformUserId?: string | null;
  role?: string;
  hqRole?: string;
  fullName: string;
  schoolName?: string;
  subdomain?: string;
};

function actorIdentity(actor: ChatActor) {
  return {
    userId: actor.userId,
    platformUserId: actor.platformUserId,
  };
}

function getRoleScope(role: ChatRole, roomType: string) {
  const allowedByRole: Record<ChatRole, string[]> = {
    SUPER_ADMIN: ["SUPPORT", "ANNOUNCEMENT", "DIRECT"],
    SUPPORT: ["SUPPORT", "ANNOUNCEMENT", "DIRECT"],
    SALES: ["ANNOUNCEMENT", "DIRECT"],
    BILLING: ["FINANCE", "ANNOUNCEMENT", "DIRECT"],
    ADMIN: ["ANNOUNCEMENT", "DIRECT", "GROUP", "DEPARTMENT", "CLASS", "FINANCE", "SUPPORT", "CAREER", "CLUB"],
    PRINCIPAL: ["ANNOUNCEMENT", "DIRECT", "GROUP", "DEPARTMENT", "CLASS", "FINANCE", "SUPPORT", "CAREER", "CLUB"],
    TEACHER: ["ANNOUNCEMENT", "DIRECT", "GROUP", "DEPARTMENT", "CLASS", "CAREER", "CLUB"],
    STUDENT: ["ANNOUNCEMENT", "DIRECT", "GROUP", "CLASS", "CLUB", "CAREER", "AI_ASSISTANT"],
    PARENT: ["ANNOUNCEMENT", "DIRECT", "FINANCE", "SUPPORT"],
    FINANCE: ["ANNOUNCEMENT", "DIRECT", "FINANCE", "SUPPORT"],
  };
  return allowedByRole[role]?.includes(roomType) ?? false;
}

async function resolveActor(token: string): Promise<ChatActor | null> {
  try {
    const auth = verifyToken(token);
    if (auth.type === "hq") {
      return {
        type: "hq",
        tenantId: auth.tenantId ?? null,
        userId: null,
        platformUserId: auth.platformUserId ?? null,
        role: (auth.hqRole ?? "SUPER_ADMIN") as ChatRole,
        fullName: auth.fullName,
      };
    }
    if (!auth.tenantId || !auth.userId) return null;
    const user = await prisma.user.findUnique({
      where: { userId: auth.userId },
      include: { student: true },
    });
    if (!user) return null;
    return {
      type: "school",
      tenantId: auth.tenantId,
      userId: auth.userId,
      platformUserId: null,
      role: user.role as ChatRole,
      fullName: user.fullName ?? auth.fullName,
      schoolName: auth.schoolName,
      tierKey: user.student?.tierId ?? null,
    };
  } catch {
    return null;
  }
}

async function ensureMember(roomId: string, actor: ChatActor) {
  const where = actor.type === "hq"
    ? { roomId, platformUserId: actor.platformUserId ?? undefined }
    : { roomId, userId: actor.userId ?? undefined };
  const member = await prisma.chatRoomMember.findFirst({ where });
  return Boolean(member);
}

async function listRoomsForActor(actor: ChatActor) {
  const memberFilter = actor.type === "hq"
    ? { platformUserId: actor.platformUserId ?? undefined }
    : { userId: actor.userId ?? undefined };
  const memberRooms = await prisma.chatRoomMember.findMany({
    where: actor.type === "hq"
      ? memberFilter
      : {
          tenantId: actor.tenantId ?? undefined,
          ...memberFilter,
        },
    include: { room: true },
    orderBy: { joinedAt: "desc" },
  });

  const rooms = memberRooms.map((member) => member.room);
  const openRooms = actor.type === "hq"
    ? await prisma.chatRoom.findMany({
        where: {
          roomType: { in: ["ANNOUNCEMENT", "SUPPORT"] },
          isArchived: false,
        },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      })
    : actor.tenantId
    ? await prisma.chatRoom.findMany({
        where: {
          tenantId: actor.tenantId,
          isArchived: false,
          roomType: { in: ["ANNOUNCEMENT", "SUPPORT"] },
        },
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      })
    : [];

  const merged = new Map<string, (typeof rooms)[number]>();
  for (const room of [...rooms, ...openRooms]) {
    if (room && (!room.roomType || getRoleScope(actor.role, room.roomType) || room.roomType === "ANNOUNCEMENT")) {
      merged.set(room.roomId, room);
    }
  }
  return Array.from(merged.values());
}

async function createMessageNotifications(
  roomId: string,
  tenantId: string,
  message: { messageId: string; content: string | null; senderName: string; senderUserId: string | null; senderPlatformUserId: string | null; messageType: string; },
) {
  const members = await prisma.chatRoomMember.findMany({ where: { roomId, tenantId } });
  const notifications = members
    .filter((member) => member.userId !== message.senderUserId || member.platformUserId !== message.senderPlatformUserId)
    .map((member) =>
      prisma.notification.create({
        data: {
          tenantId,
          recipientUserId: member.userId ?? null,
          recipientPlatformUserId: member.platformUserId ?? null,
          type: "MESSAGE_RECEIVED",
          title: "New chat message",
          message: `${message.senderName}: ${message.content ?? message.messageType}`,
          priority: "MEDIUM",
          channel: "IN_APP",
          relatedType: "chat_message",
          relatedId: message.messageId,
        },
      }),
    );
  await Promise.all(notifications);
}

async function extractMentions(roomId: string, tenantId: string, messageId: string, content: string) {
  const usernames = Array.from(new Set(content.match(/@([\w.-]+)/g)?.map((token) => token.slice(1)) ?? []));
  if (!usernames.length) return;
  const members = await prisma.chatRoomMember.findMany({ where: { roomId, tenantId } });
  const targets = usernames
    .flatMap((username) => members.filter((member) => member.roleLabel?.toLowerCase() === username.toLowerCase() || member.userId === username || member.platformUserId === username))
    .map((member) => ({
      tenantId,
      messageId,
      mentionedUserId: member.userId ?? null,
      mentionedPlatformUserId: member.platformUserId ?? null,
    }));
  if (targets.length) {
    await prisma.chatMention.createMany({ data: targets as never });
  }
}

async function summarizeRoom(roomId: string, tenantId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { tenantId, roomId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const text = messages
    .map((message) => message.content)
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const keywords = Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter((word) => word.length > 4)
        .slice(0, 8),
    ),
  );
  return {
    summary: messages.length
      ? `Recent focus: ${keywords.length ? keywords.join(", ") : "general discussion"}.`
      : "No messages yet.",
    recentCount: messages.length,
  };
}

export function registerChatSubsystem(app: express.Express, io: SocketIOServer) {
  io.use(async (socket, next) => {
    const token = String(socket.handshake.auth?.token ?? "");
    if (!token) return next(new Error("Unauthorized"));
    const actor = await resolveActor(token);
    if (!actor) return next(new Error("Unauthorized"));
    socket.data.actor = actor;
    return next();
  });

  io.on("connection", (socket) => {
    const actor = socket.data.actor as ChatActor;
    socket.on("room:join", async ({ roomId }) => {
      if (typeof roomId !== "string") return;
      const room = await prisma.chatRoom.findUnique({ where: { roomId } });
      if (!room) return;
      if (actor.type !== "hq" && room.tenantId !== actor.tenantId) return;
      const member = await ensureMember(roomId, actor);
      if (!member && !getRoleScope(actor.role, room.roomType)) return;
      socket.join(roomId);
      await prisma.chatRoomMember.upsert({
        where: {
          roomId_userId_platformUserId: actor.type === "hq"
            ? { roomId, userId: null, platformUserId: actor.platformUserId }
            : { roomId, userId: actor.userId, platformUserId: null },
        },
        update: { lastReadAt: new Date() },
        create: {
          tenantId: room.tenantId,
          roomId,
          userId: actor.type === "hq" ? null : actor.userId,
          platformUserId: actor.type === "hq" ? actor.platformUserId : null,
          roleLabel: actor.role,
          canSend: true,
          canViewHistory: true,
        },
      });
    });

    socket.on("message:send", async (data) => {
      const schema = z.object({
        roomId: z.string().min(1),
        content: z.string().optional(),
        messageType: z.string().optional().default("TEXT"),
        fileUrl: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().int().optional(),
        replyToMessageId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      });
      const input = schema.safeParse(data);
      if (!input.success) return;
      const room = await prisma.chatRoom.findUnique({ where: { roomId: input.data.roomId } });
      if (!room || (actor.type !== "hq" && room.tenantId !== actor.tenantId) || !getRoleScope(actor.role, room.roomType)) return;
      const member = await ensureMember(room.roomId, actor);
      if (!member) return;
      const message = await prisma.chatMessage.create({
        data: {
          tenantId: room.tenantId,
          roomId: room.roomId,
          senderUserId: actor.userId,
          senderPlatformUserId: actor.platformUserId,
          messageType: input.data.messageType ?? "TEXT",
          content: input.data.content ?? null,
          fileUrl: input.data.fileUrl,
          fileType: input.data.fileType,
          fileSize: input.data.fileSize,
          replyToMessageId: input.data.replyToMessageId,
          metadata: input.data.metadata as never,
        },
      });
      if (input.data.content) {
        await extractMentions(room.roomId, room.tenantId, message.messageId, input.data.content);
      }
      await prisma.chatReadReceipt.create({
        data: {
          tenantId: room.tenantId,
          messageId: message.messageId,
          userId: actor.userId,
          platformUserId: actor.platformUserId,
        },
      }).catch(() => undefined);
      await createMessageNotifications(room.roomId, room.tenantId, {
        messageId: message.messageId,
        content: message.content,
        senderName: actor.fullName,
        senderUserId: actor.userId,
        senderPlatformUserId: actor.platformUserId,
        messageType: message.messageType,
      });
      io.to(room.roomId).emit("message:new", {
        ...message,
        senderName: actor.fullName,
      });
      io.to(room.roomId).emit("notification:new", {
        roomId: room.roomId,
        messageId: message.messageId,
        title: "New message",
      });
    });

    socket.on("message:read", async ({ messageId }) => {
      if (typeof messageId !== "string") return;
      const message = await prisma.chatMessage.findUnique({ where: { messageId } });
      if (!message || (actor.type !== "hq" && message.tenantId !== actor.tenantId)) return;
      await prisma.chatReadReceipt.upsert({
        where: {
          messageId_userId_platformUserId: actor.type === "hq"
            ? { messageId, userId: null, platformUserId: actor.platformUserId }
            : { messageId, userId: actor.userId, platformUserId: null },
        },
        update: { readAt: new Date() },
        create: {
          tenantId: message.tenantId,
          messageId,
          userId: actor.userId,
          platformUserId: actor.platformUserId,
        },
      });
      io.emit("message:updated", { messageId, read: true });
    });

    socket.on("typing:start", ({ roomId }) => {
      if (typeof roomId !== "string") return;
      socket.to(roomId).emit("typing:update", { roomId, userName: actor.fullName, isTyping: true });
    });

    socket.on("typing:stop", ({ roomId }) => {
      if (typeof roomId !== "string") return;
      socket.to(roomId).emit("typing:update", { roomId, userName: actor.fullName, isTyping: false });
    });

    socket.on("reaction:add", async ({ messageId, emoji }) => {
      if (typeof messageId !== "string" || typeof emoji !== "string") return;
      const message = await prisma.chatMessage.findUnique({ where: { messageId } });
      if (!message || (actor.type !== "hq" && message.tenantId !== actor.tenantId)) return;
      await prisma.chatMessageReaction.upsert({
        where: {
          messageId_userId_platformUserId_emoji: actor.type === "hq"
            ? { messageId, userId: null, platformUserId: actor.platformUserId, emoji }
            : { messageId, userId: actor.userId, platformUserId: null, emoji },
        },
        update: { emoji },
        create: {
          tenantId: message.tenantId,
          messageId,
          userId: actor.userId,
          platformUserId: actor.platformUserId,
          emoji,
        },
      });
      io.emit("message:updated", { messageId, reaction: emoji });
    });

    socket.on("disconnect", () => {
      io.emit("presence:update", { userName: actor.fullName, status: "OFFLINE" });
    });

    io.emit("presence:update", { userName: actor.fullName, status: "ONLINE" });
  });

  app.get("/chat/rooms", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const rooms = await listRoomsForActor(actor);
    const payload = await Promise.all(
      rooms.map(async (room) => {
        const summary = await summarizeRoom(room.roomId, room.tenantId);
        const unreadCount = await prisma.chatMessage.count({
          where: {
            roomId: room.roomId,
            tenantId: room.tenantId,
            isDeleted: false,
            ...(actor.type === "hq"
              ? {}
              : {
                  readReceipts: {
                    none: actor.userId
                      ? { userId: actor.userId }
                      : { platformUserId: actor.platformUserId ?? undefined },
                  },
                }),
          },
        });
        return { ...room, summary: summary.summary, unreadCount };
      }),
    );
    return res.json(payload);
  });

  app.post("/chat/rooms", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const input = z.object({
      tenantId: z.string().optional(),
      roomType: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      tierKey: z.string().optional(),
      classId: z.string().optional(),
      subjectId: z.string().optional(),
      memberUserIds: z.array(z.string()).optional().default([]),
      memberPlatformUserIds: z.array(z.string()).optional().default([]),
    }).parse(req.body);
    if (!getRoleScope(actor.role, input.roomType)) {
      return res.status(403).json({ error: "Room type not allowed" });
    }
    const roomTenantId = actor.type === "hq" ? input.tenantId : actor.tenantId;
    if (!roomTenantId) return res.status(400).json({ error: "tenantId is required" });
    const room = await prisma.chatRoom.create({
      data: {
        tenantId: roomTenantId,
        roomKey: `${input.roomType.toLowerCase()}-${Date.now()}`,
        roomType: input.roomType,
        name: input.name,
        description: input.description,
        tierKey: input.tierKey,
        classId: input.classId,
        subjectId: input.subjectId,
        createdByUserId: actor.userId,
        createdByPlatformUserId: actor.platformUserId,
      },
    });
    await prisma.chatRoomMember.createMany({
      data: [
        {
          tenantId: roomTenantId,
          roomId: room.roomId,
          userId: actor.userId,
          platformUserId: actor.platformUserId,
          roleLabel: actor.role,
        },
        ...input.memberUserIds.map((userId) => ({
          tenantId: roomTenantId,
          roomId: room.roomId,
          userId,
          platformUserId: null,
          roleLabel: "MEMBER",
        })),
        ...input.memberPlatformUserIds.map((platformUserId) => ({
          tenantId: roomTenantId,
          roomId: room.roomId,
          userId: null,
          platformUserId,
          roleLabel: "HQ_MEMBER",
        })),
      ],
      skipDuplicates: true,
    });
    return res.status(201).json(room);
  });

  app.get("/chat/rooms/:roomId/members", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const room = await prisma.chatRoom.findUnique({ where: { roomId: req.params.roomId } });
    if (!room || (actor.type !== "hq" && room.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Room not found" });
    const members = await prisma.chatRoomMember.findMany({ where: { roomId: room.roomId }, orderBy: { joinedAt: "asc" } });
    const payload = await Promise.all(
      members.map(async (member) => {
        const user = member.userId ? await prisma.user.findUnique({ where: { userId: member.userId } }) : null;
        const platformUser = member.platformUserId ? await prisma.platformUser.findUnique({ where: { platformUserId: member.platformUserId } }) : null;
        return {
          ...member,
          displayName: user?.fullName ?? platformUser?.fullName ?? member.roleLabel ?? "Member",
        };
      }),
    );
    return res.json(payload);
  });

  app.get("/chat/rooms/:roomId/messages", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const room = await prisma.chatRoom.findUnique({ where: { roomId: req.params.roomId } });
    if (!room || (actor.type !== "hq" && room.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Room not found" });
    const hasAccess = await ensureMember(room.roomId, actor);
    if (!hasAccess && !getRoleScope(actor.role, room.roomType)) return res.status(403).json({ error: "Not allowed" });
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const messages = await prisma.chatMessage.findMany({
      where: { tenantId: room.tenantId, roomId: room.roomId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    const payload = await Promise.all(
      messages.map(async (message) => {
        const user = message.senderUserId ? await prisma.user.findUnique({ where: { userId: message.senderUserId } }) : null;
        const platformUser = message.senderPlatformUserId ? await prisma.platformUser.findUnique({ where: { platformUserId: message.senderPlatformUserId } }) : null;
        return {
          ...message,
          senderName: user?.fullName ?? platformUser?.fullName ?? "Unknown sender",
          senderRole: user?.role ?? platformUser?.hqRole ?? null,
        };
      }),
    );
    return res.json(payload);
  });

  app.post("/chat/rooms/:roomId/messages", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const input = z.object({
      content: z.string().optional(),
      messageType: z.string().optional().default("TEXT"),
      fileUrl: z.string().optional(),
      fileType: z.string().optional(),
      fileSize: z.number().int().optional(),
      replyToMessageId: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }).parse(req.body);
    const room = await prisma.chatRoom.findUnique({ where: { roomId: req.params.roomId } });
    if (!room || (actor.type !== "hq" && room.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Room not found" });
    const hasAccess = await ensureMember(room.roomId, actor);
    if (!hasAccess && !getRoleScope(actor.role, room.roomType)) return res.status(403).json({ error: "Not allowed" });
    const message = await prisma.chatMessage.create({
      data: {
        tenantId: room.tenantId,
        roomId: room.roomId,
        senderUserId: actor.userId,
        senderPlatformUserId: actor.platformUserId,
        messageType: input.messageType,
        content: input.content ?? null,
        fileUrl: input.fileUrl,
        fileType: input.fileType,
        fileSize: input.fileSize,
        replyToMessageId: input.replyToMessageId,
        metadata: input.metadata as never,
      },
    });
    if (input.content) {
      await extractMentions(room.roomId, room.tenantId, message.messageId, input.content);
    }
    await prisma.chatReadReceipt.create({
      data: {
        tenantId: room.tenantId,
        messageId: message.messageId,
        userId: actor.userId,
        platformUserId: actor.platformUserId,
      },
    }).catch(() => undefined);
    await createMessageNotifications(room.roomId, room.tenantId, {
      messageId: message.messageId,
      content: message.content,
      senderName: actor.fullName,
      senderUserId: actor.userId,
      senderPlatformUserId: actor.platformUserId,
      messageType: message.messageType,
    });
    const payload = { ...message, senderName: actor.fullName };
    io.to(room.roomId).emit("message:new", payload);
    return res.status(201).json(payload);
  });

  app.post("/chat/messages/:messageId/read", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const message = await prisma.chatMessage.findUnique({ where: { messageId: req.params.messageId } });
    if (!message || (actor.type !== "hq" && message.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Message not found" });
    await prisma.chatReadReceipt.upsert({
      where: {
        messageId_userId_platformUserId: actor.type === "hq"
          ? { messageId: message.messageId, userId: null, platformUserId: actor.platformUserId }
          : { messageId: message.messageId, userId: actor.userId, platformUserId: null },
      },
      update: { readAt: new Date() },
      create: {
        tenantId: message.tenantId,
        messageId: message.messageId,
        userId: actor.userId,
        platformUserId: actor.platformUserId,
      },
    });
    return res.json({ success: true });
  });

  app.post("/chat/messages/:messageId/reactions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const input = z.object({ emoji: z.string().min(1) }).parse(req.body);
    const message = await prisma.chatMessage.findUnique({ where: { messageId: req.params.messageId } });
    if (!message || (actor.type !== "hq" && message.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Message not found" });
    const reaction = await prisma.chatMessageReaction.upsert({
      where: {
        messageId_userId_platformUserId_emoji: actor.type === "hq"
          ? { messageId: message.messageId, userId: null, platformUserId: actor.platformUserId, emoji: input.emoji }
          : { messageId: message.messageId, userId: actor.userId, platformUserId: null, emoji: input.emoji },
      },
      update: { emoji: input.emoji },
      create: {
        tenantId: message.tenantId,
        messageId: message.messageId,
        userId: actor.userId,
        platformUserId: actor.platformUserId,
        emoji: input.emoji,
      },
    });
    io.emit("message:updated", { messageId: message.messageId, reaction: reaction.emoji });
    return res.status(201).json(reaction);
  });

  app.post("/chat/messages/:messageId/edit", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const input = z.object({ content: z.string().min(1) }).parse(req.body);
    const message = await prisma.chatMessage.findUnique({ where: { messageId: req.params.messageId } });
    if (!message || (actor.type !== "hq" && message.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Message not found" });
    if (message.senderUserId !== actor.userId && message.senderPlatformUserId !== actor.platformUserId && actor.role !== "PRINCIPAL" && actor.role !== "ADMIN") {
      return res.status(403).json({ error: "Not allowed" });
    }
    await prisma.chatMessageEdit.create({
      data: {
        tenantId: message.tenantId,
        messageId: message.messageId,
        editorUserId: actor.userId,
        editorPlatformUserId: actor.platformUserId,
        newContent: input.content,
      },
    });
    const updated = await prisma.chatMessage.update({
      where: { messageId: message.messageId },
      data: { content: input.content, updatedAt: new Date() },
    });
    io.emit("message:updated", { messageId: updated.messageId, content: updated.content });
    return res.json(updated);
  });

  app.delete("/chat/messages/:messageId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const message = await prisma.chatMessage.findUnique({ where: { messageId: req.params.messageId } });
    if (!message || (actor.type !== "hq" && message.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Message not found" });
    if (message.senderUserId !== actor.userId && message.senderPlatformUserId !== actor.platformUserId && actor.role !== "PRINCIPAL" && actor.role !== "ADMIN") {
      return res.status(403).json({ error: "Not allowed" });
    }
    await prisma.chatMessageDelete.create({
      data: {
        tenantId: message.tenantId,
        messageId: message.messageId,
        deletedByUserId: actor.userId,
        deletedByPlatformUserId: actor.platformUserId,
      },
    });
    await prisma.chatMessage.update({
      where: { messageId: message.messageId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    io.emit("message:deleted", { messageId: message.messageId });
    return res.json({ success: true });
  });

  app.get("/chat/search", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const query = String(req.query.q ?? "").trim();
    if (!query) return res.json({ rooms: [], messages: [] });
    const rooms = await prisma.chatRoom.findMany({
      where: actor.type === "hq"
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {
            tenantId: actor.tenantId,
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
      take: 20,
    });
    const messages = await prisma.chatMessage.findMany({
      where: actor.type === "hq"
        ? {
            isDeleted: false,
            content: { contains: query, mode: "insensitive" },
          }
        : {
            tenantId: actor.tenantId,
            isDeleted: false,
            content: { contains: query, mode: "insensitive" },
          },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ rooms, messages });
  });

  app.get("/chat/rooms/:roomId/summary", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "No token provided" });
    const actor = await resolveActor(authHeader.slice(7));
    if (!actor) return res.status(401).json({ error: "Invalid token" });
    const room = await prisma.chatRoom.findUnique({ where: { roomId: req.params.roomId } });
    if (!room || (actor.type !== "hq" && room.tenantId !== actor.tenantId)) return res.status(404).json({ error: "Room not found" });
    const summary = await summarizeRoom(room.roomId, room.tenantId);
    return res.json(summary);
  });
}
