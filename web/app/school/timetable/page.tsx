"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

import { TimetableForm } from "@/components/timetable-form";

type Row = Record<string, any>;
type Cell = { subject: string; teacher: string; slotId?: string } | null;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = ["8:00–9:00", "9:00–10:00", "10:00–11:00", "11:30–12:30", "2:00–3:00", "3:00–4:00"];

export default function TimetablePage() {
  const session = useProtectedSession(["ADMIN","PRINCIPAL","TEACHER","STUDENT"]);
  const [timetable, setTimetable] = useState<Row[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState<Row[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [grid, setGrid] = useState<Record<string, Record<string, Cell>>>({});

  async function load() {
    if (!session) return;
    try {
      const [ttData, classList] = await Promise.all([
        apiFetch<Row[]>("/school/timetable", {}, session.token).catch(() => []),
        apiFetch<Row[]>("/school/classes", {}, session.token).catch(() => []),
      ]);
      setTimetable(ttData);
      setClasses(classList);
      if (classList[0]) setSelectedClass(String(classList[0].classId ?? classList[0].class_id ?? ""));
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  // Rebuild grid when selectedClass changes
  useEffect(() => {
    if (!timetable.length) return;
    const g: Record<string, Record<string, Cell>> = {};
    PERIODS.forEach((p) => { g[p] = {}; DAYS.forEach((d) => { g[p][d] = null; }); });
    timetable.forEach((slot) => {
      const slotClassId = String(slot.classId ?? slot.class_id ?? "");
      if (slotClassId !== selectedClass) return;

      const period = String(slot.startTime ? `${slot.startTime}–${slot.endTime}` : (slot.period ?? slot.timePeriod ?? ""));
      const dayNum = Number(slot.dayOfWeek);
      const day = !isNaN(dayNum) && dayNum >= 1 && dayNum <= 5 ? DAYS[dayNum - 1] : String(slot.day ?? slot.dayOfWeek ?? "");

      if (g[period] && DAYS.includes(day)) {
        g[period][day] = {
          subject: String(slot.subject?.subjectName ?? slot.subjectName ?? slot.subject ?? ""),
          teacher: String(slot.staffMember?.fullName ?? slot.teacher?.fullName ?? slot.teacherName ?? ""),
          slotId: String(slot.timetableEntryId ?? slot.slotId ?? slot.timetable_slot_id ?? ""),
        };
      }
    });
    setGrid(g);
  }, [selectedClass, timetable]);

  const filledCount = Object.values(grid).flatMap(Object.values).filter(Boolean).length;
  const totalSlots = PERIODS.length * DAYS.length;

  return (
    <DashboardShell title="Timetable" subtitle="Weekly class schedule overview" badge="Academic" role="school">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Periods / Day", value: String(PERIODS.length), icon: "⏰" },
          { label: "School Days", value: String(DAYS.length), icon: "📅" },
          { label: "Slots Filled", value: `${filledCount}/${totalSlots}`, icon: "📚" },
          { label: "Classes", value: String(classes.length), icon: "🏫" },
        ].map((item) => (
          <div key={item.label} className="panel-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 26 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{item.value}</div>
              <div className="muted" style={{ fontSize: 12 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {classes.map((c) => {
            const id = String(c.classId ?? c.class_id ?? "");
            return (
              <button key={id} type="button" className="tab-button" data-active={selectedClass === id} onClick={() => setSelectedClass(id)} style={{ padding: "8px 16px", fontSize: 13 }}>
                {String(c.className ?? c.class_name ?? id)}
              </button>
            );
          })}
        </div>
        {session?.role === "ADMIN" && (
          <button onClick={() => setShowModal(true)} style={{ background: "#1d4ed8", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
            + Add Entry
          </button>
        )}
      </div>

      <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, overflow: "auto", boxShadow: "var(--shadow-card)" }}>
        <div className="timetable-grid" style={{ minWidth: 700, padding: 16 }}>
          {/* Header */}
          <div className="timetable-header" style={{ background: "transparent" }} />
          {DAYS.map((day) => (
            <div key={day} className="timetable-header">{day}</div>
          ))}

          {/* Rows */}
          {PERIODS.map((period) => (
            <>
              <div key={`time-${period}`} className="timetable-time">{period}</div>
              {DAYS.map((day) => {
                const cell = grid[period]?.[day];
                return (
                  <div key={`${period}-${day}`} className={`timetable-slot ${cell ? "filled" : ""}`} style={{ position: "relative" }}>
                    {cell ? (
                      <>
                        <div className="timetable-subject">{cell.subject}</div>
                        <div className="timetable-teacher">{cell.teacher}</div>
                        {session?.role === "ADMIN" && (
                          <button 
                            type="button"
                            onClick={async () => {
                              if(confirm("Delete this slot?")) {
                                await apiFetch(`/school/timetable/${cell.slotId}`, { method: "DELETE" }, session.token);
                                load();
                              }
                            }}
                            style={{ position: "absolute", top: 4, right: 4, background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Delete slot"
                          >
                            ✕
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", paddingTop: 10 }}>Free</div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {timetable.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", marginTop: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
          <div style={{ fontWeight: 700 }}>No timetable data yet</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Timetable will populate once configured through the admin.</div>
        </div>
      )}

      {showModal && (
        <TimetableForm 
          session={session} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); void load(); }} 
        />
      )}
    </DashboardShell>
  );
}
