"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, unknown>;
type StkStatus = "idle" | "pending" | "confirmed" | "failed";

export default function ParentFeesPage() {
  const session = useProtectedSession(["PARENT"]);
  const [dashboard, setDashboard] = useState<Row | null>(null);
  const [children, setChildren] = useState<Row[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [stkStatus, setStkStatus] = useState<StkStatus>("idle");
  const [stkMessage, setStkMessage] = useState("");
  const [receipts, setReceipts] = useState<Row[]>([]);

  async function load() {
    if (!session) return;
    try {
      const data = await apiFetch<Row>("/parent/dashboard", {}, session.token);
      setDashboard(data);
      const childList = Array.isArray(data.children) ? (data.children as Row[]) : [];
      setChildren(childList);
      if (!selectedChild && childList[0]) {
        const firstId = String(childList[0].studentId ?? "");
        setSelectedChild(firstId);
      }
      // Phone pre-fill from parent record
      if (data.parent && (data.parent as Row).phonePrimary) {
        setPhone(String((data.parent as Row).phonePrimary ?? ""));
      }
    } catch (e) {
      console.error("Failed to load parent dashboard", e);
    }
  }

  async function loadReceipts() {
    if (!session || !selectedChild) return;
    try {
      const data = await apiFetch<Row[]>(`/parent/fees?studentId=${selectedChild}`, {}, session.token);
      setReceipts(Array.isArray(data) ? data : []);
    } catch { setReceipts([]); }
  }

  useEffect(() => { if (session) void load(); }, [session]);
  useEffect(() => { if (session && selectedChild) void loadReceipts(); }, [session, selectedChild]);

  async function sendStkPush() {
    if (!session || !phone || !amount) { setStkMessage("Please enter phone number and amount."); return; }
    setStkStatus("pending");
    setStkMessage("📲 STK push sent — check your Safaricom phone...");
    try {
      await apiFetch("/finance/mpesa/stk-push", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: phone, amount: Number(amount), studentId: selectedChild || undefined }),
      }, session.token);
      setStkStatus("confirmed");
      setStkMessage("✅ Payment confirmed! Your fee balance will update shortly.");
      await load();
      await loadReceipts();
      setTimeout(() => { setStkStatus("idle"); setStkMessage(""); }, 8000);
    } catch (err) {
      setStkStatus("failed");
      setStkMessage(`❌ Payment failed: ${err instanceof Error ? err.message : "Please try again."}`);
    }
  }

  if (!session) return null;

  const selectedChildData = children.find((c) => String(c.studentId ?? "") === selectedChild);
  const feePaid = Number(selectedChildData?.fees_paid ?? 0);
  const feeBalance = Number(selectedChildData?.fee_balance ?? 0);
  const totalChildFee = feePaid + feeBalance;

  const receiptRows = receipts.map((p) => ({
    Receipt: String(p.receiptNumber ?? p.receipt_number ?? ""),
    "Fee Type": String(p.feeType ?? p.fee_type ?? ""),
    Amount: `KSh ${Number(p.amountPaid ?? p.amount_paid ?? 0).toLocaleString()}`,
    Method: String(p.paymentMethod ?? p.payment_method ?? ""),
    "M-Pesa Code": String(p.mpesaCode ?? p.mpesa_code ?? "—"),
    Date: new Date(String(p.paidAt ?? p.paid_at ?? new Date())).toLocaleDateString("en-KE"),
  }));

  return (
    <DashboardShell title="Fee Payments" subtitle="Pay school fees via M-Pesa" badge="Parent" role="parent">
      {/* Child selector */}
      {children.length > 1 && (
        <div className="section" style={{ marginTop: 0, marginBottom: 0 }}>
          <div className="panel-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>👤 Viewing fees for:</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {children.map((c) => {
                const id = String(c.studentId ?? "");
                const isSelected = id === selectedChild;
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedChild(id)}
                    style={{
                      padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                      background: isSelected ? "var(--accent)" : "rgba(255,255,255,0.06)",
                      color: isSelected ? "#fff" : "var(--muted)",
                      transition: "all 0.2s",
                    }}
                  >
                    {String(c.fullName ?? id)}
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                      {String(c.admissionNumber ?? c.currentGrade ?? "")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="section" style={{ marginTop: 16 }}>
        <div className="card-grid">
          <StatCard label="Total Fee" value={`KSh ${totalChildFee.toLocaleString()}`} description="Full term amount" />
          <StatCard label="Amount Paid" value={`KSh ${feePaid.toLocaleString()}`} description="Confirmed payments" />
          <StatCard label="Balance Due" value={`KSh ${feeBalance.toLocaleString()}`} description={feeBalance > 0 ? "⚠️ Outstanding" : "✅ Cleared"} />
          <StatCard label="Receipts" value={String(receipts.length)} description="Payment records" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 4 }}>
        {/* STK Push form */}
        <div className="stk-push-card">
          <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
          <div className="stk-push-title">Pay School Fees via M-Pesa</div>
          <div className="stk-push-sub">Enter your M-Pesa number to receive a payment prompt.</div>

          {selectedChildData && (
            <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Paying for</div>
              <div style={{ fontWeight: 700, color: "#fff" }}>{String(selectedChildData.fullName ?? "")}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{String(selectedChildData.currentGrade ?? "")} · {String(selectedChildData.admissionNumber ?? "")}</div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>M-Pesa Phone Number</label>
            <input className="stk-input" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>Amount (KSh)</label>
            <input className="stk-input" type="number" placeholder={`e.g. ${feeBalance || 4500}`} value={amount} onChange={(e) => setAmount(e.target.value)} min="1" />
            {feeBalance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(feeBalance))}
                style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Pay full balance (KSh {feeBalance.toLocaleString()})
              </button>
            )}
          </div>
          <button className="stk-btn" onClick={sendStkPush} disabled={stkStatus === "pending"}>
            {stkStatus === "pending" ? "⏳ Awaiting confirmation..." : "📲 Pay with M-Pesa"}
          </button>
          {stkMessage && (
            <div style={{
              marginTop: 14, padding: "12px 14px", borderRadius: 12,
              background: stkStatus === "confirmed" ? "rgba(5,150,105,0.15)" : stkStatus === "failed" ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${stkStatus === "confirmed" ? "rgba(5,150,105,0.3)" : stkStatus === "failed" ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.12)"}`,
              fontSize: 13, color: "rgba(255,255,255,0.9)",
            }}>
              {stkMessage}
            </div>
          )}
        </div>

        {/* Summary + instructions */}
        <div style={{ display: "grid", gap: 14 }}>
          <div className="panel-card">
            <h3 style={{ marginBottom: 14 }}>💳 Fee Summary{selectedChildData ? ` — ${String(selectedChildData.fullName ?? "")}` : ""}</h3>
            <div style={{ display: "grid", gap: 8 }}>
              {[
                { label: "Term fee",         value: `KSh ${totalChildFee.toLocaleString()}` },
                { label: "Amount paid",      value: `KSh ${feePaid.toLocaleString()}`,    color: "#059669" },
                { label: "Balance due",      value: `KSh ${feeBalance.toLocaleString()}`, color: feeBalance > 0 ? "#dc2626" : "#059669" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="muted" style={{ fontSize: 14 }}>{row.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: row.color ?? "var(--text)" }}>{row.value}</span>
                </div>
              ))}
            </div>
            {feeBalance > 0 && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
                ⚠️ Please clear your balance to avoid late payment penalties.
              </div>
            )}
            {feeBalance === 0 && feePaid > 0 && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)", fontSize: 13, color: "#059669", fontWeight: 600 }}>
                ✅ All fees cleared. Thank you!
              </div>
            )}
          </div>

          <div className="panel-card">
            <h3 style={{ marginBottom: 12 }}>ℹ️ How to Pay via M-Pesa</h3>
            <ol style={{ paddingLeft: 18, display: "grid", gap: 8, margin: 0 }}>
              {[
                "Select the child you are paying for above.",
                "Enter your M-Pesa registered phone number.",
                "Enter the amount to pay (or tap 'Pay full balance').",
                "Click 'Pay with M-Pesa' — an STK prompt will appear on your phone.",
                "Enter your M-Pesa PIN to confirm the payment.",
                "A receipt will be generated and emailed to you automatically.",
              ].map((step, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="section">
        <div className="section-head-sm">
          <h2>🧾 Payment History{selectedChildData ? ` — ${String(selectedChildData.fullName ?? "")}` : ""}</h2>
          <span className="muted">{receipts.length} records</span>
        </div>
        {receiptRows.length > 0 ? (
          <DataTable
            columns={["Receipt", "Fee Type", "Amount", "Method", "M-Pesa Code", "Date"]}
            rows={receiptRows}
          />
        ) : (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)", background: "var(--card)", borderRadius: 16 }}>
            No payment records found for this child.
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
