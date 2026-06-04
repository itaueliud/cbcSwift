"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function PrincipalExpensesPage() {
  const session = useProtectedSession(["PRINCIPAL", "ADMIN"]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const [approving, setApproving] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    setExpenses(await apiFetch<Row[]>("/finance/expenses", {}, session.token));
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  async function approve(expenseId: string) {
    if (!session) return;
    try {
      setApproving(expenseId);
      await apiFetch(`/finance/expenses/${expenseId}/approve`, { method: "POST" }, session.token);
      await load();
    } finally {
      setApproving(null);
    }
  }

  if (!session) return null;

  const filteredExpenses = expenses.filter((e) => {
    const status = String(e.status ?? e.Status ?? "").toLowerCase();
    if (filter === "pending") return status === "pending";
    if (filter === "approved") return status === "approved";
    return true;
  });

  return (
    <DashboardShell title="Expense Approvals" subtitle="Approve finance submissions" badge="Principal" role="principal">
      <div className="section">
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            className={`tab-button ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
            style={filter === "pending" ? { opacity: 1, borderBottom: "2px solid #4f46e5" } : {}}
          >
            Pending ({expenses.filter((e) => String(e.status ?? e.Status ?? "").toLowerCase() === "pending").length})
          </button>
          <button
            className={`tab-button ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
            style={filter === "approved" ? { opacity: 1, borderBottom: "2px solid #4f46e5" } : {}}
          >
            Approved ({expenses.filter((e) => String(e.status ?? e.Status ?? "").toLowerCase() === "approved").length})
          </button>
          <button
            className={`tab-button ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
            style={filter === "all" ? { opacity: 1, borderBottom: "2px solid #4f46e5" } : {}}
          >
            All ({expenses.length})
          </button>
        </div>
        <DataTable
          columns={[
            { key: "category", label: "Category" },
            { key: "description", label: "Description" },
            { key: "amountKes", label: "Amount (KES)" },
            { key: "status", label: "Status" },
            { key: "action", label: "Action" },
          ]}
          rows={filteredExpenses.map((expense) => {
            const expenseId = String(expense.expenseId ?? expense.expense_id ?? "");
            const status = String(expense.status ?? expense.Status ?? "").toLowerCase();
            const amount = parseFloat(String(expense.amountKes ?? expense.amount_kes ?? "0"));
            return {
              expenseId,
              category: String(expense.category ?? ""),
              description: String(expense.description ?? ""),
              amountKes: `KSh ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              status: status === "approved" ? "✅ Approved" : "⏳ Pending",
              action: status === "approved" ? "—" : (
                <button
                  className="tab-button"
                  onClick={() => void approve(expenseId)}
                  disabled={approving === expenseId}
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    opacity: approving === expenseId ? 0.5 : 1,
                  }}
                >
                  {approving === expenseId ? "Approving..." : "Approve"}
                </button>
              ),
            };
          })}
        />
      </div>
    </DashboardShell>
  );
}
