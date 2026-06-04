"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, unknown>;

export default function ParentReportsPage() {
  const session = useProtectedSession(["PARENT"]);
  const [children, setChildren] = useState<Row[]>([]);
  const [selectedChild, setSelectedChild] = useState("");
  const [reports, setReports] = useState<Row[]>([]);
  const [marks, setMarks] = useState<Row[]>([]);
  const [attendance, setAttendance] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!session) return;
    try {
      const data = await apiFetch<Row>("/parent/dashboard", {}, session.token);
      const childList = Array.isArray(data.children) ? (data.children as Row[]) : [];
      setChildren(childList);
      if (!selectedChild && childList[0]) setSelectedChild(String(childList[0].studentId ?? ""));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function loadChildData(childId: string) {
    if (!session || !childId) return;
    try {
      const data = await apiFetch<Row>("/parent/dashboard", {}, session.token);
      const childList = Array.isArray(data.children) ? (data.children as Row[]) : [];
      const child = childList.find((c) => String(c.studentId ?? "") === childId);
      if (child) {
        setMarks(Array.isArray(child.recent_marks) ? (child.recent_marks as Row[]) : []);
        setAttendance({ pct: child.attendance_pct, absent: child.attendance_absent });
      }
    } catch { /* ignore */ }

    try {
      const rpts = await apiFetch<Row[]>(`/parent/reports?studentId=${childId}`, {}, session.token);
      setReports(Array.isArray(rpts) ? rpts : []);
    } catch { setReports([]); }
  }

  useEffect(() => { if (session) void load(); }, [session]);
  useEffect(() => { if (session && selectedChild) void loadChildData(selectedChild); }, [session, selectedChild]);

  if (!session) return null;

  const selectedChildData = children.find((c) => String(c.studentId ?? "") === selectedChild);
  const attendancePct = Number(attendance?.pct ?? selectedChildData?.attendance_pct ?? 0);

  return (
    <DashboardShell title="Reports & Progress" subtitle="Your child's academic overview" badge="Parent" role="parent">
      {/* Child selector */}
      {children.length > 1 && (
        <div className="section" style={{ marginTop: 0, marginBottom: 0 }}>
          <div className="panel-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>📚 Viewing reports for:</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {children.map((c) => {
                const id = String(c.studentId ?? "");
                return (
                  <button key={id} onClick={() => setSelectedChild(id)} style={{
                    padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                    background: id === selectedChild ? "#1d4ed8" : "rgba(0,0,0,0.05)",
                    color: id === selectedChild ? "#fff" : "#334155", transition: "all 0.2s",
                  }}>
                    {String(c.fullName ?? id)} <span style={{ opacity: 0.6, fontSize: 11 }}>{String(c.currentGrade ?? "")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>Loading reports...</div>
      ) : (
        <>
          {/* Child overview */}
          {selectedChildData && (
            <div className="section">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
                <div className="panel-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{String(selectedChildData.currentGrade ?? "")}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Current Grade</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{String(selectedChildData.admissionNumber ?? "")}</div>
                </div>
                <div className="panel-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{marks.length}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Recent Assessments</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Published results</div>
                </div>
                <div className="panel-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: attendancePct >= 80 ? "#059669" : attendancePct >= 60 ? "#b45309" : "#dc2626" }}>
                    {attendancePct.toFixed(1)}%
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Attendance Rate</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {Number(attendance?.absent ?? 0)} absent days
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent marks */}
          {marks.length > 0 && (
            <div className="section">
              <h2 style={{ marginBottom: 16 }}>📝 Recent Marks</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {marks.map((mark, i) => {
                  const score = Number(mark.raw_score ?? mark.rawScore ?? 0);
                  const grade = String(mark.cbc_grade ?? mark.cbcGrade ?? "");
                  const subject = String(mark.subject_name ?? mark.subjectName ?? "");
                  const gradeClass = grade === "EE" ? "grade-ee" : grade === "ME" ? "grade-me" : grade === "AE" ? "grade-ae" : "grade-be";
                  return (
                    <div key={i} className="panel-card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{subject}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>{score}%</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>score</div>
                        </div>
                        <div className={`grade-badge ${gradeClass}`}>{grade}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.03)", border: "1px solid var(--line)", fontSize: 13, color: "var(--muted)" }}>
                📌 CBC Grades: <strong style={{ color: "#059669" }}>EE</strong> = Exceeds Expectations · <strong style={{ color: "#1d4ed8" }}>ME</strong> = Meets Expectations · <strong style={{ color: "#b45309" }}>AE</strong> = Approaching Expectations · <strong style={{ color: "#dc2626" }}>BE</strong> = Below Expectations
              </div>
            </div>
          )}

          {/* Published reports */}
          <div className="section">
            <h2 style={{ marginBottom: 16 }}>📄 Term Reports</h2>
            {reports.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {reports.map((r, i) => (
                  <div key={i} className="report-card">
                    <div className="report-icon">📋</div>
                    <div>
                      <div className="report-title">{String(r.reportType ?? r.report_type ?? "Term Report")}</div>
                      <div className="report-meta">
                        {String(r.termName ?? r.term_name ?? "")} · Published {r.publishedAt ? new Date(String(r.publishedAt)).toLocaleDateString("en-KE") : "—"}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <span style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(5,150,105,0.1)", color: "#059669", fontSize: 12, fontWeight: 700 }}>
                          ✅ Published
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-card" style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>No published reports yet</div>
                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                  Reports will appear here once the teacher publishes them. Check back after exams.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
