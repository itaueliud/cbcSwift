"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type NotificationRow = {
  notificationId: string; tenantId?: string | null; recipientUserId?: string | null;
  recipientPlatformUserId?: string | null; type: string; title: string; message: string;
  priority: string; channel: string; isRead: boolean; sentAt: string; readAt?: string | null;
};

const priorityConfig: Record<string, { color: string; icon: string; pill: string }> = {
  CRITICAL: { color: "#dc2626", icon: "🚨", pill: "red" },
  HIGH:     { color: "#f59e0b", icon: "⚠️", pill: "amber" },
  NORMAL:   { color: "#1d4ed8", icon: "ℹ️", pill: "" },
  LOW:      { color: "#64748b", icon: "📌", pill: "gray" },
};

const channelIcon: Record<string, string> = {
  SMS: "📱", EMAIL: "📧", PUSH: "🔔", IN_APP: "💬", WHATSAPP: "💚",
};

const typeIcon: Record<string, string> = {
  FEE_DUE: "💳", ATTENDANCE: "📊", REPORT_READY: "📄", SYSTEM: "⚙️",
  PAYMENT_CONFIRMED: "✅", ASSIGNMENT: "📝", ANNOUNCEMENT: "📢", AI_ALERT: "🤖",
};

export default function NotificationsPage() {
  const session = useProtectedSession(["hq","ADMIN","PRINCIPAL","TEACHER","STUDENT","PARENT","FINANCE"]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");

  async function load() {
    if (!session) return;
    setLoading(true);
    try {
      const payload = await apiFetch<NotificationRow[]>("/notifications", {}, session.token);
      setNotifications(payload);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function markRead(notificationId: string) {
    if (!session) return;
    await apiFetch(`/notifications/${notificationId}/read`, { method: "POST" }, session.token);
    setNotifications((prev) => prev.map((n) => n.notificationId === notificationId ? { ...n, isRead: true } : n));
  }

  async function markAllRead() {
    if (!session) return;
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => apiFetch(`/notifications/${n.notificationId}/read`, { method: "POST" }, session.token)));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const stats = useMemo(() => ({
    unread: notifications.filter((n) => !n.isRead).length,
    critical: notifications.filter((n) => n.priority === "CRITICAL").length,
    sms: notifications.filter((n) => n.channel === "SMS").length,
    total: notifications.length,
  }), [notifications]);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "critical") return n.priority === "CRITICAL";
    return true;
  });

  if (!session) return null;

  return (
    <DashboardShell title="Notifications" subtitle="Alerts, updates, and system messages" badge="Comms" role={session.type === "hq" ? "hq" : (session.role ?? "school").toLowerCase()} userName={session.fullName} schoolName={session.schoolName}>
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Total" value={String(stats.total)} description="All notifications" />
          <StatCard label="Unread" value={String(stats.unread)} description="Pending your attention" />
          <StatCard label="Critical" value={String(stats.critical)} description="High priority alerts" />
          <StatCard label="SMS" value={String(stats.sms)} description="Via SMS channel" />
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "unread", "critical"] as const).map((f) => (
              <button key={f} type="button" className="tab-button" data-active={filter === f} onClick={() => setFilter(f)}
                style={{ padding: "8px 16px", fontSize: 13 }}>
                {f === "all" ? "All" : f === "unread" ? `Unread (${stats.unread})` : `Critical (${stats.critical})`}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {stats.unread > 0 && (
              <button type="button" className="btn-ghost" onClick={markAllRead}>✅ Mark all read</button>
            )}
            <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
              {loading ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        <div className="notification-list">
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", background: "white", borderRadius: 20, border: "1px solid var(--line)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>All caught up!</div>
              <div className="muted" style={{ marginTop: 6 }}>No {filter !== "all" ? filter : ""} notifications to show.</div>
            </div>
          )}
          {filtered.map((notif) => {
            const cfg = priorityConfig[notif.priority] ?? priorityConfig.NORMAL;
            const icon = typeIcon[notif.type] ?? cfg.icon;
            return (
              <div
                key={notif.notificationId}
                className={`notification-item ${!notif.isRead ? "unread" : ""} ${notif.priority === "CRITICAL" ? "critical" : ""}`}
                onClick={() => !notif.isRead && markRead(notif.notificationId)}
                style={{ cursor: !notif.isRead ? "pointer" : "default" }}
              >
                <div className="notification-icon-wrap" style={{ background: `${cfg.color}14` }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div className="notification-title">{notif.title}</div>
                    {!notif.isRead && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1d4ed8", flexShrink: 0, marginTop: 5 }} />
                    )}
                  </div>
                  <div className="notification-message">{notif.message}</div>
                  <div className="notification-meta">
                    <span className={`pill ${cfg.pill}`}>{notif.priority}</span>
                    <span className="pill gray">{channelIcon[notif.channel] ?? "📨"} {notif.channel}</span>
                    <span className="pill gray">{notif.type.replaceAll("_", " ")}</span>
                    <span className="notification-time">
                      {notif.readAt ? `✅ Read ${new Date(notif.readAt).toLocaleString()}` : `🕐 ${new Date(notif.sentAt).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
