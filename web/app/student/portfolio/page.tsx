"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function StudentPortfolioPage() {
  const session = useProtectedSession(["STUDENT"]);
  const [portfolio, setPortfolio] = useState<Row[]>([]);

  async function load() {
    if (!session) return;
    setPortfolio(await apiFetch<Row[]>("/student/portfolio", {}, session.token));
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  if (!session) return null;

  const getFileIcon = (fileType: string): string => {
    const type = String(fileType ?? "").toLowerCase();
    if (type.includes("pdf") || type.includes("document")) return "📄";
    if (type.includes("image") || type.includes("jpg") || type.includes("png")) return "🖼️";
    if (type.includes("video")) return "🎥";
    if (type.includes("audio")) return "🎵";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    return "📎";
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <DashboardShell title="My Portfolio" subtitle="Student evidence and CBC artifacts" badge="Student" role="student">
      <div className="section">
        {portfolio.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
            <p style={{ fontSize: "18px", fontWeight: "500" }}>📂 No portfolio items yet</p>
            <p style={{ fontSize: "14px" }}>Your teachers will upload evidence of your learning here</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {portfolio.map((item, idx) => {
              const fileType = String(item.fileType ?? item.file_type ?? "");
              const uploadedAt = String(item.uploadedAt ?? item.uploaded_at ?? "");
              return (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "16px",
                    background: "#fafafa",
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                    {getFileIcon(fileType)}
                  </div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#1a1a1a" }}>
                    {String(item.title ?? "")}
                  </h4>
                  <div style={{ marginBottom: "12px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: "#e0e7ff",
                        color: "#4f46e5",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {String(item.subject?.subjectName ?? item.subject_name ?? "General")}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                    <div>📁 Type: {fileType}</div>
                    <div>📅 Uploaded: {formatDate(uploadedAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
