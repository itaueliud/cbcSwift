"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;
type Status = "PRESENT" | "ABSENT" | "LATE" | "";

export default function TeacherAttendancePage() {
  const session = useProtectedSession(["TEACHER","ADMIN","PRINCIPAL"]);
  const [students, setStudents] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  async function load() {
    if (!session) return;
    try {
      const [classList, studentList] = await Promise.all([
        apiFetch<Row[]>("/school/classes", {}, session.token),
        apiFetch<Row[]>("/school/students", {}, session.token),
      ]);
      setClasses(classList);
      setStudents(studentList);
      if (classList[0]) setSelectedClass(String(classList[0].classId ?? classList[0].class_id ?? ""));
    } catch {
      // fallback: load students only
      try {
        const studentList = await apiFetch<Row[]>("/school/students", {}, session.token);
        setStudents(studentList);
      } catch { /* ignore */ }
    }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  function setStatus(studentId: string, status: Status) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAll(status: Status) {
    const all: Record<string, Status> = {};
    students.forEach((s) => { all[String(s.studentId ?? s.student_id ?? s.id ?? "")] = status; });
    setAttendance(all);
  }

  async function saveAttendance() {
    if (!session) return;
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status, date: new Date().toISOString().split("T")[0] }));
      await apiFetch("/teacher/attendance", { method: "POST", body: JSON.stringify({ classId: selectedClass, records }) }, session.token);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  if (!session) return null;

  const presentCount = Object.values(attendance).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendance).filter((s) => s === "ABSENT").length;
  const lateCount = Object.values(attendance).filter((s) => s === "LATE").length;
  const markedCount = Object.values(attendance).filter((s) => s !== "").length;

  return (
    <DashboardShell title="Attendance" subtitle="Mark daily class attendance" badge="Teacher" role="teacher">
      <div className="section" style={{ marginTop: 0 }}>
        <div className="card-grid">
          <StatCard label="Students" value={String(students.length)} description="In class" />
          <StatCard label="Present" value={String(presentCount)} description="Marked present" />
          <StatCard label="Absent" value={String(absentCount)} description="Not in class" />
          <StatCard label="Marked" value={`${markedCount}/${students.length}`} description="Completion" />
        </div>
      </div>

      <div className="section">
        {/* Header controls */}
        <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, padding: 20, marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", boxShadow: "var(--shadow-card)" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>📅 {today}</div>
            {classes.length > 0 && (
              <select className="login-select" style={{ marginTop: 8, width: "auto" }} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                {classes.map((c) => {
                  const id = String(c.classId ?? c.class_id ?? "");
                  return <option key={id} value={id}>{String(c.className ?? c.class_name ?? id)}</option>;
                })}
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn-ghost" onClick={() => markAll("PRESENT")}>✅ All Present</button>
            <button type="button" className="btn-ghost" onClick={() => markAll("ABSENT")}>❌ All Absent</button>
            <button type="button" className="btn-ghost" onClick={() => setAttendance({})}>🔄 Clear</button>
            {saved && <span className="pill green">✅ Saved!</span>}
            <button type="button" className="btn-primary" style={{ width: "auto", padding: "10px 22px" }} onClick={saveAttendance} disabled={saving || markedCount === 0}>
              {saving ? "Saving..." : "💾 Save Attendance"}
            </button>
          </div>
        </div>

        {/* Attendance rows */}
        <div className="attendance-grid">
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,2fr) repeat(3, minmax(0,1fr)) 100px", gap: 8, padding: "10px 16px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
            <span>Student</span>
            <span>Present</span>
            <span>Absent</span>
            <span>Late</span>
            <span>Status</span>
          </div>

          {students.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "white", borderRadius: 16, border: "1px solid var(--line)" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎒</div>
              <div style={{ fontWeight: 700 }}>No students loaded</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Connect to the API to load your class list.</div>
            </div>
          )}

          {students.map((student) => {
            const id = String(student.studentId ?? student.student_id ?? student.id ?? "");
            const name = String(student.fullName ?? student.full_name ?? `Student ${id}`);
            const status = attendance[id] ?? "";
            return (
              <div key={id} className="attendance-row">
                <div>
                  <div className="attendance-name">{name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>ADM: {String(student.admissionNumber ?? student.admission_number ?? id)}</div>
                </div>
                <button type="button" className={`attendance-btn ${status === "PRESENT" ? "present" : ""}`} onClick={() => setStatus(id, "PRESENT")}>✅</button>
                <button type="button" className={`attendance-btn ${status === "ABSENT" ? "absent" : ""}`} onClick={() => setStatus(id, "ABSENT")}>❌</button>
                <button type="button" className={`attendance-btn ${status === "LATE" ? "late" : ""}`} onClick={() => setStatus(id, "LATE")}>⏰</button>
                <span className={`pill ${status === "PRESENT" ? "green" : status === "ABSENT" ? "red" : status === "LATE" ? "amber" : "gray"}`} style={{ fontSize: 11 }}>
                  {status || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
