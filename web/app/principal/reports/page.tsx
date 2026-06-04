"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function PrincipalReportsPage() {
  const session = useProtectedSession(["PRINCIPAL", "ADMIN"]);
  const [reports, setReports] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "published">("pending");
  const [approving, setApproving] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    setReports(await apiFetch<Row[]>("/principal/reports", {}, session.token));
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  async function approve(reportId: string) {
    if (!session) return;
    try {
      setApproving(reportId);
      await apiFetch(`/principal/reports/${reportId}/approve`, { method: "POST" }, session.token);
      await load();
    } finally {
      setApproving(null);
    }
  }

  if (!session) return null;

  const filteredReports = reports.filter((r) => {
    const isPublished = r.isPublished ?? r.is_published ?? false;
    if (filter === "pending") return !isPublished;
    if (filter === "published") return isPublished;
    return true;
  });

  return (
    <DashboardShell title="Report Approvals" subtitle="Principal publishing queue" badge="Principal" role="principal">
      <div className="section">
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            className={`tab-button ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
            style={filter === "pending" ? { opacity: 1, borderBottom: "2px solid #4f46e5" } : {}}
          >
            Pending ({reports.filter((r) => !(r.isPublished ?? r.is_published ?? false)).length})
          </button>
          <button
            className={`tab-button ${filter === "published" ? "active" : ""}`}
            onClick={() => setFilter("published")}
            style={filter === "published" ? { opacity: 1, borderBottom: "2px solid #4f46e5" } : {}}
          >
            Published ({reports.filter((r) => r.isPublished ?? r.is_published ?? false).length})
          </button>
          <button
            className={`tab-button ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
            style={filter === "all" ? { opacity: 1, borderBottom: "2px solid #4f46e5" } : {}}
          >
            All ({reports.length})
          </button>
        </div>
        <DataTable
          columns={[
            { key: "studentName", label: "Student" },
            { key: "className", label: "Class" },
            { key: "termName", label: "Term" },
            { key: "reportType", label: "Type" },
            { key: "status", label: "Status" },
            { key: "action", label: "Action" },
          ]}
          rows={filteredReports.map((report) => {
            const reportId = String(report.reportId ?? report.report_id ?? "");
            const isPublished = report.isPublished ?? report.is_published ?? false;
            return {
              reportId,
              studentName: String(report.student?.fullName ?? report.student_name ?? ""),
              className: String(report.class?.className ?? report.class_name ?? ""),
              termName: String(report.term?.termName ?? report.term_name ?? ""),
              reportType: String(report.reportType ?? report.report_type ?? ""),
              status: isPublished ? "✅ Published" : "⏳ Pending",
              action: isPublished ? "—" : (
                <button
                  className="tab-button"
                  onClick={() => void approve(reportId)}
                  disabled={approving === reportId}
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    opacity: approving === reportId ? 0.5 : 1,
                  }}
                >
                  {approving === reportId ? "Publishing..." : "Approve"}
                </button>
              ),
            };
          })}
        />
      </div>
    </DashboardShell>
  );
}
