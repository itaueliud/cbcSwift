"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

const ROLES = ["PRINCIPAL","FINANCE","TEACHER","PARENT","STUDENT"] as const;
type InvRole = (typeof ROLES)[number];

type Inv = {
  invitationId: string; email: string; fullName: string; role: string;
  status: string; createdAt: string; expiresAt: string; createdBy: string;
};

export default function InvitationsPage() {
  const session = useProtectedSession(["ADMIN"]);
  const [invitations, setInvitations] = useState<Inv[]>([]);
  const [form, setForm] = useState({ email: "", fullName: "", role: "TEACHER" as InvRole });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    if (!session) return;
    try {
      const data = await apiFetch<Inv[]>("/admin/invitations", {}, session.token);
      setInvitations(data);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function sendInvite(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving(true); setError(null);
    try {
      await apiFetch("/admin/invitations", {
        method: "POST",
        body: JSON.stringify(form),
      }, session.token);
      setSuccess(`✅ Invitation sent to ${form.email}`);
      setForm({ email: "", fullName: "", role: "TEACHER" });
      setShowForm(false);
      await load();
      setTimeout(() => setSuccess(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invitation");
    } finally { setSaving(false); }
  }

  async function resend(invitationId: string) {
    if (!session) return;
    try {
      await apiFetch(`/admin/invitations/${invitationId}/resend`, { method: "POST" }, session.token);
      setSuccess("✅ Invitation resent!");
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend");
    }
  }

  if (!session) return null;

  const pending  = invitations.filter((i) => i.status === "PENDING").length;
  const accepted = invitations.filter((i) => i.status === "ACCEPTED").length;
  const expired  = invitations.filter((i) => i.status === "EXPIRED").length;

  const rows = invitations.map((inv) => ({
    Name: inv.fullName,
    Email: inv.email,
    Role: inv.role,
    Status: inv.status,
    "Sent By": inv.createdBy,
    Expires: new Date(inv.expiresAt).toLocaleDateString("en-KE"),
    Created: new Date(inv.createdAt).toLocaleDateString("en-KE"),
  }));

  return (
    <DashboardShell title="User Invitations" subtitle="Invite and manage school users" badge="Admin" role="admin">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Total Sent"  value={String(invitations.length)} description="All invitations" />
          <StatCard label="Pending"     value={String(pending)}             description="Awaiting activation" />
          <StatCard label="Accepted"    value={String(accepted)}            description="Activated accounts" />
          <StatCard label="Expired"     value={String(expired)}             description="Needs resend" />
        </div>
      </div>

      {success && <div style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", color: "#059669", fontWeight: 600 }}>{success}</div>}
      {error   && <div style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626", fontWeight: 600 }}>{error}</div>}

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Invitation Management</h3>
          <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "✕ Cancel" : "➕ Send Invitation"}
          </button>
        </div>

        {showForm && (
          <div className="panel-card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>📧 Send New Invitation</h3>
            <form onSubmit={sendInvite}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div className="field">
                  <label>Full Name *</label>
                  <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Jane Smith" required />
                </div>
                <div className="field">
                  <label>Email Address *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@school.ac.ke" required />
                </div>
                <div className="field">
                  <label>Role *</label>
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as InvRole }))}>
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Sending..." : "📧 Send Invitation"}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <DataTable columns={["Name", "Email", "Role", "Status", "Sent By", "Expires", "Created"]} rows={rows} />

        {/* Resend for expired/pending */}
        {invitations.filter((i) => i.status === "EXPIRED" || i.status === "PENDING").length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--muted)" }}>Resend Invitations</div>
            <div style={{ display: "grid", gap: 8 }}>
              {invitations.filter((i) => i.status === "EXPIRED" || i.status === "PENDING").map((inv) => (
                <div key={inv.invitationId} className="panel-card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{inv.fullName}</strong>
                    <span style={{ marginLeft: 8, fontSize: 13, color: "var(--muted)" }}>{inv.email} · {inv.role}</span>
                  </div>
                  <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => resend(inv.invitationId)}>
                    🔄 Resend
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
