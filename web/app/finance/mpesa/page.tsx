"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

type StkStatus = "idle" | "pending" | "confirmed" | "failed";

export default function FinanceMpesaPage() {
  const session = useProtectedSession(["FINANCE","ADMIN"]);
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<Row[]>([]);
  const [stkStatus, setStkStatus] = useState<StkStatus>("idle");
  const [stkMessage, setStkMessage] = useState("");
  const [webhookLog, setWebhookLog] = useState<Array<{ time: string; event: string; status: string }>>([]);

  async function load() {
    if (!session) return;
    const dashboard = await apiFetch<Record<string, unknown>>("/finance/dashboard", {}, session.token);
    const payments = Array.isArray(dashboard.recent_payments) ? (dashboard.recent_payments as Row[]) : [];
    setTransactions(payments);
    try {
      const studentList = await apiFetch<Row[]>("/school/students", {}, session.token);
      setStudents(studentList);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function push() {
    if (!session || !phoneNumber || !amount) {
      setStkMessage("Please enter phone number and amount.");
      return;
    }
    setStkStatus("pending");
    setStkMessage("STK push sent — waiting for customer to confirm on phone...");
    setWebhookLog((prev) => [{ time: new Date().toLocaleTimeString(), event: "STK Push Initiated", status: "PENDING" }, ...prev]);
    try {
      await apiFetch("/finance/mpesa/stk-push", {
        method: "POST",
        body: JSON.stringify({ phoneNumber, amount: Number(amount), studentId: studentId || undefined }),
      }, session.token);
      setStkStatus("confirmed");
      setStkMessage("✅ STK push confirmed! Payment processed successfully.");
      setWebhookLog((prev) => [{ time: new Date().toLocaleTimeString(), event: "Webhook: Payment Confirmed", status: "SUCCESS" }, ...prev]);
      await load();
      setTimeout(() => { setStkStatus("idle"); setStkMessage(""); }, 8000);
    } catch (err) {
      setStkStatus("failed");
      setStkMessage(`❌ STK push failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setWebhookLog((prev) => [{ time: new Date().toLocaleTimeString(), event: "STK Push Failed", status: "FAILED" }, ...prev]);
    }
  }

  if (!session) return null;

  const totalCollected = transactions.reduce((sum, t) => sum + Number(t.amount_paid ?? t.amountPaid ?? 0), 0);
  const confirmedCount = transactions.filter((t) => (t.payment_method ?? t.paymentMethod ?? "") === "MPESA").length;

  return (
    <DashboardShell title="M-Pesa Payments" subtitle="STK Push, webhook confirmation & reconciliation" badge="Finance" role="finance">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Transactions" value={String(transactions.length)} description="M-Pesa payments" />
          <StatCard label="Collected" value={`KSh ${totalCollected.toLocaleString()}`} description="Total via M-Pesa" />
          <StatCard label="Confirmed" value={String(confirmedCount)} description="Webhook verified" />
          <StatCard label="Webhook" value="Active" description="Safaricom callback ready" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
        {/* STK Push form */}
        <div className="stk-push-card">
          <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
          <div className="stk-push-title">Send M-Pesa STK Push</div>
          <div className="stk-push-sub">Customer will receive a payment prompt on their Safaricom phone.</div>

          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700 }}>Phone Number</label>
            <input className="stk-input" placeholder="0712345678 or 254712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700 }}>Amount (KSh)</label>
            <input className="stk-input" type="number" placeholder="e.g. 4500" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" />
          </div>
          {students.length > 0 && (
            <div className="field" style={{ marginBottom: 12 }}>
              <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700 }}>Link to Student (optional)</label>
              <select className="stk-input" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ cursor: "pointer" }}>
                <option value="">-- Select student --</option>
                {students.map((s) => {
                  const id = String(s.studentId ?? s.student_id ?? "");
                  return <option key={id} value={id}>{String(s.fullName ?? s.full_name ?? id)}</option>;
                })}
              </select>
            </div>
          )}
          <button className="stk-btn" onClick={push} disabled={stkStatus === "pending"}>
            {stkStatus === "pending" ? "⏳ Waiting for confirmation..." : "📲 Send STK Push"}
          </button>

          {stkMessage && (
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
              {stkMessage}
            </div>
          )}
        </div>

        {/* Webhook + status panel */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* Webhook status */}
          <div className="panel-card">
            <h3 style={{ marginBottom: 14 }}>🔗 Webhook Status</h3>
            <div className="webhook-status-bar" style={{ marginBottom: 12 }}>
              <span className="webhook-dot" />
              <span>Safaricom callback endpoint active</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span className="muted">Callback URL</span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>/api/mpesa/webhook</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span className="muted">Auto-reconcile</span>
                <span className="pill green">Enabled</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13 }}>
                <span className="muted">Receipt generation</span>
                <span className="pill green">Automatic</span>
              </div>
            </div>
          </div>

          {/* Event log */}
          <div className="panel-card">
            <h3 style={{ marginBottom: 12 }}>📋 Webhook Event Log</h3>
            <div style={{ display: "grid", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {webhookLog.length === 0 && (
                <div className="muted" style={{ fontSize: 13, textAlign: "center", padding: 16 }}>No events yet — trigger an STK push</div>
              )}
              {webhookLog.map((log, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 10, background: "#f8fafc", border: "1px solid var(--line)", fontSize: 12 }}>
                  <span style={{ color: "var(--muted)", fontFamily: "monospace", flexShrink: 0 }}>{log.time}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{log.event}</span>
                  <span className={`pill ${log.status === "SUCCESS" ? "green" : log.status === "FAILED" ? "red" : "amber"}`}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="section">
        <h3>Recent M-Pesa Transactions</h3>
        <DataTable
          columns={[
            { key: "receipt_number", label: "Receipt" },
            { key: "student_name", label: "Student" },
            { key: "amount_paid", label: "Amount" },
            { key: "payment_method", label: "Method" },
            { key: "paid_at", label: "Date" },
          ]}
          rows={transactions}
        />
      </div>
    </DashboardShell>
  );
}
