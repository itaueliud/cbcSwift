"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";
import { useState } from "react";

const controlModules = [
  {
    icon: "📅", title: "Academic Year Setup", desc: "Configure terms, dates, and current academic year.",
    href: "/school/setup", color: "#1d4ed8",
  },
  {
    icon: "📚", title: "Class Management", desc: "Manage streams, capacities, and grade tiers.",
    href: "/school/setup", color: "#059669",
  },
  {
    icon: "🗓️", title: "Timetable Builder", desc: "Drag-and-drop lesson periods and assign teachers.",
    href: "/school/timetable", color: "#7c3aed",
  },
  {
    icon: "👩‍🏫", title: "Staff Onboarding", desc: "Add TSC numbers, specializations, and portal access.",
    href: "/school/setup", color: "#0e4f7a",
  },
  {
    icon: "🎒", title: "Student Admissions", desc: "Register students with NEMIS, class, and parent links.",
    href: "/school/setup", color: "#1e1b4b",
  },
  {
    icon: "💬", title: "Communication Hub", desc: "Announcements, chat rooms, and school-wide alerts.",
    href: "/chat", color: "#4a044e",
  },
  {
    icon: "📊", title: "School Analytics", desc: "Attendance rates, CBC compliance, and performance trends.",
    href: "/school", color: "#431407",
  },
  {
    icon: "📋", title: "Ministry Reports", desc: "Export compliance and performance reports for NEMIS/KNEC.",
    href: "/school", color: "#064e3b",
  },
  {
    icon: "🚌", title: "Transport System", desc: "Bus routes, vehicles, and student transport management.",
    href: "/school", color: "#374151",
  },
];

type Toggle = { key: string; label: string; desc: string; defaultOn: boolean };

const featureToggles: Toggle[] = [
  { key: "sms", label: "SMS Notifications", desc: "Send SMS alerts for fees, attendance, and reports.", defaultOn: true },
  { key: "email", label: "Email Notifications", desc: "Email parents and staff on key events.", defaultOn: true },
  { key: "mpesa", label: "M-Pesa Payments", desc: "Enable STK push and webhook reconciliation.", defaultOn: true },
  { key: "ai", label: "AI Analytics Layer", desc: "Risk prediction and performance intelligence.", defaultOn: true },
  { key: "parent_portal", label: "Parent Portal", desc: "Allow parents to view results and pay fees.", defaultOn: true },
  { key: "student_portal", label: "Student Portal", desc: "Enable student self-service access.", defaultOn: true },
  { key: "portfolio", label: "CBC Portfolio", desc: "Teacher and student portfolio upload features.", defaultOn: true },
  { key: "career", label: "Career Pathways (SSS)", desc: "Enable SSS career suggestion module.", defaultOn: false },
];

export default function SchoolControlPage() {
  const session = useProtectedSession(["ADMIN","PRINCIPAL"]);
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(featureToggles.map((t) => [t.key, t.defaultOn]))
  );

  function toggle(key: string) {
    setToggles((prev) => {
      const next = !prev[key];
      // Optimistic update, ignoring failures for mock purposes if backend doesn't exist yet
      apiFetch(`/school/control/features/${key}`, { 
        method: "PATCH", 
        body: JSON.stringify({ isEnabled: next }) 
      }, session?.token || "").catch(() => console.warn("Feature toggle persistence mock"));
      return { ...prev, [key]: next };
    });
  }

  if (!session) return null;

  return (
    <DashboardShell title="Control Panel" subtitle="Unified school operating layer" badge="School Admin" role="school">
      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Features", value: String(Object.values(toggles).filter(Boolean).length), icon: "✅" },
          { label: "Modules Available", value: String(controlModules.length), icon: "🧩" },
          { label: "School Status", value: "Live", icon: "🟢" },
          { label: "Last Updated", value: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), icon: "🕐" },
        ].map((item) => (
          <div key={item.label} className="panel-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{item.value}</div>
              <div className="muted" style={{ fontSize: 12 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div className="section">
        <h3>School Modules</h3>
        <div className="control-panel-grid">
          {controlModules.map((mod) => (
            <Link key={mod.title} href={mod.href}>
              <div className="control-card">
                <div className="control-card-icon">{mod.icon}</div>
                <h3>{mod.title}</h3>
                <p>{mod.desc}</p>
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: mod.color }}>Open →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature toggles */}
      <div className="section">
        <h3>Feature Toggles</h3>
        <div className="panel-card">
          {featureToggles.map((feature) => (
            <div key={feature.key} className="toggle-row">
              <div>
                <div className="toggle-label">{feature.label}</div>
                <div className="toggle-desc">{feature.desc}</div>
              </div>
              <button
                type="button"
                className={`toggle-switch ${toggles[feature.key] ? "on" : ""}`}
                onClick={() => toggle(feature.key)}
                aria-label={`Toggle ${feature.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="section">
        <h3 style={{ color: "#dc2626" }}>⚠️ Danger Zone</h3>
        <div className="panel-card" style={{ border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.02)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Reset Academic Year Data</div>
              <div className="desc">Clear current term data and start a new academic cycle. This cannot be undone.</div>
            </div>
            <button type="button" className="btn-danger" disabled>
              🔒 Reset (Admin Only)
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
