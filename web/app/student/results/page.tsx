"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

const gradeColors: Record<string, { bg: string; color: string }> = {
  EE: { bg: "rgba(5,150,105,0.1)",  color: "#059669" },
  ME: { bg: "rgba(29,78,216,0.1)",  color: "#1d4ed8" },
  AE: { bg: "rgba(245,158,11,0.1)", color: "#b45309" },
  BE: { bg: "rgba(220,38,38,0.08)", color: "#dc2626" },
};

export default function StudentResultsPage() {
  const session = useProtectedSession(["STUDENT","PARENT","TEACHER","ADMIN"]);
  const [results, setResults] = useState<Row[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [terms, setTerms] = useState<string[]>([]);

  useEffect(() => {
    if (!session) return;
    apiFetch<Row[]>("/student/results", {}, session.token)
      .then((data) => {
        setResults(data);
        const termSet = Array.from(new Set(data.map((r) => String(r.term ?? r.termName ?? ""))));
        setTerms(termSet);
        if (termSet[0]) setSelectedTerm(termSet[0]);
      })
      .catch(() => {});
  }, [session]);

  if (!session) return null;

  const filtered = selectedTerm ? results.filter((r) => String(r.term ?? r.termName ?? "") === selectedTerm) : results;
  const eeCount = filtered.filter((r) => r.grade === "EE").length;
  const meCount = filtered.filter((r) => r.grade === "ME").length;
  const aeCount = filtered.filter((r) => r.grade === "AE").length;
  const beCount = filtered.filter((r) => r.grade === "BE").length;

  return (
    <DashboardShell title="My Results" subtitle="CBC grades and performance across subjects" badge="Student" role="student">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Published Results" value={String(results.length)} description="All terms" />
          <StatCard label="EE Grades" value={String(eeCount)} description="Exceeds expectation" />
          <StatCard label="ME Grades" value={String(meCount)} description="Meets expectation" />
          <StatCard label="AE / BE" value={String(aeCount + beCount)} description="Needs attention" />
        </div>
      </div>

      {/* Grade legend */}
      <div className="section">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { grade: "EE", label: "Exceeds Expectation" },
            { grade: "ME", label: "Meets Expectation" },
            { grade: "AE", label: "Approaches Expectation" },
            { grade: "BE", label: "Below Expectation" },
          ].map(({ grade, label }) => {
            const cfg = gradeColors[grade];
            return (
              <div key={grade} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 14px", borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}28` }}>
                <span className={`grade-badge grade-${grade.toLowerCase()}`}>{grade}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        {terms.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {terms.map((term) => (
              <button key={term} type="button" className="tab-button" data-active={selectedTerm === term} onClick={() => setSelectedTerm(term)} style={{ padding: "8px 16px", fontSize: 13 }}>
                {term}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "white", borderRadius: 20, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>No results published yet</div>
            <div className="muted" style={{ marginTop: 6 }}>Your teacher will publish results after assessment.</div>
          </div>
        ) : (
          <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1fr 1fr 1fr", gap: 12, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
              <span>Subject</span>
              <span>Grade</span>
              <span>Term</span>
              <span>Date</span>
            </div>
            {filtered.map((result, i) => {
              const grade = String(result.grade ?? "");
              const cfg = gradeColors[grade] ?? { bg: "#f8fafc", color: "var(--muted)" };
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) 1fr 1fr 1fr", gap: 12, padding: "14px 20px", borderBottom: "1px solid rgba(15,23,42,0.05)", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{String(result.subject?.subjectName ?? result.subjectName ?? result.subject_name ?? "Subject")}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{String(result.learningArea ?? result.learning_area ?? "")}</div>
                  </div>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 800, fontSize: 14 }}>{grade || "—"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{String(result.term ?? result.termName ?? "")}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{String(result.createdAt ?? result.created_at ?? "")}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
