"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

const expenseCategories = ["UTILITIES","SALARIES","MAINTENANCE","SUPPLIES","TRANSPORT","FOOD","EVENTS","OTHER"];

export default function FinanceExpensesPage() {
  const session = useProtectedSession(["FINANCE","ADMIN","PRINCIPAL","TEACHER"]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ category: "SUPPLIES", amount: "", description: "", receiptUrl: "" });

  async function load() {
    if (!session) return;
    try {
      const data = await apiFetch<Row[]>("/finance/expenses", {}, session.token);
      setExpenses(data);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function save() {
    if (!session || !form.amount || !form.description) return;
    setSaving(true);
    try {
      await apiFetch("/finance/expenses", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) }, session.token);
      setSaved(true);
      setForm((f) => ({ ...f, amount: "", description: "", receiptUrl: "" }));
      await load();
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  if (!session) return null;

  const total = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const approved = expenses.filter((e) => (e.status ?? e.approvalStatus ?? "") === "APPROVED").length;
  const pending = expenses.filter((e) => (e.status ?? e.approvalStatus ?? "") === "PENDING").length;

  return (
    <DashboardShell title="Expense Management" subtitle="Submit and track school expenditures" badge="Finance" role="finance">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Total Expenses" value={`KSh ${total.toLocaleString()}`} description="All time" />
          <StatCard label="Records" value={String(expenses.length)} description="Submitted" />
          <StatCard label="Approved" value={String(approved)} description="Cleared" />
          <StatCard label="Pending" value={String(pending)} description="Awaiting approval" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginTop: 24 }}>
        <div className="payment-form-card">
          <h3 style={{ marginBottom: 16 }}>📤 Submit Expense</h3>
          {saved && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(5,150,105,0.08)", color: "#065f46", fontWeight: 700, marginBottom: 14, fontSize: 13 }}>✅ Expense submitted!</div>}
          <div style={{ display: "grid", gap: 14 }}>
            <div className="field">
              <label>Category</label>
              <select className="login-select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {expenseCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Amount (KSh)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 12000" min="0" />
            </div>
            <div className="field">
              <label>Description</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the expense" />
            </div>
            <div className="field">
              <label>Receipt URL (optional)</label>
              <input value={form.receiptUrl} onChange={(e) => setForm((f) => ({ ...f, receiptUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <button type="button" className="btn-primary" style={{ padding: "12px 20px" }} onClick={save} disabled={saving || !form.amount || !form.description}>
              {saving ? "Submitting..." : "📤 Submit Expense"}
            </button>
          </div>
        </div>

        <div className="panel-card">
          <h3 style={{ marginBottom: 14 }}>📊 By Category</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {expenseCategories.map((cat) => {
              const catTotal = expenses.filter((e) => (e.category ?? e.expenseCategory ?? "") === cat).reduce((s, e) => s + Number(e.amount ?? 0), 0);
              const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
              if (catTotal === 0) return null;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <span style={{ fontWeight: 800 }}>KSh {catTotal.toLocaleString()} <span className="muted">({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: "linear-gradient(90deg, var(--brand), var(--accent))", transition: "width 600ms" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section">
        <h3>All Expense Records</h3>
        <DataTable
          columns={[
            { key: "category", label: "Category" },
            { key: "description", label: "Description" },
            { key: "amount", label: "Amount" },
            { key: "status", label: "Status" },
            { key: "submittedBy", label: "Submitted By" },
            { key: "createdAt", label: "Date" },
          ]}
          rows={expenses.map((e) => ({
            category: String(e.category ?? e.expenseCategory ?? ""),
            description: String(e.description ?? ""),
            amount: `KSh ${Number(e.amount ?? 0).toLocaleString()}`,
            status: String(e.status ?? e.approvalStatus ?? "PENDING"),
            submittedBy: String(e.submittedBy?.fullName ?? e.submitted_by ?? ""),
            createdAt: String(e.createdAt ?? e.created_at ?? ""),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
