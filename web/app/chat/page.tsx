"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { apiFetch, API_BASE } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type RoomRow = {
  roomId: string; roomKey: string; roomType: string; name: string;
  description?: string | null; tenantId: string; summary?: string;
  unreadCount?: number; isPinned?: boolean; isArchived?: boolean; updatedAt?: string;
};
type MemberRow = {
  memberId: string; userId?: string | null; platformUserId?: string | null;
  roleLabel?: string | null; displayName?: string; joinedAt?: string; lastReadAt?: string | null;
};
type MessageRow = {
  messageId: string; roomId: string; senderUserId?: string | null;
  senderPlatformUserId?: string | null; senderName?: string; senderRole?: string | null;
  messageType: string; content?: string | null; fileUrl?: string | null;
  fileType?: string | null; createdAt: string; updatedAt?: string; isDeleted?: boolean;
};
type SearchPayload = { rooms: RoomRow[]; messages: MessageRow[] };
type LiveEvent = { roomId?: string; messageId?: string; title?: string; content?: string; reaction?: string; read?: boolean; };

const roomTypes = ["ANNOUNCEMENT","SUPPORT","GROUP","CLASS","DEPARTMENT","FINANCE","DIRECT","CLUB","CAREER","AI_ASSISTANT"];

function byDateAsc(a: MessageRow, b: MessageRow) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function roomTypeIcon(type: string) {
  const map: Record<string, string> = {
    ANNOUNCEMENT: "📢", SUPPORT: "🛎️", GROUP: "👥", CLASS: "📚",
    DEPARTMENT: "🏛️", FINANCE: "💰", DIRECT: "💬", CLUB: "🎯",
    CAREER: "🌟", AI_ASSISTANT: "🤖",
  };
  return map[type] ?? "💬";
}

export default function ChatPage() {
  const session = useProtectedSession(["hq","ADMIN","PRINCIPAL","TEACHER","STUDENT","PARENT","FINANCE"]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRooms, setSearchRooms] = useState<RoomRow[]>([]);
  const [searchMessages, setSearchMessages] = useState<MessageRow[]>([]);
  const [liveNotice, setLiveNotice] = useState("Connecting...");
  const [composer, setComposer] = useState("");
  const [messageType, setMessageType] = useState("TEXT");
  const [fileUrl, setFileUrl] = useState("");
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomType, setNewRoomType] = useState("GROUP");
  const [newRoomTenantId, setNewRoomTenantId] = useState("");
  const [newRoomMemberUserIds, setNewRoomMemberUserIds] = useState("");

  const currentRoom = useMemo(() => rooms.find((r) => r.roomId === selectedRoomId) ?? null, [rooms, selectedRoomId]);
  const unreadCount = rooms.reduce((t, r) => t + (r.unreadCount ?? 0), 0);

  async function loadRooms() {
    if (!session) return;
    const payload = await apiFetch<RoomRow[]>("/chat/rooms", {}, session.token);
    setRooms(payload);
    if (!selectedRoomId && payload[0]?.roomId) setSelectedRoomId(payload[0].roomId);
  }

  async function loadRoomData(roomId: string) {
    if (!session) return;
    const [memberPayload, messagePayload, summaryPayload] = await Promise.all([
      apiFetch<MemberRow[]>(`/chat/rooms/${roomId}/members`, {}, session.token),
      apiFetch<MessageRow[]>(`/chat/rooms/${roomId}/messages`, {}, session.token),
      apiFetch<{ summary: string }>(`/chat/rooms/${roomId}/summary`, {}, session.token),
    ]);
    setMembers(memberPayload);
    setMessages(messagePayload.sort(byDateAsc));
    setSummary(summaryPayload.summary);
    setLiveNotice(`${messagePayload.length} messages`);
    const latest = messagePayload[messagePayload.length - 1];
    if (latest) {
      await apiFetch(`/chat/messages/${latest.messageId}/read`, { method: "POST" }, session.token).catch(() => undefined);
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function runSearch(q: string) {
    if (!session || !q.trim()) return;
    const payload = await apiFetch<SearchPayload>(`/chat/search?q=${encodeURIComponent(q.trim())}`, {}, session.token);
    setSearchRooms(payload.rooms);
    setSearchMessages(payload.messages);
  }

  useEffect(() => { if (session) void loadRooms(); }, [session]);
  useEffect(() => { if (session && selectedRoomId) { void loadRoomData(selectedRoomId); socketRef.current?.emit("room:join", { roomId: selectedRoomId }); } }, [session, selectedRoomId]);

  useEffect(() => {
    if (!session) return;
    // Connect to socket.io via nginx — use origin so WebSocket upgrade works through proxy
    const socketUrl = typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_URL?.startsWith("/") ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"))
      : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");
    const socket = io(socketUrl, { 
      auth: { token: session.token }, 
      transports: ["websocket","polling"],
      path: "/socket.io/",
    });
    socketRef.current = socket;
    socket.on("connect", () => { if (selectedRoomId) socket.emit("room:join", { roomId: selectedRoomId }); setLiveNotice("Connected"); });
    socket.on("message:new", (payload: MessageRow & { roomId?: string; senderName?: string }) => {
      if (payload.roomId !== selectedRoomId) return;
      setMessages((prev) => {
        const next = prev.some((m) => m.messageId === payload.messageId)
          ? prev.map((m) => m.messageId === payload.messageId ? { ...m, ...payload } : m)
          : [...prev, payload as MessageRow];
        return next.sort(byDateAsc);
      });
      setLiveNotice(`New: ${payload.senderName ?? "someone"}`);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    socket.on("message:updated", (payload: LiveEvent) => {
      if (payload.messageId) setMessages((prev) => prev.map((m) => m.messageId === payload.messageId ? { ...m, content: payload.content ?? m.content } : m));
    });
    socket.on("message:deleted", (payload: LiveEvent) => {
      if (payload.messageId) setMessages((prev) => prev.filter((m) => m.messageId !== payload.messageId));
    });
    socket.on("notification:new", (payload: LiveEvent) => { setLiveNotice(payload.title ?? "New notification"); });
    socket.on("typing:update", (payload: { roomId?: string; userName?: string; isTyping?: boolean }) => {
      if (payload.roomId === selectedRoomId && payload.isTyping) setLiveNotice(`${payload.userName ?? "Someone"} is typing...`);
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [session, selectedRoomId]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedRoomId || !composer.trim()) return;
    const payload = await apiFetch<MessageRow>(`/chat/rooms/${selectedRoomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: composer.trim(), messageType, fileUrl: fileUrl.trim() || undefined }),
    }, session.token);
    setComposer(""); setFileUrl("");
    setMessages((prev) => {
      const next = prev.some((m) => m.messageId === payload.messageId) ? prev.map((m) => m.messageId === payload.messageId ? { ...m, ...payload } : m) : [...prev, payload];
      return next.sort(byDateAsc);
    });
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleReact(messageId: string, emoji: string) {
    if (!session) return;
    await apiFetch(`/chat/messages/${messageId}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) }, session.token);
  }

  async function handleEdit(message: MessageRow) {
    if (!session) return;
    const next = window.prompt("Edit message", message.content ?? "");
    if (!next?.trim()) return;
    const payload = await apiFetch<MessageRow>(`/chat/messages/${message.messageId}/edit`, { method: "POST", body: JSON.stringify({ content: next.trim() }) }, session.token);
    setMessages((prev) => prev.map((m) => m.messageId === payload.messageId ? { ...m, ...payload } : m));
  }

  async function handleDelete(messageId: string) {
    if (!session || !window.confirm("Delete this message?")) return;
    await apiFetch(`/chat/messages/${messageId}`, { method: "DELETE" }, session.token);
    setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !newRoomName.trim()) return;
    await apiFetch("/chat/rooms", {
      method: "POST",
      body: JSON.stringify({
        tenantId: session.type === "hq" ? newRoomTenantId.trim() || undefined : undefined,
        roomType: newRoomType, name: newRoomName.trim(),
        description: newRoomDescription.trim() || undefined,
        memberUserIds: newRoomMemberUserIds.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    }, session.token);
    setNewRoomName(""); setNewRoomDescription(""); setNewRoomMemberUserIds("");
    setShowCreateRoom(false);
    await loadRooms();
  }

  if (!session) return null;

  return (
    <DashboardShell title="Chat" subtitle="Real-time communication hub" badge="Realtime" role={session.type === "hq" ? "hq" : (session.role ?? "school").toLowerCase()} userName={session.fullName} schoolName={session.schoolName}>
      {/* Stats */}
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Rooms" value={String(rooms.length)} description="Active channels" />
          <StatCard label="Unread" value={String(unreadCount)} description="Pending messages" />
          <StatCard label="Members" value={String(members.length)} description="In current room" />
          <StatCard label="Status" value={liveNotice} description="Live connection" />
        </div>
      </div>

      {/* Search bar */}
      <div className="section">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            style={{ flex: 1, padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 12, fontSize: 14, background: "white", outline: "none" }}
            placeholder="🔍 Search rooms and messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch(searchQuery)}
          />
          <button type="button" className="btn-ghost" onClick={() => void runSearch(searchQuery)} style={{ whiteSpace: "nowrap" }}>
            Search
          </button>
          <button type="button" className="quick-action-btn" onClick={() => setShowCreateRoom((v) => !v)}>
            ➕ New Room
          </button>
        </div>

        {/* Search results */}
        {(searchRooms.length > 0 || searchMessages.length > 0) && (
          <div style={{ marginTop: 12, background: "white", border: "1px solid var(--line)", borderRadius: 16, padding: 16 }}>
            {searchRooms.map((room) => (
              <button key={room.roomId} type="button" onClick={() => { setSelectedRoomId(room.roomId); setSearchRooms([]); setSearchMessages([]); setSearchQuery(""); }}
                style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: "transparent", border: "none", width: "100%", textAlign: "left" }}>
                <span style={{ fontSize: 20 }}>{roomTypeIcon(room.roomType)}</span>
                <div><div style={{ fontWeight: 700, fontSize: 14 }}>{room.name}</div><div className="muted">{room.roomType}</div></div>
              </button>
            ))}
            {searchMessages.map((msg) => (
              <div key={msg.messageId} style={{ padding: "10px 12px", borderTop: "1px solid var(--line)" }}>
                <strong style={{ fontSize: 13 }}>{msg.senderName ?? "Message"}</strong>
                <div className="desc">{msg.content ?? msg.messageType}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create room form */}
      {showCreateRoom && (
        <div className="section">
          <form onSubmit={handleCreateRoom} className="panel-card" style={{ display: "grid", gap: 12 }}>
            <h3 style={{ margin: 0 }}>Create New Room</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="field">
                <label>Room Type</label>
                <select className="login-select" value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)}>
                  {roomTypes.map((t) => <option key={t} value={t}>{roomTypeIcon(t)} {t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Room Name</label>
                <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="e.g. Grade 6 Class" required />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <input value={newRoomDescription} onChange={(e) => setNewRoomDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="field">
              <label>Member User IDs (comma-separated)</label>
              <input value={newRoomMemberUserIds} onChange={(e) => setNewRoomMemberUserIds(e.target.value)} placeholder="user1, user2, user3" />
            </div>
            {session.type === "hq" && (
              <div className="field">
                <label>Tenant ID</label>
                <input value={newRoomTenantId} onChange={(e) => setNewRoomTenantId(e.target.value)} placeholder="School tenant ID" />
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn-primary" style={{ width: "auto", padding: "10px 20px" }}>Create Room</button>
              <button type="button" className="btn-ghost" onClick={() => setShowCreateRoom(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Chat layout */}
      <div className="section chat-layout">
        {/* Room list */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div style={{ fontWeight: 700, fontSize: 14 }}>💬 Chat Rooms</div>
            <div className="muted" style={{ marginTop: 2 }}>{rooms.length} channels</div>
          </div>
          <div className="chat-room-list">
            {rooms.map((room) => (
              <div key={room.roomId} className={`chat-room-item ${room.roomId === selectedRoomId ? "active" : ""}`} onClick={() => setSelectedRoomId(room.roomId)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span>{roomTypeIcon(room.roomType)}</span>
                    <div className="chat-room-name">{room.name}</div>
                  </div>
                  {(room.unreadCount ?? 0) > 0 && <span className="chat-unread">{room.unreadCount}</span>}
                </div>
                <div className="chat-room-type">{room.roomType}</div>
                {room.summary && <div className="desc" style={{ marginTop: 4, fontSize: 11 }}>{room.summary}</div>}
              </div>
            ))}
            {rooms.length === 0 && (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>No rooms yet</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Create a room to get started</div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="chat-main">
          <div className="chat-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {currentRoom && <span style={{ fontSize: 20 }}>{roomTypeIcon(currentRoom.roomType)}</span>}
                <h3 style={{ margin: 0, fontSize: 16 }}>{currentRoom?.name ?? "Select a room"}</h3>
                {currentRoom && <span className="pill">{currentRoom.roomType}</span>}
              </div>
              {currentRoom?.description && <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>{currentRoom.description}</div>}
            </div>
            <span className={`pill ${liveNotice === "Connected" ? "green" : "gray"}`}>{liveNotice}</span>
          </div>

          <div className="chat-messages">
            {messages.map((msg) => {
              const isOwn = msg.senderUserId === session.userId || msg.senderPlatformUserId === session.platformUserId;
              return (
                <div key={msg.messageId} className={`chat-message ${isOwn ? "own" : ""}`}>
                  {!isOwn && <div className="chat-message-sender">{msg.senderName ?? "Unknown"}</div>}
                  <div className="chat-message-content">{msg.content ?? msg.fileUrl ?? "Attachment"}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                    <div className="chat-message-time">
                      {msg.senderRole && <span style={{ marginRight: 6, opacity: 0.6 }}>{msg.senderRole}</span>}
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="chat-message-actions">
                      <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.7 }} onClick={() => void handleReact(msg.messageId, "👍")}>👍</button>
                      <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.7 }} onClick={() => void handleReact(msg.messageId, "❤️")}>❤️</button>
                      {(isOwn || session.role === "ADMIN" || session.role === "PRINCIPAL") && (
                        <>
                          <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)" }} onClick={() => void handleEdit(msg)}>Edit</button>
                          <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#dc2626" }} onClick={() => void handleDelete(msg.messageId)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && currentRoom && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                <div style={{ fontWeight: 700 }}>No messages yet</div>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>Be the first to say something!</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSend} className="chat-composer">
            {fileUrl !== "" && (
              <div style={{ marginBottom: 8 }}>
                <input style={{ width: "100%", padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 10, fontSize: 13, background: "white", outline: "none" }}
                  placeholder="File URL (optional)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
              </div>
            )}
            <div className="chat-composer-row">
              <select style={{ padding: "11px 12px", border: "1.5px solid var(--line)", borderRadius: 12, background: "white", fontSize: 13, outline: "none" }}
                value={messageType} onChange={(e) => setMessageType(e.target.value)}>
                {["TEXT","IMAGE","VIDEO","AUDIO","PDF","ASSIGNMENT","REPORT","PAYMENT_RECEIPT","AI_SUMMARY","SYSTEM_ALERT"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <textarea className="chat-composer-input" rows={2} placeholder="Write a message... (Enter to send)"
                value={composer} onChange={(e) => setComposer(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (composer.trim() && selectedRoomId) handleSend(e as any); } }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button type="submit" className="chat-send-btn" disabled={!selectedRoomId || !composer.trim()}>Send</button>
                <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setFileUrl(fileUrl === "" ? " " : "")}>📎</button>
              </div>
            </div>
          </form>
        </div>

        {/* Members panel */}
        <div className="chat-members-panel">
          <div className="chat-members-header">
            <div style={{ fontWeight: 700, fontSize: 14 }}>👥 Members</div>
            <div className="muted" style={{ marginTop: 2, fontSize: 12 }}>{members.length} people</div>
          </div>
          {members.map((member) => (
            <div key={member.memberId} className="chat-member-item">
              <div className="chat-member-avatar">{(member.displayName ?? member.roleLabel ?? "M").slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="chat-member-name">{member.displayName ?? member.roleLabel ?? "Member"}</div>
                <div className="chat-member-role">{member.roleLabel ?? "Member"}</div>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <div className="muted" style={{ fontSize: 13 }}>Select a room to see members</div>
            </div>
          )}
          {summary && (
            <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📝 Room Summary</div>
              <div className="desc">{summary}</div>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
