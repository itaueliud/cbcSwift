"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;
type Grade = "EE" | "ME" | "AE" | "BE" | "";

const gradeConfig = {
  EE: { label: "Exceeds Expectation", color: "#059669", bg: "rgba(5,150,105,0.1)" },
  ME: { label: "Meets Expectation",   color: "#1d4ed8", bg: "rgba(29,78,216,0.1)" },
  AE: { label: "Approaches Expectation", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  BE: { label: "Below Expectation",  color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
};

export default function TeacherMarksPage() {
  const session = useProtectedSession(["TEACHER","ADMIN","PRINCIPAL"]);
  const [students, setStudents] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [marks, setMarks] = useState<Row[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [selectedSubject, setSelectedSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function load() {
    if (!session) return;
    try {
      const [studentList, subjectList, markList] = await Promise.all([
        apiFetch<Row[]>("/school/students", {}, session.token),
        apiFetch<Row[]>("/school/subjects", {}, session.token).catch(() => []),
        apiFetch<Row[]>("/teacher/marks", {}, session.token).catch(() => []),
      ]);
      setStudents(studentList);
      setSubjects(subjectList);
      setMarks(markList);
      if (subjectList[0]) setSelectedSubject(String(subjectList[0].subjectId ?? subjectList[0].subject_id ?? ""));
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  function setGrade(studentId: string, grade: Grade) {
    setGrades((prev) => ({ ...prev, [studentId]: grade }));
  }

  async function saveMarks() {
    if (!session) return;
    setSaving(true);
    try {
      const records = Object.entries(grades).map(([studentId, grade]) => ({ studentId, subjectId: selectedSubject, grade }));
      await apiFetch("/teacher/marks", { method: "POST", body: JSON.stringify({ records }) }, session.token);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await load();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  if (!session) return null;

  const enteredCount = Object.values(grades).filter((g) => g !== "").length;

  return (
    <DashboardShell title="CBC Mark Entry" subtitle="Enter EE / ME / AE / BE grades for students" badge="Teacher" role="teacher">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Students" value={String(students.length)} description="In class" />
          <StatCard label="Marks Entered" value={String(enteredCount)} description="This session" />
          <StatCard label="Subjects" value={String(subjects.length)} description="Available" />
          <StatCard label="Saved Marks" value={String(marks.length)} description="On record" />
        </div>
      </div>

      {/* Grade legend */}
      <div className="section">
        <h3>CBC Grade Scale</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(gradeConfig).map(([grade, cfg]) => (
            <div key={grade} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.color}28` }}>
              <span className={`grade-badge grade-${grade.toLowerCase()}`}>{grade}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{grade}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{cfg.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entry */}
      <div className="section">
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {subjects.length > 0 && (
              <select className="login-select" style={{ width: "auto" }} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                {subjects.map((s) => {
                  const id = String(s.subjectId ?? s.subject_id ?? "");
                  return <option key={id} value={id}>{String(s.subjectName ?? s.subject_name ?? id)}</option>;
                })}
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {saved && <span className="pill green">✅ Marks saved!</span>}
            <button type="button" className="btn-primary" style={{ width: "auto", padding: "10px 22px" }} onClick={saveMarks} disabled={saving || enteredCount === 0}>
              {saving ? "Saving..." : "💾 Save Marks"}
            </button>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "minmax(200px,2fr) repeat(4, minmax(0,1fr)) 80px", gap: 8, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            <span>Student</span>
            <span>EE</span><span>ME</span><span>AE</span><span>BE</span>
            <span>Grade</span>
          </div>

          {students.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 700 }}>No students loaded</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Connect to API to load your class.</div>
            </div>
          )}

          {students.map((student) => {
            const id = String(student.studentId ?? student.student_id ?? student.id ?? "");
            const name = String(student.fullName ?? student.full_name ?? `Student ${id}`);
            const grade = grades[id] ?? "";
            return (
              <div key={id} style={{ display: "grid", gridTemplateColumns: "minmax(200px,2fr) repeat(4, minmax(0,1fr)) 80px", gap: 8, padding: "12px 20px", borderBottom: "1px solid rgba(15,23,42,0.05)", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>ADM: {String(student.admissionNumber ?? student.admission_number ?? id)}</div>
                </div>
                {(["EE", "ME", "AE", "BE"] as Grade[]).map((g) => (
                  <button key={g} type="button"
                    className={`grade-badge grade-${g.toLowerCase()}`}
                    style={{ cursor: "pointer", border: grade === g ? `2px solid ${gradeConfig[g as keyof typeof gradeConfig].color}` : "2px solid transparent", opacity: grade && grade !== g ? 0.45 : 1, transition: "all 120ms", boxSizing: "border-box" }}
                    onClick={() => setGrade(id, grade === g ? "" : g)}>
                    {g}
                  </button>
                ))}
                <span className={`pill ${grade === "EE" ? "green" : grade === "ME" ? "" : grade === "AE" ? "amber" : grade === "BE" ? "red" : "gray"}`} style={{ fontSize: 12, textAlign: "center" }}>
                  {grade || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saved marks */}
      {marks.length > 0 && (
        <div className="section">
          <h3>Saved Marks</h3>
          <DataTable
            columns={[
              { key: "studentName", label: "Student" },
              { key: "subjectName", label: "Subject" },
              { key: "grade", label: "Grade" },
              { key: "term", label: "Term" },
              { key: "createdAt", label: "Date" },
            ]}
            rows={marks.map((m) => ({
              studentName: String(m.student?.fullName ?? m.studentName ?? m.student_name ?? ""),
              subjectName: String(m.subject?.subjectName ?? m.subjectName ?? m.subject_name ?? ""),
              grade: String(m.grade ?? ""),
              term: String(m.term ?? m.termName ?? ""),
              createdAt: String(m.createdAt ?? m.created_at ?? ""),
            }))}
          />
        </div>
      )}
    </DashboardShell>
  );
}
