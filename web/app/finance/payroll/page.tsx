"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function FinancePayrollPage() {
  const session = useProtectedSession(["FINANCE","ADMIN","PRINCIPAL"]);
  const [payroll, setPayroll] = useState<Row[]>([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ staffId: "", basicSalary: "", month: new Date().toISOString().slice(0, 7), notes: "" });
  const [staff, setStaff] = useState<Row[]>([]);

  async function load() {
    if (!session) return;
    try {
      const [payrollList, staffList] = await Promise.all([
        apiFetch<Row[]>("/finance/payroll", {}, session.token),
        apiFetch<Row[]>("/school/staff", {}, session.token).catch(() => []),
      ]);
      setPayroll(payrollList);
      setStaff(staffList);
      if (staffList[0]) setForm((f) => ({ ...f, staffId: String(staffList[0].staffId ?? staffList[0].staff_id ?? "") }));
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function savePayroll() {
    if (!session) return;
    setProcessing(true);
    try {
      await apiFetch("/finance/payroll", { method: "POST", body: JSON.stringify({ ...form, basicSalary: Number(form.basicSalary) }) }, session.token);
      setDone(true);
      setForm((f) => ({ ...f, basicSalary: "", notes: "" }));
      await load();
      setTimeout(() => setDone(false), 3000);
    } catch { /* ignore */ } finally { setProcessing(false); }
  }

  if (!session) return null;

  const totalPayroll = payroll.reduce((sum, p) => sum + Number(p.netSalary ?? p.net_salary ?? p.basicSalary ?? 0), 0);

  return (
    <DashboardShell title="Payroll" subtitle="Staff salary management and disbursements" badge="Finance" role="finance">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Payroll" value={String(payroll.length)} description="Records this period" />
          <StatCard label="Total" value={`KSh ${totalPayroll.toLocaleString()}`} description="Disbursed amount" />
          <StatCard label="Staff" value={String(staff.length)} description="Active employees" />
          <StatCard label="Month" value={form.month} description="Current period" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
        <div className="payment-form-card">
          <h3 style={{ marginBottom: 16 }}>💼 Add Payroll Record</h3>
          {done && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(5,150,105,0.1)", color: "#065f46", fontWeight: 700, marginBottom: 14, fontSize: 13 }}>✅ Payroll record saved!</div>}
          <div style={{ display: "grid", gap: 14 }}>
            <div className="field">
              <label>Staff Member</label>
              <select className="login-select" value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
                {staff.map((s) => { const id = String(s.staffId ?? s.staff_id ?? ""); return <option key={id} value={id}>{String(s.fullName ?? s.full_name ?? id)}</option>; })}
              </select>
            </div>
            <div className="field">
              <label>Basic Salary (KSh)</label>
              <input type="number" value={form.basicSalary} onChange={(e) => setForm((f) => ({ ...f, basicSalary: e.target.value }))} placeholder="e.g. 45000" min="0" />
            </div>
            <div className="field">
              <label>Month</label>
              <input type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
            </div>
            <div className="field">
              <label>Notes</label>
              <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
            <button type="button" className="btn-primary" style={{ padding: "12px 20px" }} onClick={savePayroll} disabled={processing || !form.basicSalary}>
              {processing ? "Processing..." : "💾 Save Payroll"}
            </button>
          </div>
        </div>

        <div className="panel-card">
          <h3 style={{ marginBottom: 14 }}>📊 Payroll Summary</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Total disbursed",    value: `KSh ${totalPayroll.toLocaleString()}` },
              { label: "Average salary",      value: payroll.length ? `KSh ${Math.round(totalPayroll / payroll.length).toLocaleString()}` : "—" },
              { label: "Staff on payroll",   value: String(new Set(payroll.map((p) => p.staffId ?? p.staff_id ?? "")).size) },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 14 }}>
                <span className="muted">{row.label}</span>
                <span style={{ fontWeight: 800 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <h3>Payroll Records</h3>
        <DataTable
          columns={[
            { key: "staffName", label: "Staff" },
            { key: "basicSalary", label: "Basic" },
            { key: "netSalary", label: "Net" },
            { key: "month", label: "Month" },
            { key: "status", label: "Status" },
          ]}
          rows={payroll.map((p) => ({
            staffName: String(p.staff?.fullName ?? p.staffName ?? p.staff_name ?? ""),
            basicSalary: `KSh ${Number(p.basicSalary ?? p.basic_salary ?? 0).toLocaleString()}`,
            netSalary: `KSh ${Number(p.netSalary ?? p.net_salary ?? p.basicSalary ?? 0).toLocaleString()}`,
            month: String(p.month ?? p.payPeriod ?? ""),
            status: String(p.status ?? "PROCESSED"),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
