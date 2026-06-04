"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function TeacherAssignmentsPage() {
  const session = useProtectedSession(["TEACHER", "PRINCIPAL"]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    termId: "",
    title: "",
    description: "",
    dueDate: "",
    maxScore: "100",
  });

  async function load() {
    if (!session) return;
    const [classList, subjectList, termList, assignmentList] = await Promise.all([
      apiFetch<Row[]>("/teacher/my-classes", {}, session.token),
      apiFetch<Row[]>("/school/subjects", {}, session.token),
      apiFetch<Row[]>("/school/terms", {}, session.token),
      apiFetch<Row[]>("/teacher/assignments", {}, session.token),
    ]);
    setClasses(classList);
    setSubjects(subjectList);
    setTerms(termList);
    setAssignments(assignmentList);
    setForm((current) => ({
      ...current,
      classId: current.classId || String(classList[0]?.class?.classId ?? classList[0]?.class?.class_id ?? ""),
      subjectId: current.subjectId || String(subjectList[0]?.subjectId ?? subjectList[0]?.subject_id ?? ""),
      termId: current.termId || String(termList.find((term) => term.isCurrent ?? term.is_current)?.termId ?? termList[0]?.termId ?? ""),
    }));
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  async function createAssignment() {
    if (!session) return;
    await apiFetch(
      "/teacher/assignments",
      {
        method: "POST",
        body: JSON.stringify({
          ...form,
          maxScore: Number(form.maxScore),
        }),
      },
      session.token,
    );
    await load();
  }

  const rows = useMemo(
    () =>
      assignments.map((assignment) => ({
        title: String(assignment.title ?? ""),
        className: String(assignment.class?.className ?? assignment.class_name ?? ""),
        subjectName: String(assignment.subject?.subjectName ?? assignment.subject_name ?? ""),
        dueDate: String(assignment.dueDate ?? assignment.due_date ?? "-"),
        maxScore: String(assignment.maxScore ?? assignment.max_score ?? ""),
      })),
    [assignments],
  );

  if (!session) return null;

  return (
    <DashboardShell title="Assignments" subtitle="Create and track class tasks" badge="Teacher" role="teacher">
      <div className="section">
        <div className="card-grid">
          <StatCard label="Assignments" value={String(assignments.length)} description="Your current workload" />
          <StatCard label="Classes" value={String(classes.length)} description="Assigned teaching groups" />
          <StatCard label="Subjects" value={String(subjects.length)} description="Subject coverage" />
        </div>
      </div>

      <div className="section">
        <h3>Create assignment</h3>
        <div className="card-grid">
          <input className="tab-button" placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <input className="tab-button" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <input className="tab-button" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
          <input className="tab-button" type="number" value={form.maxScore} onChange={(event) => setForm((current) => ({ ...current, maxScore: event.target.value }))} />
          <select className="tab-button" value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}>
            {classes.map((item) => {
              const classId = String(item.class?.classId ?? item.class?.class_id ?? "");
              return <option key={classId} value={classId}>{String(item.class?.className ?? item.class?.class_name ?? classId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}>
            {subjects.map((item) => {
              const subjectId = String(item.subjectId ?? item.subject_id ?? "");
              return <option key={subjectId} value={subjectId}>{String(item.subjectName ?? item.subject_name ?? subjectId)}</option>;
            })}
          </select>
          <select className="tab-button" value={form.termId} onChange={(event) => setForm((current) => ({ ...current, termId: event.target.value }))}>
            {terms.map((item) => {
              const termId = String(item.termId ?? item.term_id ?? "");
              return <option key={termId} value={termId}>{String(item.termName ?? item.term_name ?? termId)}</option>;
            })}
          </select>
        </div>
        <button className="tab-button" onClick={createAssignment}>
          Save assignment
        </button>
      </div>

      <div className="section">
        <h3>Current assignments</h3>
        <DataTable columns={[{ key: "title", label: "Title" }, { key: "className", label: "Class" }, { key: "subjectName", label: "Subject" }, { key: "dueDate", label: "Due" }, { key: "maxScore", label: "Max" }]} rows={rows} />
      </div>
    </DashboardShell>
  );
}
