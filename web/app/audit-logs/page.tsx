"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

const severityConfig: Record<string, { pill: string; label: string }> = {
  INFO:     { pill: "info",    label: "ℹ️ Info" },
  WARNING:  { pill: "warning", label: "⚠️ Warning" },
  CRITICAL: { pill: "critical",label: "🚨 Critical" },
};

export default function AuditLogsPage() {
  const session = useProtectedSession(["hq", "ADMIN", "PRINCIPAL"]);
  const [logs, setLogs] = useState<Row[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!session) return;
    setLoading(true);
    try {
      const payload = await apiFetch<Row[]>("/audit-logs", {}, session.token);
      setLogs(payload);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  const filtered = filter === "all" ? logs : logs.filter((l) => (l.severity ?? l.level ?? "INFO") === filter.toUpperCase());

  if (!session) return null;

  const criticalCount = logs.filter((l) => (l.severity ?? l.level ?? "") === "CRITICAL").length;
  const warningCount = logs.filter((l) => (l.severity ?? l.level ?? "") === "WARNING").length;

  const shellRole = session.type === "hq" ? "hq" : (session.role?.toLowerCase() === "admin" ? "school" : (session.role?.toLowerCase() || "school"));

  return (
    <DashboardShell title="Audit Logs" subtitle="Security-critical event history" badge="Security" role={shellRole}>
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Total Events" value={String(logs.length)} description="Logged actions" />
          <StatCard label="Critical" value={String(criticalCount)} description="High severity" />
          <StatCard label="Warnings" value={String(warningCount)} description="Medium severity" />
          <StatCard label="Info" value={String(logs.length - criticalCount - warningCount)} description="Routine logs" />
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["all", "info", "warning", "critical"].map((f) => (
              <button key={f} type="button" className="tab-button" data-active={filter === f} onClick={() => setFilter(f)} style={{ padding: "8px 16px", fontSize: 13, textTransform: "capitalize" }}>
                {f === "all" ? "All Events" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="btn-ghost" onClick={load} disabled={loading}>{loading ? "Loading..." : "🔄 Refresh"}</button>
        </div>

        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "140px 130px minmax(0,1fr) 100px", gap: 12, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
            <span>Timestamp</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Severity</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
              <div style={{ fontWeight: 700 }}>No audit logs found</div>
              <div className="muted" style={{ marginTop: 4 }}>Events will appear here as actions are performed.</div>
            </div>
          ) : (
            filtered.map((log, i) => {
              const severity = String(log.severity ?? log.level ?? "INFO");
              const cfg = severityConfig[severity] ?? severityConfig.INFO;
              return (
                <div key={i} className="audit-row">
                  <span className="audit-time">{new Date(log.createdAt ?? log.timestamp ?? Date.now()).toLocaleString()}</span>
                  <span className="audit-actor">{String(log.actorName ?? log.actor ?? log.userId ?? "System")}</span>
                  <span className="audit-action">{String(log.action ?? log.event ?? log.message ?? "Event")}</span>
                  <span className={`audit-severity ${severity.toLowerCase()}`}>{cfg.label}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
