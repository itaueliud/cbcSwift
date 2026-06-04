"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function TeacherPortfolioPage() {
  const session = useProtectedSession(["TEACHER", "PRINCIPAL"]);
  const [students, setStudents] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [portfolio, setPortfolio] = useState<Row[]>([]);
  const [form, setForm] = useState({
    studentId: "",
    subjectId: "",
    termId: "",
    title: "",
    description: "",
    fileUrl: "",
    fileType: "document",
  });

  async function load() {
    if (!session) return;
    const [studentList, termList, subjectList, portfolioList] = await Promise.all([
      apiFetch<Row[]>("/school/students", {}, session.token),
      apiFetch<Row[]>("/school/terms", {}, session.token),
      apiFetch<Row[]>("/school/subjects", {}, session.token),
      apiFetch<Row[]>("/teacher/portfolio", {}, session.token),
    ]);
    setStudents(studentList);
    setTerms(termList);
    setSubjects(subjectList);
    setPortfolio(portfolioList);
    setForm((current) => ({
      ...current,
      studentId: current.studentId || String(studentList[0]?.studentId ?? studentList[0]?.student_id ?? ""),
      subjectId: current.subjectId || String(subjectList[0]?.subjectId ?? subjectList[0]?.subject_id ?? ""),
      termId: current.termId || String(termList.find((term) => term.isCurrent ?? term.is_current)?.termId ?? termList[0]?.termId ?? ""),
    }));
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  async function save() {
    if (!session) return;
    await apiFetch(
      "/teacher/portfolio",
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
      portfolio.map((item) => ({
        studentName: String(item.student?.fullName ?? item.student_name ?? ""),
        title: String(item.title ?? ""),
        subjectName: String(item.subject?.subjectName ?? item.subject_name ?? ""),
        fileType: String(item.fileType ?? item.file_type ?? ""),
        visible: String(item.isVisibleParent ?? item.is_visible_parent ?? false),
      })),
    [portfolio],
  );

  if (!session) return null;

  return (
    <DashboardShell title="Portfolio Upload" subtitle="CBC evidence management" badge="Teacher" role="teacher">
      <div className="section">
        <div className="card-grid">
          <StatCard label="Portfolio" value={String(portfolio.length)} description="Evidence items" />
          <StatCard label="Students" value={String(students.length)} description="Upload targets" />
          <StatCard label="Terms" value={String(terms.length)} description="Academic periods" />
        </div>
      </div>

      <div className="section">
        <h3>Add evidence</h3>
        <div className="card-grid">
          <select className="tab-button" value={form.studentId} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}>
            {students.map((student) => {
              const studentId = String(student.studentId ?? student.student_id ?? "");
              return <option key={studentId} value={studentId}>{String(student.fullName ?? student.full_name ?? studentId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}>
            {subjects.map((subject) => {
              const subjectId = String(subject.subjectId ?? subject.subject_id ?? "");
              return <option key={subjectId} value={subjectId}>{String(subject.subjectName ?? subject.subject_name ?? subjectId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.termId} onChange={(event) => setForm((current) => ({ ...current, termId: event.target.value }))}>
            {terms.map((term) => {
              const termId = String(term.termId ?? term.term_id ?? "");
              return <option key={termId} value={termId}>{String(term.termName ?? term.term_name ?? termId)}</option>;
            })}
          </select>
          <input className="tab-button" placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <input className="tab-button" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <input className="tab-button" placeholder="File URL" value={form.fileUrl} onChange={(event) => setForm((current) => ({ ...current, fileUrl: event.target.value }))} />
          <input className="tab-button" placeholder="File type" value={form.fileType} onChange={(event) => setForm((current) => ({ ...current, fileType: event.target.value }))} />
        </div>
        <button className="tab-button" onClick={save}>
          Save portfolio item
        </button>
      </div>

      <div className="section">
        <h3>Portfolio items</h3>
        <DataTable columns={[{ key: "studentName", label: "Student" }, { key: "title", label: "Title" }, { key: "subjectName", label: "Subject" }, { key: "fileType", label: "Type" }, { key: "visible", label: "Parent visible" }]} rows={rows} />
      </div>
    </DashboardShell>
  );
}
