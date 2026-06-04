"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function StudentAssignmentsPage() {
  const session = useProtectedSession(["STUDENT"]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [student, setStudent] = useState<Row | null>(null);

  async function load() {
    if (!session) return;
    const dashboard = await apiFetch<Record<string, any>>("/student/dashboard", {}, session.token);
    setStudent(dashboard.student ?? null);
    setAssignments(Array.isArray(dashboard.assignments) ? dashboard.assignments : []);
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  const getDaysUntil = (dueDate: string): number => {
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  };

  const formatDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    return date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusBadge = (dueDate: string): string => {
    const daysUntil = getDaysUntil(dueDate);
    if (daysUntil < 0) return "🔴 Overdue";
    if (daysUntil === 0) return "🟠 Due today";
    if (daysUntil <= 3) return "🟡 Due soon";
    return "🟢 On time";
  };

  if (!session) return null;

  return (
    <DashboardShell title="My Assignments" subtitle="Student task list and deadlines" badge="Student" role="student">
      <div className="section">
        {assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
            <p style={{ fontSize: "18px", fontWeight: "500" }}>No assignments yet</p>
            <p style={{ fontSize: "14px" }}>Check back later for new assignments from your teachers</p>
          </div>
        ) : (
          <DataTable
            columns={[
              { key: "title", label: "Title" },
              { key: "subjectName", label: "Subject" },
              { key: "dueInfo", label: "Due date" },
              { key: "daysLeft", label: "Days left" },
              { key: "status", label: "Status" },
              { key: "maxScore", label: "Max score" },
            ]}
            rows={assignments.map((assignment) => {
              const dueDate = String(assignment.dueDate ?? assignment.due_date ?? "");
              const daysUntil = getDaysUntil(dueDate);
              return {
                title: String(assignment.title ?? ""),
                subjectName: String(assignment.subjectName ?? assignment.subject_name ?? ""),
                dueInfo: formatDueDate(dueDate),
                daysLeft: daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : daysUntil === 0 ? "Today" : `${daysUntil}d`,
                status: getStatusBadge(dueDate),
                maxScore: String(assignment.maxScore ?? assignment.max_score ?? "0"),
              };
            })}
          />
        )}
      </div>
    </DashboardShell>
  );
}
