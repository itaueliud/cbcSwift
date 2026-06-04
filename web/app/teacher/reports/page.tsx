"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function TeacherReportsPage() {
  const session = useProtectedSession(["TEACHER", "PRINCIPAL"]);
  const [students, setStudents] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Row[]>([]);
  const [reports, setReports] = useState<Row[]>([]);
  const [form, setForm] = useState({
    studentId: "",
    classId: "",
    termId: "",
    reportType: "TERM_REPORT",
  });

  async function load() {
    if (!session) return;
    const [classList, studentList, termList] = await Promise.all([
      apiFetch<Row[]>("/teacher/my-classes", {}, session.token),
      apiFetch<Row[]>("/school/students", {}, session.token),
      apiFetch<Row[]>("/school/terms", {}, session.token),
    ]);
    setClasses(classList);
    setStudents(studentList);
    setTerms(termList);
    setForm((current) => ({
      ...current,
      classId: current.classId || String(classList[0]?.class?.classId ?? classList[0]?.class?.class_id ?? ""),
      studentId: current.studentId || String(studentList[0]?.studentId ?? studentList[0]?.student_id ?? ""),
      termId: current.termId || String(termList.find((term) => term.isCurrent ?? term.is_current)?.termId ?? termList[0]?.termId ?? ""),
    }));
    if (studentList[0]) {
      const item = await apiFetch<Row[]>(`/reports/student/${String(studentList[0].studentId ?? studentList[0].student_id)}`, {}, session.token);
      setReports(item);
    }
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  async function generate() {
    if (!session) return;
    await apiFetch(
      "/reports/generate",
      {
        method: "POST",
        body: JSON.stringify(form),
      },
      session.token,
    );
    await load();
  }

  const rows = useMemo(
    () =>
      reports.map((report) => ({
        reportType: String(report.reportType ?? report.report_type ?? ""),
        generatedAt: String(report.generatedAt ?? report.generated_at ?? ""),
        published: String(report.isPublished ?? report.is_published ?? false),
        approved: String(report.approvedAt ?? report.approved_at ?? "-"),
      })),
    [reports],
  );

  if (!session) return null;

  return (
    <DashboardShell title="Reports" subtitle="Generate and review term reports" badge="Teacher" role="teacher">
      <div className="section">
        <div className="card-grid">
          <StatCard label="Reports" value={String(reports.length)} description="Loaded report items" />
          <StatCard label="Students" value={String(students.length)} description="Teacher-accessible students" />
          <StatCard label="Terms" value={String(terms.length)} description="Report periods" />
        </div>
      </div>

      <div className="section">
        <h3>Generate report</h3>
        <div className="card-grid">
          <select className="tab-button" value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}>
            {students.map((student) => {
              const studentId = String(student.studentId ?? student.student_id ?? "");
              return <option key={studentId} value={studentId}>{String(student.fullName ?? student.full_name ?? studentId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}>
            {classes.map((schoolClass) => {
              const classId = String(schoolClass.class?.classId ?? schoolClass.class?.class_id ?? "");
              return <option key={classId} value={classId}>{String(schoolClass.class?.className ?? schoolClass.class?.class_name ?? classId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.termId} onChange={(event) => setForm((current) => ({ ...current, termId: event.target.value }))}>
            {terms.map((term) => {
              const termId = String(term.termId ?? term.term_id ?? "");
              return <option key={termId} value={termId}>{String(term.termName ?? term.term_name ?? termId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.reportType} onChange={(event) => setForm((current) => ({ ...current, reportType: event.target.value }))}>
            <option value="TERM_REPORT">Term report</option>
            <option value="ANNUAL_REPORT">Annual report</option>
          </select>
        </div>
        <button className="tab-button" onClick={generate}>
          Generate
        </button>
      </div>

      <div className="section">
        <h3>Existing reports</h3>
        <DataTable columns={[{ key: "reportType", label: "Type" }, { key: "generatedAt", label: "Generated" }, { key: "published", label: "Published" }, { key: "approved", label: "Approved" }]} rows={rows} />
      </div>
    </DashboardShell>
  );
}
