"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function HQTenantsPage() {
  const session = useProtectedSession(["hq"]);
  const [tenants, setTenants] = useState<Row[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    schoolName: "", subdomain: "", county: "", contactEmail: "", contactPhone: "",
    planTier: "BASIC", maxStudents: "500",
  });
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    try {
      const payload = await apiFetch<Row[]>("/hq/tenants", {}, session.token);
      setTenants(payload);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function save() {
    if (!session) return;
    setSaving(true);
    try {
      await apiFetch("/hq/tenants", {
        method: "POST",
        body: JSON.stringify({ ...form, maxStudents: Number(form.maxStudents) }),
      }, session.token);
      setSaved(true);
      setShowForm(false);
      setForm({ schoolName: "", subdomain: "", county: "", contactEmail: "", contactPhone: "", planTier: "BASIC", maxStudents: "500" });
      await load();
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function toggleStatus(tenantId: string, currentStatus: string) {
    if (!session) return;
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await apiFetch(`/hq/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus === "ACTIVE" }),
      }, session.token);
      await load();
    } catch { /* ignore */ }
  }

  async function sendAdminInvite(email: string) {
    if (!session) return;
    setSendingInvite(email);
    try {
      await apiFetch("/invite/send", { method: "POST", body: JSON.stringify({ email, role: "ADMIN" }) }, session.token);
      alert(`Invitation sent to ${email}`);
    } catch (e) {
      alert("Failed to send invitation.");
    }
    setSendingInvite(null);
  }

  if (!session) return null;

  const activeCount = tenants.filter((t) => (t.status ?? t.isActive) !== "INACTIVE" && (t.status ?? t.isActive) !== false).length;
  const planCounts = tenants.reduce((acc, t) => {
    const plan = String(t.planTier ?? t.plan_tier ?? "BASIC");
    acc[plan] = (acc[plan] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardShell title="Tenant Schools" subtitle="Manage all onboarded schools on the platform" badge="HQ Admin" role="hq">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Total Schools" value={String(tenants.length)} description="On platform" />
          <StatCard label="Active" value={String(activeCount)} description="Running now" />
          <StatCard label="Pro Plan" value={String(planCounts["PRO"] ?? 0)} description="Premium tier" />
          <StatCard label="Basic Plan" value={String(planCounts["BASIC"] ?? 0)} description="Standard tier" />
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <h3 style={{ textTransform: "none", fontSize: 16, fontWeight: 800 }}>Registered Schools</h3>
          <div style={{ display: "flex", gap: 10 }}>
            {saved && <span className="pill green">✅ School onboarded!</span>}
            <button type="button" className="quick-action-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "✕ Cancel" : "➕ Onboard New School"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="panel-card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16 }}>🏫 Onboard New School</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label>School Name</label>
                <input value={form.schoolName} onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))} placeholder="Green Valley Academy" />
              </div>
              <div className="field">
                <label>Subdomain</label>
                <input value={form.subdomain} onChange={(e) => setForm((f) => ({ ...f, subdomain: e.target.value }))} placeholder="greenvalley" />
              </div>
              <div className="field">
                <label>County</label>
                <input value={form.county} onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))} placeholder="Nairobi" />
              </div>
              <div className="field">
                <label>Contact Email</label>
                <input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="admin@school.ke" />
              </div>
              <div className="field">
                <label>Contact Phone</label>
                <input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} placeholder="0712345678" />
              </div>
              <div className="field">
                <label>Max Students</label>
                <input type="number" value={form.maxStudents} onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))} min="50" />
              </div>
              <div className="field">
                <label>Plan Tier</label>
                <select className="login-select" value={form.planTier} onChange={(e) => setForm((f) => ({ ...f, planTier: e.target.value }))}>
                  {["BASIC", "PRO", "ENTERPRISE"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button type="button" className="btn-primary" style={{ width: "auto", padding: "11px 24px" }} onClick={save} disabled={saving || !form.schoolName || !form.subdomain}>
                {saving ? "Saving..." : "🏫 Onboard School"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <DataTable
          columns={[
            { key: "schoolName", label: "School Name" },
            { key: "subdomain", label: "Subdomain" },
            { key: "county", label: "County" },
            { key: "planTier", label: "Plan" },
            { key: "studentCount", label: "Students" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions", render: (row) => (
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    className="btn-ghost" 
                    style={{ color: "var(--brand)", padding: "4px 8px" }} 
                    onClick={() => sendAdminInvite(row.contactEmail)} 
                    disabled={sendingInvite === row.contactEmail || !row.contactEmail}
                  >
                    {sendingInvite === row.contactEmail ? "Sending..." : "Invite Admin"}
                  </button>
                  <button 
                    className="btn-ghost" 
                    style={{ color: row.status === "ACTIVE" ? "orange" : "green", padding: "4px 8px" }} 
                    onClick={() => toggleStatus(row.tenantId, row.status)}
                  >
                    {row.status === "ACTIVE" ? "Disable" : "Enable"}
                  </button>
                </div>
              )
            },
          ]}
          rows={tenants.map((t) => {
            const statusVal = String(t.status ?? (t.isActive !== false ? "ACTIVE" : "INACTIVE"));
            return {
              tenantId: String(t.tenantId ?? t.tenant_id ?? ""),
              schoolName: String(t.schoolName ?? t.school_name ?? ""),
              subdomain: String(t.subdomain ?? ""),
              county: String(t.county ?? "—"),
              contactEmail: String(t.contactEmail ?? t.contact_email ?? ""),
              planTier: String(t.planTier ?? t.plan_tier ?? "BASIC"),
              studentCount: String(t.studentCount ?? t.student_count ?? "—"),
              status: statusVal,
            };
          })}
        />
      </div>
    </DashboardShell>
  );
}
