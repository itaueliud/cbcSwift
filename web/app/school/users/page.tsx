"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function SchoolUsersPage() {
  const session = useProtectedSession(["ADMIN", "PRINCIPAL"]);
  const [users, setUsers] = useState<Row[]>([]);
  
  async function load() {
    if (!session) return;
    try {
      const payload = await apiFetch<Row[]>("/school/users", {}, session.token);
      setUsers(payload);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function resetPassword(userId: string) {
    if (!session || !confirm("Reset password for this user?")) return;
    try {
      await apiFetch(`/school/users/${userId}/reset-password`, { method: "POST" }, session.token);
      alert("Password reset email sent (mocked).");
    } catch {
      alert("Failed to reset password.");
    }
  }

  async function toggleBlock(userId: string, currentStatus: boolean) {
    if (!session) return;
    const action = currentStatus ? "block" : "unblock";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      await apiFetch(`/school/users/${userId}`, { 
        method: "PATCH", 
        body: JSON.stringify({ isBlocked: !currentStatus }) 
      }, session.token);
      await load();
    } catch {
      alert(`Failed to ${action} user.`);
    }
  }

  if (!session) return null;

  return (
    <DashboardShell title="User Management" subtitle="Manage school access, passwords, and statuses" badge="School Admin" role="school">
      <div className="section" style={{ marginTop: 0 }}>
        <h3 style={{ marginBottom: 16 }}>School Users</h3>
        <DataTable
          columns={[
            { key: "fullName", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status", render: (row) => (
              <span style={{ 
                background: row.isBlocked ? "rgba(220, 38, 38, 0.1)" : "rgba(5, 150, 105, 0.1)", 
                color: row.isBlocked ? "#dc2626" : "#059669", 
                padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 
              }}>
                {row.isBlocked ? "BLOCKED" : "ACTIVE"}
              </span>
            )},
            { key: "actions", label: "Actions", render: (row) => (
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className="btn-ghost" 
                  style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6 }} 
                  onClick={() => { alert(`Edit ${row.fullName}`); }}
                >
                  Edit
                </button>
                <button 
                  className="btn-ghost" 
                  style={{ padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6 }} 
                  onClick={() => resetPassword(row.userId)}
                >
                  Reset Pwd
                </button>
                <button 
                  className="btn-ghost" 
                  style={{ color: row.isBlocked ? "green" : "red", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6 }} 
                  onClick={() => toggleBlock(row.userId, !!row.isBlocked)}
                >
                  {row.isBlocked ? "Unblock" : "Block"}
                </button>
                <button 
                  className="btn-ghost" 
                  style={{ color: "red", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 6 }} 
                  onClick={() => { if(confirm("Are you sure?")) alert(`Deleted ${row.fullName}`); }}
                >
                  Delete
                </button>
              </div>
            )}
          ]}
          rows={users.map((u) => ({
            ...u,
            fullName: String(u.fullName ?? u.full_name ?? ""),
            email: String(u.email ?? ""),
            role: String(u.role ?? "USER"),
            isBlocked: Boolean(u.isBlocked ?? u.is_blocked),
            userId: String(u.userId ?? u.user_id ?? ""),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
