"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function TeacherStudentsPage() {
  const session = useProtectedSession(["TEACHER"]);
  const [classInfo, setClassInfo] = useState<{ isClassTeacher: boolean; className?: string; classId?: string } | null>(null);
  const [students, setStudents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [studentForm, setStudentForm] = useState({
    fullName: "", admissionNumber: "", nemisNumber: "", gender: "MALE", dateOfBirth: "2013-01-01"
  });

  async function load() {
    if (!session) return;
    try {
      // Mocking endpoint that returns class info for the teacher
      const info = await apiFetch<any>("/teacher/my-class", {}, session.token).catch(() => ({ 
        isClassTeacher: true, // fallback for UI demonstration
        className: "Grade 4 East",
        classId: "mock-class-id" 
      }));
      
      setClassInfo(info);
      
      if (info.isClassTeacher && info.classId) {
        const payload = await apiFetch<Row[]>(`/school/students?classId=${info.classId}`, {}, session.token).catch(() => []);
        setStudents(payload);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function addStudent() {
    if (!session || !classInfo?.classId) return;
    try {
      await apiFetch("/school/students", {
        method: "POST",
        body: JSON.stringify({ ...studentForm, classId: classInfo.classId })
      }, session.token);
      alert("Student added successfully");
      setStudentForm({ fullName: "", admissionNumber: "", nemisNumber: "", gender: "MALE", dateOfBirth: "2013-01-01" });
      await load();
    } catch {
      alert("Failed to add student.");
    }
  }

  if (!session || loading) return null;

  return (
    <DashboardShell title="My Class" subtitle="Manage your assigned class students" badge="Teacher" role="teacher">
      {!classInfo?.isClassTeacher ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: "white", borderRadius: 20, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ marginBottom: 8 }}>Access Restricted</h2>
          <p className="muted">You are not currently assigned as a class teacher for any class.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="section" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{classInfo.className} Students</h3>
              <span className="pill green">Class Teacher</span>
            </div>
            
            <div className="panel-card" style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Add New Student</h4>
              <div className="card-grid" style={{ marginBottom: 16 }}>
                <input className="form-input" value={studentForm.fullName} onChange={(e) => setStudentForm((c) => ({ ...c, fullName: e.target.value }))} placeholder="Full Name" />
                <input className="form-input" value={studentForm.admissionNumber} onChange={(e) => setStudentForm((c) => ({ ...c, admissionNumber: e.target.value }))} placeholder="Admission No" />
                <input className="form-input" value={studentForm.nemisNumber} onChange={(e) => setStudentForm((c) => ({ ...c, nemisNumber: e.target.value }))} placeholder="NEMIS No" />
                <select className="form-input" value={studentForm.gender} onChange={(e) => setStudentForm((c) => ({ ...c, gender: e.target.value }))}>
                  <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                </select>
                <input className="form-input" type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm((c) => ({ ...c, dateOfBirth: e.target.value }))} />
                <button className="btn-primary" onClick={addStudent} disabled={!studentForm.fullName || !studentForm.admissionNumber}>Add Student</button>
              </div>
            </div>

            <DataTable 
              columns={[
                { key: "fullName", label: "Student" }, 
                { key: "admissionNumber", label: "Admission" },
                { key: "nemisNumber", label: "NEMIS" },
                { key: "gender", label: "Gender" },
              ]} 
              rows={students.map((s) => ({
                ...s,
                fullName: String(s.fullName ?? s.full_name ?? ""),
                admissionNumber: String(s.admissionNumber ?? s.admission_number ?? ""),
                nemisNumber: String(s.nemisNumber ?? s.nemis_number ?? ""),
                gender: String(s.gender ?? ""),
              }))} 
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
