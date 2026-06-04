"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Option = { label: string; value: string };

export function TimetableForm({ session, onClose, onSuccess }: { session: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [years, setYears] = useState<{ yearId: string; academicYear: string; terms: { termId: string; termName: string }[] }[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [staff, setStaff] = useState<Option[]>([]);

  const [formData, setFormData] = useState({
    yearId: "",
    termId: "",
    classId: "",
    subjectId: "",
    staffId: "",
    dayOfWeek: "1",
    startTime: "8:00",
    endTime: "9:00",
    room: "",
  });

  useEffect(() => {
    async function loadOptions() {
      try {
        const [y, c, s, st] = await Promise.all([
          apiFetch<any[]>("/school/academic-years", {}, session.token).catch(() => []),
          apiFetch<any[]>("/school/classes", {}, session.token).catch(() => []),
          apiFetch<any[]>("/school/subjects", {}, session.token).catch(() => []),
          apiFetch<any[]>("/school/staff", {}, session.token).catch(() => []),
        ]);
        setYears(y);
        setClasses(c.map(cls => ({ label: cls.className ?? cls.class_name, value: cls.classId ?? cls.class_id })));
        setSubjects(s.map(sub => ({ label: sub.subjectName ?? sub.subject_name, value: sub.subjectId ?? sub.subject_id })));
        setStaff(st.map(stf => ({ label: stf.fullName ?? stf.full_name, value: stf.staffId ?? stf.staff_id })));

        if (y.length > 0) {
          setFormData(prev => ({ ...prev, yearId: y[0].yearId, termId: y[0].terms?.[0]?.termId ?? "" }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    void loadOptions();
  }, [session]);

  const selectedYear = years.find(y => y.yearId === formData.yearId);
  const availableTerms = selectedYear?.terms ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/school/timetable", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          dayOfWeek: parseInt(formData.dayOfWeek, 10),
          staffId: formData.staffId || undefined,
          room: formData.room || undefined,
        }),
      }, session.token);
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Failed to create entry");
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", padding: 24, borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>Add Timetable Entry</h2>
        {error && <div style={{ color: "red", marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Academic Year</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.yearId} onChange={(e) => {
                  const y = years.find(yr => yr.yearId === e.target.value);
                  setFormData({ ...formData, yearId: e.target.value, termId: y?.terms?.[0]?.termId ?? "" });
                }}>
                <option value="">Select Year</option>
                {years.map(y => <option key={y.yearId} value={y.yearId}>{y.academicYear}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Term</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.termId} onChange={(e) => setFormData({ ...formData, termId: e.target.value })}>
                <option value="">Select Term</option>
                {availableTerms.map(t => <option key={t.termId} value={t.termId}>{t.termName}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Class</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}>
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Subject</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.subjectId} onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Teacher (Optional)</label>
            <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
              value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
              <option value="">No specific teacher</option>
              {staff.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Day of Week</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.dayOfWeek} onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Room (Optional)</label>
              <input style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc", boxSizing: "border-box" }}
                value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} placeholder="e.g. Room 101" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Start Time</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}>
                <option value="8:00">8:00</option>
                <option value="9:00">9:00</option>
                <option value="10:00">10:00</option>
                <option value="11:30">11:30</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4, fontWeight: 600 }}>End Time</label>
              <select style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} required
                value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}>
                <option value="9:00">9:00</option>
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="12:30">12:30</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "white", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1d4ed8", color: "white", cursor: "pointer" }}>{loading ? "Saving..." : "Save Entry"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
