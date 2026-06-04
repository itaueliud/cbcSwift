"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

const feeTypes = ["TUITION","BOARDING","ACTIVITY","TRANSPORT","UNIFORM","EXAM","DEVELOPMENT","OTHER"];

export default function FeeStructuresPage() {
  const session = useProtectedSession(["FINANCE","ADMIN","PRINCIPAL"]);
  const [structures, setStructures] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ feeType: "TUITION", amount: "", description: "", term: "", academicYear: new Date().getFullYear().toString() });

  async function load() {
    if (!session) return;
    try {
      const data = await apiFetch<Row[]>("/finance/fee-structures", {}, session.token);
      setStructures(data);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function save() {
    if (!session || !form.amount) return;
    setSaving(true);
    try {
      await apiFetch("/finance/fee-structures", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) }, session.token);
      setSaved(true);
      setForm((f) => ({ ...f, amount: "", description: "" }));
      await load();
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  if (!session) return null;

  const totalAnnual = structures.reduce((s, item) => s + Number(item.amount ?? 0), 0);

  return (
    <DashboardShell title="Fee Structures" subtitle="Define school fees by type and academic term" badge="Finance" role="finance">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Fee Items" value={String(structures.length)} description="Configured items" />
          <StatCard label="Total Annual" value={`KSh ${totalAnnual.toLocaleString()}`} description="All fee items" />
          <StatCard label="Fee Types" value={String(new Set(structures.map((s) => s.feeType ?? s.fee_type ?? "")).size)} description="Different types" />
          <StatCard label="Academic Year" value={form.academicYear} description="Current year" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginTop: 24 }}>
        <div className="payment-form-card">
          <h3 style={{ marginBottom: 16 }}>🗂️ Add Fee Item</h3>
          {saved && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(5,150,105,0.08)", color: "#065f46", fontWeight: 700, marginBottom: 14, fontSize: 13 }}>✅ Fee item saved!</div>}
          <div style={{ display: "grid", gap: 14 }}>
            <div className="field">
              <label>Fee Type</label>
              <select className="login-select" value={form.feeType} onChange={(e) => setForm((f) => ({ ...f, feeType: e.target.value }))}>
                {feeTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Amount (KSh)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 15000" min="0" />
            </div>
            <div className="field">
              <label>Term / Period</label>
              <input value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} placeholder="e.g. Term 1 2025" />
            </div>
            <div className="field">
              <label>Academic Year</label>
              <input value={form.academicYear} onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2025" />
            </div>
            <div className="field">
              <label>Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional notes" />
            </div>
            <button type="button" className="btn-primary" style={{ padding: "12px 20px" }} onClick={save} disabled={saving || !form.amount}>
              {saving ? "Saving..." : "💾 Save Fee Item"}
            </button>
          </div>
        </div>

        <div className="panel-card">
          <h3 style={{ marginBottom: 14 }}>Fee Breakdown</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {feeTypes.map((type) => {
              const typeTotal = structures.filter((s) => (s.feeType ?? s.fee_type ?? "") === type).reduce((sum, s) => sum + Number(s.amount ?? 0), 0);
              if (typeTotal === 0) return null;
              return (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{type}</span>
                  <span style={{ fontWeight: 800 }}>KSh {typeTotal.toLocaleString()}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", fontSize: 15 }}>
              <span style={{ fontWeight: 800 }}>TOTAL</span>
              <span style={{ fontWeight: 800, color: "var(--brand)" }}>KSh {totalAnnual.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>All Fee Items</h3>
        <DataTable
          columns={[
            { key: "feeType", label: "Fee Type" },
            { key: "amount", label: "Amount" },
            { key: "term", label: "Term" },
            { key: "academicYear", label: "Year" },
            { key: "description", label: "Notes" },
          ]}
          rows={structures.map((s) => ({
            feeType: String(s.feeType ?? s.fee_type ?? ""),
            amount: `KSh ${Number(s.amount ?? 0).toLocaleString()}`,
            term: String(s.term ?? s.termName ?? ""),
            academicYear: String(s.academicYear ?? s.academic_year ?? ""),
            description: String(s.description ?? "—"),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
