"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;
type Cell = { subject: string; class: string; slotId?: string } | null;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = ["8:00–9:00", "9:00–10:00", "10:00–11:00", "11:30–12:30", "2:00–3:00", "3:00–4:00"];

export default function TeacherTimetablePage() {
  const session = useProtectedSession(["TEACHER"]);
  const [timetable, setTimetable] = useState<Row[]>([]);
  const [grid, setGrid] = useState<Record<string, Record<string, Cell>>>({});

  async function load() {
    if (!session) return;
    try {
      const ttData = await apiFetch<Row[]>("/school/timetable", {}, session.token).catch(() => []);
      setTimetable(ttData);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  useEffect(() => {
    if (!timetable.length || !session?.staffId) return;
    const g: Record<string, Record<string, Cell>> = {};
    PERIODS.forEach((p) => { g[p] = {}; DAYS.forEach((d) => { g[p][d] = null; }); });
    
    timetable.forEach((slot) => {
      const slotStaffId = String(slot.staffId ?? slot.staff_id ?? "");
      if (slotStaffId !== session.staffId) return;

      const period = String(slot.startTime ? `${slot.startTime}–${slot.endTime}` : (slot.period ?? slot.timePeriod ?? ""));
      const dayNum = Number(slot.dayOfWeek);
      const day = !isNaN(dayNum) && dayNum >= 1 && dayNum <= 5 ? DAYS[dayNum - 1] : String(slot.day ?? slot.dayOfWeek ?? "");

      if (g[period] && DAYS.includes(day)) {
        g[period][day] = {
          subject: String(slot.subject?.subjectName ?? slot.subjectName ?? slot.subject ?? ""),
          class: String(slot.class?.className ?? slot.className ?? slot.class ?? ""),
          slotId: String(slot.timetableEntryId ?? slot.slotId ?? slot.timetable_slot_id ?? ""),
        };
      }
    });
    setGrid(g);
  }, [timetable, session]);

  const filledCount = Object.values(grid).flatMap(Object.values).filter(Boolean).length;
  const totalSlots = PERIODS.length * DAYS.length;

  return (
    <DashboardShell title="My Timetable" subtitle="Weekly class schedule" badge="Teacher" role="teacher">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Periods / Day", value: String(PERIODS.length), icon: "⏰" },
          { label: "School Days", value: String(DAYS.length), icon: "📅" },
          { label: "My Classes / Week", value: String(filledCount), icon: "📚" },
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

      <div style={{ background: "white", border: "1px solid var(--line)", borderRadius: 20, overflow: "auto", boxShadow: "var(--shadow-card)", marginBottom: 30 }}>
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
                  <div key={`${period}-${day}`} className={`timetable-slot ${cell ? "filled" : ""}`} style={cell ? { background: "rgba(5, 150, 105, 0.05)", borderLeft: "3px solid #059669" } : {}}>
                    {cell ? (
                      <>
                        <div className="timetable-subject" style={{ color: "#064e3b", fontWeight: 700 }}>{cell.subject}</div>
                        <div className="timetable-teacher" style={{ color: "#059669", fontWeight: 600 }}>👥 {cell.class}</div>
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
        </div>
      )}
    </DashboardShell>
  );
}
