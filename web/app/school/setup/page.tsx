"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function SchoolSetupPage() {
  const session = useProtectedSession(["ADMIN", "PRINCIPAL"]);
  const [activeTab, setActiveTab] = useState("academic");
  
  const [years, setYears] = useState<Row[]>([]);
  const [terms, setTerms] = useState<Row[]>([]);
  const [tiers, setTiers] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [subjects, setSubjects] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [features, setFeatures] = useState<Row[]>([]);
  
  const [yearForm, setYearForm] = useState({ yearLabel: "2025", startDate: "2025-01-01", endDate: "2025-11-30" });
  const [termForm, setTermForm] = useState({ yearId: "", termNumber: "1", termName: "Term 1", startDate: "2025-01-01", endDate: "2025-04-01" });
  const [tierForm, setTierForm] = useState({ tierKey: "PRIMARY", tierName: "Primary", gradeFrom: "Grade 1", gradeTo: "Grade 6" });
  const [classForm, setClassForm] = useState({ tierId: "", yearId: "", grade: "Grade 1", stream: "", className: "Grade 1 A", capacity: "40" });
  const [subjectForm, setSubjectForm] = useState({ tierId: "", subjectName: "", subjectCode: "", cbcLearningArea: "", isCore: true });
  const [staffForm, setStaffForm] = useState({
    fullName: "", email: "", phone: "", tscNumber: "", nationalId: "",
    staffType: "TEACHING", specialization: "", employmentType: "PERMANENT",
    joinedDate: new Date().toISOString().slice(0, 10),
  });
  const [studentForm, setStudentForm] = useState({
    fullName: "", email: "", nemisNumber: "", dateOfBirth: "2013-01-01",
    gender: "MALE", classId: "", admissionNumber: "",
    admittedDate: new Date().toISOString().slice(0, 10), currentGrade: "Grade 1", tierId: "",
  });
  const [visibilityForm, setVisibilityForm] = useState({ tfaId: "", roleKey: "TEACHER", isVisible: true });

  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    const [yearList, termList, tierList, classList, subjectList, staffList, studentList, featureList] = await Promise.all([
      apiFetch<Row[]>("/school/academic-years", {}, session.token),
      apiFetch<Row[]>("/school/terms", {}, session.token),
      apiFetch<Row[]>("/school/tiers", {}, session.token),
      apiFetch<Row[]>("/school/classes", {}, session.token),
      apiFetch<Row[]>("/school/subjects", {}, session.token),
      apiFetch<Row[]>("/school/staff", {}, session.token),
      apiFetch<Row[]>("/school/students", {}, session.token),
      apiFetch<Row[]>("/school/features", {}, session.token),
    ]);
    setYears(yearList); setTerms(termList); setTiers(tierList); setClasses(classList);
    setSubjects(subjectList); setStaff(staffList); setStudents(studentList); setFeatures(featureList);

    setTermForm((c) => ({ ...c, yearId: c.yearId || String(yearList[0]?.yearId ?? yearList[0]?.year_id ?? "") }));
    setClassForm((c) => ({ ...c, tierId: c.tierId || String(tierList[0]?.tierId ?? tierList[0]?.tier_id ?? ""), yearId: c.yearId || String(yearList[0]?.yearId ?? yearList[0]?.year_id ?? "") }));
    setSubjectForm((c) => ({ ...c, tierId: c.tierId || String(tierList[0]?.tierId ?? tierList[0]?.tier_id ?? "") }));
    setStudentForm((c) => ({ ...c, classId: c.classId || String(classList[0]?.classId ?? classList[0]?.class_id ?? ""), tierId: c.tierId || String(tierList[0]?.tierId ?? tierList[0]?.tier_id ?? "") }));
    setVisibilityForm((c) => ({ ...c, tfaId: c.tfaId || String(featureList[0]?.tfaId ?? featureList[0]?.tfa_id ?? "") }));
  }

  useEffect(() => { if (session) void load(); }, [session]);

  const actions = {
    createYear: async () => { if (!session) return; await apiFetch("/school/academic-years", { method: "POST", body: JSON.stringify(yearForm) }, session.token); await load(); },
    createTerm: async () => { if (!session) return; await apiFetch("/school/terms", { method: "POST", body: JSON.stringify({ ...termForm, termNumber: Number(termForm.termNumber) }) }, session.token); await load(); },
    createTier: async () => { if (!session) return; await apiFetch("/school/tiers", { method: "POST", body: JSON.stringify(tierForm) }, session.token); await load(); },
    createClass: async () => { if (!session) return; await apiFetch("/school/classes", { method: "POST", body: JSON.stringify({ ...classForm, capacity: Number(classForm.capacity) }) }, session.token); await load(); },
    createSubject: async () => { if (!session) return; await apiFetch("/school/subjects", { method: "POST", body: JSON.stringify(subjectForm) }, session.token); await load(); },
    createStaff: async () => { if (!session) return; await apiFetch("/school/staff", { method: "POST", body: JSON.stringify(staffForm) }, session.token); await load(); },
    createStudent: async () => { if (!session) return; await apiFetch("/school/students", { method: "POST", body: JSON.stringify({ ...studentForm, email: studentForm.email || undefined }) }, session.token); await load(); },
    createVisibility: async () => { if (!session) return; await apiFetch("/school/role-visibility", { method: "POST", body: JSON.stringify(visibilityForm) }, session.token); await load(); },
    deleteRecord: async (endpoint: string) => { if (!session) return; if(confirm("Are you sure?")) { await apiFetch(endpoint, { method: "DELETE" }, session.token); await load(); } },
    sendInvite: async (email: string, role: string) => {
      if (!session) return;
      setSendingInvite(email);
      try {
        await apiFetch("/invite/send", { method: "POST", body: JSON.stringify({ email, role }) }, session.token);
        alert(`Invitation sent to ${email}`);
      } catch (e) {
        alert("Failed to send invitation.");
      }
      setSendingInvite(null);
    }
  };

  const stats = useMemo(() => [
    { label: "Years", value: String(years.length), description: "Academic years" },
    { label: "Terms", value: String(terms.length), description: "Academic terms" },
    { label: "Tiers", value: String(tiers.length), description: "Education tiers" },
    { label: "Classes", value: String(classes.length), description: "School classes" },
    { label: "Subjects", value: String(subjects.length), description: "Subject catalog" },
    { label: "Staff", value: String(staff.length), description: "Employee records" },
    { label: "Students", value: String(students.length), description: "Learner records" },
  ], [years, terms, tiers, classes, subjects, staff, students]);

  if (!session) return null;

  const tabs = [
    { id: "academic", label: "Academic Structure", icon: "📅" },
    { id: "classes", label: "Classes & Subjects", icon: "📚" },
    { id: "staff", label: "Staff Onboarding", icon: "👩‍🏫" },
    { id: "students", label: "Student Admissions", icon: "🎒" },
    { id: "features", label: "Role Visibility", icon: "👁️" }
  ];

  return (
    <DashboardShell title="School Setup" subtitle="Core academic structure and admissions" badge="School Admin" role="school">
      {/* Stat Cards */}
      <div className="section" style={{ marginBottom: 24 }}>
        <div className="card-grid">
          {stats.slice(0, 4).map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px",
              borderRadius: "12px",
              border: "1px solid",
              borderColor: activeTab === tab.id ? "transparent" : "var(--line)",
              background: activeTab === tab.id ? "var(--brand)" : "white",
              color: activeTab === tab.id ? "white" : "var(--muted)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: activeTab === tab.id ? "0 4px 12px rgba(29,78,216,0.2)" : "none",
              whiteSpace: "nowrap"
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: "white", padding: 24, borderRadius: 24, boxShadow: "var(--shadow-card)", border: "1px solid var(--line)" }}>
        {activeTab === "academic" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div className="section">
              <h3 style={{ marginBottom: 16 }}>Academic Years</h3>
              <div className="card-grid" style={{ marginBottom: 16 }}>
                <input className="form-input" value={yearForm.yearLabel} onChange={(e) => setYearForm((c) => ({ ...c, yearLabel: e.target.value }))} placeholder="Label" />
                <input className="form-input" type="date" value={yearForm.startDate} onChange={(e) => setYearForm((c) => ({ ...c, startDate: e.target.value }))} />
                <input className="form-input" type="date" value={yearForm.endDate} onChange={(e) => setYearForm((c) => ({ ...c, endDate: e.target.value }))} />
                <button className="btn-primary" onClick={actions.createYear}>Save year</button>
              </div>
              <DataTable 
                columns={[
                  { key: "yearLabel", label: "Year" }, { key: "startDate", label: "Start" }, { key: "endDate", label: "End" },
                  { key: "actions", label: "Actions", render: (row) => <div style={{display:"flex", gap:8}}><button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit year")}>Edit</button><button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/academic-years/${row.yearId || row.year_id}`)}>Delete</button></div> }
                ]} 
                rows={years.map((year) => ({ ...year, yearLabel: String(year.yearLabel ?? year.year_label ?? ""), startDate: String(year.startDate ?? year.start_date ?? ""), endDate: String(year.endDate ?? year.end_date ?? "") }))} 
              />
            </div>
            <div className="section">
              <h3 style={{ marginBottom: 16 }}>Terms</h3>
              <div className="card-grid" style={{ marginBottom: 16 }}>
                <select className="form-input" value={termForm.yearId} onChange={(e) => setTermForm((c) => ({ ...c, yearId: e.target.value }))}>
                  {years.map((y) => <option key={y.yearId ?? y.year_id} value={y.yearId ?? y.year_id}>{String(y.yearLabel ?? y.year_label ?? "")}</option>)}
                </select>
                <input className="form-input" type="number" value={termForm.termNumber} onChange={(e) => setTermForm((c) => ({ ...c, termNumber: e.target.value }))} placeholder="Number" />
                <input className="form-input" value={termForm.termName} onChange={(e) => setTermForm((c) => ({ ...c, termName: e.target.value }))} placeholder="Name" />
                <input className="form-input" type="date" value={termForm.startDate} onChange={(e) => setTermForm((c) => ({ ...c, startDate: e.target.value }))} />
                <input className="form-input" type="date" value={termForm.endDate} onChange={(e) => setTermForm((c) => ({ ...c, endDate: e.target.value }))} />
                <button className="btn-primary" onClick={actions.createTerm}>Save term</button>
              </div>
              <DataTable 
                columns={[
                  { key: "termName", label: "Term" }, { key: "yearLabel", label: "Year" }, { key: "termNumber", label: "Number" },
                  { key: "actions", label: "Actions", render: (row) => <div style={{display:"flex", gap:8}}><button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit term")}>Edit</button><button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/terms/${row.termId || row.term_id}`)}>Delete</button></div> }
                ]} 
                rows={terms.map((t) => ({ ...t, termName: String(t.termName ?? t.term_name ?? ""), yearLabel: String(t.year?.yearLabel ?? t.year?.year_label ?? ""), termNumber: String(t.termNumber ?? t.term_number ?? "") }))} 
              />
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div className="section">
              <h3 style={{ marginBottom: 16 }}>Education Tiers</h3>
              <div className="card-grid" style={{ marginBottom: 16 }}>
                <select className="form-input" value={tierForm.tierKey} onChange={(e) => setTierForm((c) => ({ ...c, tierKey: e.target.value }))}>
                  <option value="PRIMARY">PRIMARY</option><option value="JSS">JSS</option><option value="SSS">SSS</option>
                </select>
                <input className="form-input" value={tierForm.tierName} onChange={(e) => setTierForm((c) => ({ ...c, tierName: e.target.value }))} placeholder="Tier Name" />
                <input className="form-input" value={tierForm.gradeFrom} onChange={(e) => setTierForm((c) => ({ ...c, gradeFrom: e.target.value }))} placeholder="Grade From" />
                <input className="form-input" value={tierForm.gradeTo} onChange={(e) => setTierForm((c) => ({ ...c, gradeTo: e.target.value }))} placeholder="Grade To" />
                <button className="btn-primary" onClick={actions.createTier}>Save tier</button>
              </div>
              <DataTable 
                columns={[
                  { key: "tierKey", label: "Key" }, { key: "tierName", label: "Name" }, { key: "gradeFrom", label: "From" }, { key: "gradeTo", label: "To" },
                  { key: "actions", label: "Actions", render: (row) => <div style={{display:"flex", gap:8}}><button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit tier")}>Edit</button><button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/tiers/${row.tierId || row.tier_id}`)}>Delete</button></div> }
                ]} 
                rows={tiers.map((t) => ({ ...t, tierKey: String(t.tierKey ?? t.tier_key ?? ""), tierName: String(t.tierName ?? t.tier_name ?? ""), gradeFrom: String(t.gradeFrom ?? t.grade_from ?? ""), gradeTo: String(t.gradeTo ?? t.grade_to ?? "") }))} 
              />
            </div>
            <div className="section">
              <h3 style={{ marginBottom: 16 }}>Classes</h3>
              <div className="card-grid" style={{ marginBottom: 16 }}>
                <select className="form-input" value={classForm.tierId} onChange={(e) => setClassForm((c) => ({ ...c, tierId: e.target.value }))}>
                  {tiers.map((t) => <option key={t.tierId ?? t.tier_id} value={t.tierId ?? t.tier_id}>{String(t.tierName ?? t.tier_name ?? "")}</option>)}
                </select>
                <select className="form-input" value={classForm.yearId} onChange={(e) => setClassForm((c) => ({ ...c, yearId: e.target.value }))}>
                  {years.map((y) => <option key={y.yearId ?? y.year_id} value={y.yearId ?? y.year_id}>{String(y.yearLabel ?? y.year_label ?? "")}</option>)}
                </select>
                <input className="form-input" value={classForm.grade} onChange={(e) => setClassForm((c) => ({ ...c, grade: e.target.value }))} placeholder="Grade" />
                <input className="form-input" value={classForm.stream} onChange={(e) => setClassForm((c) => ({ ...c, stream: e.target.value }))} placeholder="Stream" />
                <input className="form-input" value={classForm.className} onChange={(e) => setClassForm((c) => ({ ...c, className: e.target.value }))} placeholder="Class Name" />
                <input className="form-input" type="number" value={classForm.capacity} onChange={(e) => setClassForm((c) => ({ ...c, capacity: e.target.value }))} placeholder="Capacity" />
                <button className="btn-primary" onClick={actions.createClass}>Save class</button>
              </div>
              <DataTable 
                columns={[
                  { key: "className", label: "Class" }, { key: "grade", label: "Grade" }, { key: "stream", label: "Stream" }, { key: "tierName", label: "Tier" },
                  { key: "actions", label: "Actions", render: (row) => <div style={{display:"flex", gap:8}}><button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit class")}>Edit</button><button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/classes/${row.classId || row.class_id}`)}>Delete</button></div> }
                ]} 
                rows={classes.map((c) => ({ ...c, className: String(c.className ?? c.class_name ?? ""), grade: String(c.grade ?? ""), stream: String(c.stream ?? ""), tierName: String(c.tier?.tierName ?? c.tier?.tier_name ?? "") }))} 
              />
            </div>
            <div className="section">
              <h3 style={{ marginBottom: 16 }}>Subjects</h3>
              <div className="card-grid" style={{ marginBottom: 16 }}>
                <select className="form-input" value={subjectForm.tierId} onChange={(e) => setSubjectForm((c) => ({ ...c, tierId: e.target.value }))}>
                  {tiers.map((t) => <option key={t.tierId ?? t.tier_id} value={t.tierId ?? t.tier_id}>{String(t.tierName ?? t.tier_name ?? "")}</option>)}
                </select>
                <input className="form-input" value={subjectForm.subjectName} onChange={(e) => setSubjectForm((c) => ({ ...c, subjectName: e.target.value }))} placeholder="Subject Name" />
                <input className="form-input" value={subjectForm.subjectCode} onChange={(e) => setSubjectForm((c) => ({ ...c, subjectCode: e.target.value }))} placeholder="Code" />
                <input className="form-input" value={subjectForm.cbcLearningArea} onChange={(e) => setSubjectForm((c) => ({ ...c, cbcLearningArea: e.target.value }))} placeholder="CBC Area" />
                <button className="btn-primary" onClick={actions.createSubject}>Save subject</button>
              </div>
              <DataTable 
                columns={[
                  { key: "subjectName", label: "Subject" }, { key: "subjectCode", label: "Code" }, { key: "tierName", label: "Tier" },
                  { key: "actions", label: "Actions", render: (row) => <div style={{display:"flex", gap:8}}><button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit subject")}>Edit</button><button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/subjects/${row.subjectId || row.subject_id}`)}>Delete</button></div> }
                ]} 
                rows={subjects.map((s) => ({ ...s, subjectName: String(s.subjectName ?? s.subject_name ?? ""), subjectCode: String(s.subjectCode ?? s.subject_code ?? ""), tierName: String(s.tier?.tierName ?? s.tier?.tier_name ?? "") }))} 
              />
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="section">
            <h3 style={{ marginBottom: 16 }}>Staff Onboarding</h3>
            <div className="card-grid" style={{ marginBottom: 16 }}>
              <input className="form-input" value={staffForm.fullName} onChange={(e) => setStaffForm((c) => ({ ...c, fullName: e.target.value }))} placeholder="Full Name" />
              <input className="form-input" type="email" value={staffForm.email} onChange={(e) => setStaffForm((c) => ({ ...c, email: e.target.value }))} placeholder="Email (for login)" />
              <input className="form-input" value={staffForm.phone} onChange={(e) => setStaffForm((c) => ({ ...c, phone: e.target.value }))} placeholder="Phone" />
              <input className="form-input" value={staffForm.nationalId} onChange={(e) => setStaffForm((c) => ({ ...c, nationalId: e.target.value }))} placeholder="National ID" />
              <input className="form-input" value={staffForm.tscNumber} onChange={(e) => setStaffForm((c) => ({ ...c, tscNumber: e.target.value }))} placeholder="TSC Number" />
              <select className="form-input" value={staffForm.staffType} onChange={(e) => setStaffForm((c) => ({ ...c, staffType: e.target.value }))}>
                <option value="TEACHING">Teacher</option>
                <option value="NON_TEACHING">Non-Teaching</option>
              </select>
              <button className="btn-primary" onClick={actions.createStaff}>Save staff</button>
            </div>
            <DataTable 
              columns={[
                { key: "fullName", label: "Staff Name" }, { key: "email", label: "Email" }, { key: "staffType", label: "Type" },
                { key: "actions", label: "Actions", render: (row) => (
                  <div style={{display:"flex", gap:8}}>
                    <button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit staff")}>Edit</button>
                    {row.email && (
                      <button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => actions.sendInvite(row.email, "TEACHER")} disabled={sendingInvite === row.email}>
                        {sendingInvite === row.email ? "Sending..." : "Send Invite"}
                      </button>
                    )}
                    <button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/staff/${row.staffId || row.staff_id}`)}>Delete</button>
                  </div>
                )}
              ]} 
              rows={staff.map((s) => ({ ...s, fullName: String(s.fullName ?? s.full_name ?? ""), email: String(s.email ?? ""), staffType: String(s.staffType ?? s.staff_type ?? "") }))} 
            />
          </div>
        )}

        {activeTab === "students" && (
          <div className="section">
            <h3 style={{ marginBottom: 16 }}>Student Admissions</h3>
            <div className="card-grid" style={{ marginBottom: 16 }}>
              <input className="form-input" value={studentForm.fullName} onChange={(e) => setStudentForm((c) => ({ ...c, fullName: e.target.value }))} placeholder="Full Name" />
              <input className="form-input" value={studentForm.admissionNumber} onChange={(e) => setStudentForm((c) => ({ ...c, admissionNumber: e.target.value }))} placeholder="Admission No" />
              <input className="form-input" value={studentForm.nemisNumber} onChange={(e) => setStudentForm((c) => ({ ...c, nemisNumber: e.target.value }))} placeholder="NEMIS No" />
              <select className="form-input" value={studentForm.gender} onChange={(e) => setStudentForm((c) => ({ ...c, gender: e.target.value }))}>
                <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
              </select>
              <select className="form-input" value={studentForm.classId} onChange={(e) => setStudentForm((c) => ({ ...c, classId: e.target.value }))}>
                {classes.map((c) => <option key={c.classId ?? c.class_id} value={c.classId ?? c.class_id}>{String(c.className ?? c.class_name ?? "")}</option>)}
              </select>
              <input className="form-input" type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm((c) => ({ ...c, dateOfBirth: e.target.value }))} />
              <button className="btn-primary" onClick={actions.createStudent}>Save student</button>
            </div>
            <DataTable 
              columns={[
                { key: "fullName", label: "Student" }, { key: "admissionNumber", label: "Admission" }, { key: "className", label: "Class" },
                { key: "actions", label: "Actions", render: (row) => <div style={{display:"flex", gap:8}}><button className="btn-ghost" style={{color:"var(--brand)", padding:"4px 8px"}} onClick={() => alert("Edit student")}>Edit</button><button className="btn-ghost" style={{color:"red", padding:"4px 8px"}} onClick={() => actions.deleteRecord(`/school/students/${row.studentId || row.student_id}`)}>Delete</button></div> }
              ]} 
              rows={students.map((s) => ({ ...s, fullName: String(s.fullName ?? s.full_name ?? ""), admissionNumber: String(s.admissionNumber ?? s.admission_number ?? ""), className: String(s.class?.className ?? s.class?.class_name ?? "") }))} 
            />
          </div>
        )}

        {activeTab === "features" && (
          <div className="section">
            <h3 style={{ marginBottom: 16 }}>Role Feature Visibility</h3>
            <div className="card-grid" style={{ marginBottom: 16 }}>
              <select className="form-input" value={visibilityForm.tfaId} onChange={(e) => setVisibilityForm((c) => ({ ...c, tfaId: e.target.value }))}>
                {features.map((f) => <option key={f.tfaId ?? f.tfa_id} value={f.tfaId ?? f.tfa_id}>{String(f.feature?.featureName ?? f.feature_name ?? "")}</option>)}
              </select>
              <select className="form-input" value={visibilityForm.roleKey} onChange={(e) => setVisibilityForm((c) => ({ ...c, roleKey: e.target.value }))}>
                <option value="PRINCIPAL">Principal</option><option value="TEACHER">Teacher</option>
                <option value="STUDENT">Student</option><option value="PARENT">Parent</option>
                <option value="FINANCE">Finance</option><option value="ADMIN">Admin</option>
              </select>
              <select className="form-input" value={String(visibilityForm.isVisible)} onChange={(e) => setVisibilityForm((c) => ({ ...c, isVisible: e.target.value === "true" }))}>
                <option value="true">Visible</option><option value="false">Hidden</option>
              </select>
              <button className="btn-primary" onClick={actions.createVisibility}>Save setting</button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
