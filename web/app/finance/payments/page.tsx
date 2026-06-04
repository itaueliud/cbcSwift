"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

const paymentMethods = [
  { value: "MPESA", label: "M-Pesa", icon: "📱" },
  { value: "CASH",  label: "Cash",   icon: "💵" },
  { value: "BANK",  label: "Bank Transfer", icon: "🏦" },
  { value: "CHEQUE",label: "Cheque", icon: "📄" },
];

export default function FinancePaymentsPage() {
  const session = useProtectedSession(["FINANCE", "ADMIN", "PRINCIPAL"]);
  const [payments,       setPayments]       = useState<Row[]>([]);
  const [paymentIntents, setPaymentIntents] = useState<Row[]>([]);
  const [feeStructures,  setFeeStructures]  = useState<Row[]>([]);
  const [students,       setStudents]       = useState<Row[]>([]);
  const [activeTab, setActiveTab]           = useState<"receipts" | "record" | "intents">("receipts");
  const [saving,     setSaving]             = useState(false);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]           = useState<string | null>(null);
  const [form, setForm] = useState({
    studentId: "", feeStructureId: "", amountPaid: "0",
    paymentMethod: "MPESA", mpesaCode: "", notes: "",
  });

  async function load() {
    if (!session) return;
    try {
      const [paymentList, intentList, feeList, studentList] = await Promise.all([
        apiFetch<Row[]>("/finance/payments", {}, session.token),
        apiFetch<Row[]>("/finance/payment-intents", {}, session.token).catch(() => []),
        apiFetch<Row[]>("/finance/fee-structures", {}, session.token),
        apiFetch<Row[]>("/school/students", {}, session.token),
      ]);
      setPayments(paymentList);
      setPaymentIntents(intentList);
      setFeeStructures(feeList);
      setStudents(studentList);
      setForm((f) => ({
        ...f,
        studentId: f.studentId || String(studentList[0]?.studentId ?? ""),
        feeStructureId: f.feeStructureId || String(feeList[0]?.feeStructureId ?? ""),
      }));
    } catch (e) { console.error(e); }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function save() {
    if (!session) return;
    if (!form.studentId || !form.feeStructureId || Number(form.amountPaid) <= 0) {
      setErrorMsg("Please fill all required fields and enter an amount greater than 0.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await apiFetch("/finance/payments", {
        method: "POST",
        body: JSON.stringify({ ...form, amountPaid: Number(form.amountPaid) }),
      }, session.token);
      setSuccessMsg("✅ Payment recorded successfully!");
      setForm((f) => ({ ...f, amountPaid: "0", mpesaCode: "", notes: "" }));
      await load();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`❌ ${err instanceof Error ? err.message : "Failed to record payment"}`);
    } finally { setSaving(false); }
  }

  async function generateReceipt(paymentId: string) {
    if (!session) return;
    try {
      await apiFetch(`/finance/payments/${paymentId}/receipt`, { method: "POST" }, session.token);
      setSuccessMsg("✅ Receipt generated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(`❌ ${err instanceof Error ? err.message : "Failed to generate receipt"}`);
    }
  }

  const rows = useMemo(() => payments.map((p) => ({
    "#": String(p.receiptNumber ?? p.receipt_number ?? ""),
    Student: String(p.student?.fullName ?? p.studentName ?? p.student_name ?? ""),
    "Adm No": String(p.student?.admissionNumber ?? p.admissionNumber ?? ""),
    "Fee Type": String(p.feeStructure?.feeType ?? p.feeType ?? p.fee_type ?? ""),
    Amount: `KSh ${Number(p.amountPaid ?? p.amount_paid ?? 0).toLocaleString()}`,
    Method: String(p.paymentMethod ?? p.payment_method ?? ""),
    "M-Pesa Code": String(p.mpesaCode ?? p.mpesa_code ?? "—"),
    "Recorded By": String(p.recorder?.fullName ?? p.recorded_by_name ?? "—"),
    Date: new Date(String(p.paidAt ?? p.paid_at ?? new Date())).toLocaleDateString("en-KE"),
  })), [payments]);

  const intentRows = useMemo(() => paymentIntents.map((pi) => ({
    Ref: String(pi.referenceCode ?? pi.reference_code ?? ""),
    Student: String(pi.student?.fullName ?? pi.studentName ?? ""),
    Amount: `KSh ${Number(pi.amount ?? 0).toLocaleString()}`,
    Method: String(pi.paymentMethod ?? "MPESA"),
    Status: String(pi.status ?? "PENDING"),
    Phone: String(pi.phoneNumber ?? "—"),
    Created: new Date(String(pi.createdAt ?? new Date())).toLocaleDateString("en-KE"),
  })), [paymentIntents]);

  const totalCollected = useMemo(() => payments.reduce((s, p) => s + Number(p.amountPaid ?? p.amount_paid ?? 0), 0), [payments]);
  const mpesaTotal = useMemo(() => payments.filter((p) => (p.paymentMethod ?? p.payment_method ?? "") === "MPESA").reduce((s, p) => s + Number(p.amountPaid ?? 0), 0), [payments]);
  const cashTotal  = useMemo(() => payments.filter((p) => (p.paymentMethod ?? p.payment_method ?? "") === "CASH").reduce((s, p) => s + Number(p.amountPaid ?? 0), 0), [payments]);

  if (!session) return null;

  return (
    <DashboardShell title="Fee Collection" subtitle="Record, manage and track all school payments" badge="Finance" role="finance">
      {/* Stats */}
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Total Collected" value={`KSh ${totalCollected.toLocaleString()}`} description={`${payments.length} receipts`} />
          <StatCard label="M-Pesa Total"    value={`KSh ${mpesaTotal.toLocaleString()}`}    description="Digital payments" />
          <StatCard label="Cash Total"      value={`KSh ${cashTotal.toLocaleString()}`}      description="Manual payments" />
          <StatCard label="Students"        value={String(students.length)}                  description="On record" />
        </div>
      </div>

      {/* Success / error banners */}
      {successMsg && (
        <div style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", color: "#059669", fontWeight: 600, fontSize: 14 }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626", fontWeight: 600, fontSize: 14 }}>
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="section">
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
          {(["receipts", "record", "intents"] as const).map((tab) => (
            <button key={tab} type="button" className="tab-button" data-active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab === "receipts" ? "🧾 Receipts" : tab === "record" ? "➕ Record Payment" : "📋 Payment Intents"}
            </button>
          ))}
        </div>

        {/* Receipts Tab */}
        {activeTab === "receipts" && (
          <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>All Payment Receipts</h3>
              <span className="muted">{rows.length} records</span>
            </div>
            <DataTable columns={["#", "Student", "Adm No", "Fee Type", "Amount", "Method", "M-Pesa Code", "Recorded By", "Date"]} rows={rows} />
          </>
        )}

        {/* Record Payment Tab */}
        {activeTab === "record" && (
          <div className="panel-card" style={{ maxWidth: 640 }}>
            <h3 style={{ marginBottom: 20 }}>➕ Record Manual Payment</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label>Student *</label>
                <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}>
                  <option value="">— Select student —</option>
                  {students.map((s) => (
                    <option key={String(s.studentId ?? "")} value={String(s.studentId ?? "")}>
                      {String(s.fullName ?? "")} ({String(s.admissionNumber ?? "")})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Fee Structure *</label>
                <select value={form.feeStructureId} onChange={(e) => setForm((f) => ({ ...f, feeStructureId: e.target.value }))}>
                  <option value="">— Select fee type —</option>
                  {feeStructures.map((fs) => (
                    <option key={String(fs.feeStructureId ?? "")} value={String(fs.feeStructureId ?? "")}>
                      {String(fs.feeType ?? "")} — KSh {Number(fs.amountKes ?? 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Amount (KSh) *</label>
                <input type="number" min="1" value={form.amountPaid} onChange={(e) => setForm((f) => ({ ...f, amountPaid: e.target.value }))} />
              </div>
              <div className="field">
                <label>Payment Method *</label>
                <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                  {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
                </select>
              </div>
              {form.paymentMethod === "MPESA" && (
                <div className="field">
                  <label>M-Pesa Code</label>
                  <input placeholder="e.g. QAB123456" value={form.mpesaCode} onChange={(e) => setForm((f) => ({ ...f, mpesaCode: e.target.value }))} />
                </div>
              )}
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Notes</label>
                <input placeholder="Optional notes about this payment" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button type="button" className="btn-primary" onClick={save} disabled={saving} style={{ minWidth: 140 }}>
                {saving ? "Recording..." : "✅ Record Payment"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setForm({ studentId: "", feeStructureId: "", amountPaid: "0", paymentMethod: "MPESA", mpesaCode: "", notes: "" })}>
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Payment Intents Tab */}
        {activeTab === "intents" && (
          <>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>M-Pesa Payment Intents</h3>
              <span className="muted">{intentRows.length} records</span>
            </div>
            <DataTable columns={["Ref", "Student", "Amount", "Method", "Status", "Phone", "Created"]} rows={intentRows} />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
