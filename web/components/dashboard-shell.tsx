"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import React, { ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  subtitle: string;
  badge: string;
  role?: string;
  userName?: string;
  schoolName?: string;
  children: ReactNode;
};

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
  section: string;
};

// ─── Per-role sidebar navigation ────────────────────────────────────────────
const roleNavItems: Record<string, NavItem[]> = {
  hq: [
    { key: "hq-overview",   label: "Overview",        href: "/hq",           icon: "🧭", section: "Platform" },
    { key: "hq-tenants",    label: "Tenant Schools",  href: "/hq/tenants",   icon: "🏫", section: "Platform" },
    { key: "hq-features",   label: "Feature Toggles", href: "/hq/features",  icon: "🔧", section: "Platform" },
    { key: "audit-logs",    label: "Audit Logs",       href: "/audit-logs",   icon: "📋", section: "Platform" },
    { key: "chat",          label: "Chat",             href: "/chat",         icon: "💬", section: "Communications" },
    { key: "notifications", label: "Notifications",   href: "/notifications",icon: "🔔", section: "Communications" },
  ],
  school: [
    { key: "school-overview", label: "Overview",       href: "/school",          icon: "🏫", section: "School" },
    { key: "school-control",  label: "Control Panel",  href: "/school/control",  icon: "⚙️", section: "School" },
    { key: "school-setup",    label: "Setup & Config", href: "/school/setup",    icon: "🛠️", section: "School" },
    { key: "school-timetable",label: "Timetable",      href: "/school/timetable",icon: "📅", section: "School" },
    { key: "audit-logs",      label: "Audit Logs",     href: "/audit-logs",      icon: "📋", section: "School" },
    { key: "chat",            label: "Chat",            href: "/chat",            icon: "💬", section: "Communications" },
    { key: "notifications",   label: "Notifications",  href: "/notifications",   icon: "🔔", section: "Communications" },
  ],
  principal: [
    { key: "principal",        label: "Overview",         href: "/principal",              icon: "🎓", section: "Principal" },
    { key: "school-timetable", label: "Timetable",        href: "/school/timetable",       icon: "📅", section: "Principal" },
    { key: "principal-reports",label: "Reports",          href: "/principal/reports",      icon: "📄", section: "Principal" },
    { key: "principal-expenses",label:"Expenses",         href: "/principal/expenses",     icon: "💸", section: "Principal" },
    { key: "principal-promote",label:"Promotions",        href: "/principal/promotions",   icon: "🎓", section: "Principal" },
    { key: "audit-logs",       label: "Audit Logs",       href: "/audit-logs",             icon: "📋", section: "Admin" },
    { key: "chat",             label: "Chat",             href: "/chat",                   icon: "💬", section: "Admin" },
    { key: "notifications",    label: "Notifications",    href: "/notifications",          icon: "🔔", section: "Admin" },
  ],
  teacher: [
    { key: "teacher",              label: "My Dashboard",   href: "/teacher",              icon: "🧑‍🏫", section: "Teaching" },
    { key: "teacher-attendance",   label: "Attendance",     href: "/teacher/attendance",   icon: "✅",   section: "Teaching" },
    { key: "teacher-marks",        label: "Mark Entry",     href: "/teacher/marks",        icon: "📊",   section: "Teaching" },
    { key: "teacher-assignments",  label: "Assignments",    href: "/teacher/assignments",  icon: "📝",   section: "Teaching" },
    { key: "teacher-portfolio",    label: "Portfolio",      href: "/teacher/portfolio",    icon: "🗂️",   section: "Teaching" },
    { key: "teacher-reports",      label: "Reports",        href: "/teacher/reports",      icon: "📄",   section: "Teaching" },
    { key: "chat",                 label: "Chat",           href: "/chat",                 icon: "💬",   section: "Comms" },
    { key: "notifications",        label: "Notifications",  href: "/notifications",        icon: "🔔",   section: "Comms" },
  ],
  student: [
    { key: "student",              label: "My Dashboard",   href: "/student",              icon: "🎒",  section: "Learning" },
    { key: "student-results",      label: "My Results",     href: "/student/results",      icon: "📈",  section: "Learning" },
    { key: "student-assignments",  label: "Assignments",    href: "/student/assignments",  icon: "📌",  section: "Learning" },
    { key: "student-portfolio",    label: "My Portfolio",   href: "/student/portfolio",    icon: "🗂️",  section: "Learning" },
    { key: "notifications",        label: "Notifications",  href: "/notifications",        icon: "🔔",  section: "Updates" },
  ],
  parent: [
    { key: "parent",        label: "Overview",       href: "/parent",        icon: "👪",  section: "Parent" },
    { key: "parent-fees",   label: "Fee Payments",   href: "/parent/fees",   icon: "💳",  section: "Parent" },
    { key: "parent-reports",label: "Reports",        href: "/parent/reports",icon: "📄",  section: "Parent" },
    { key: "chat",          label: "Messages",       href: "/chat",          icon: "💬",  section: "Parent" },
    { key: "notifications", label: "Notifications",  href: "/notifications", icon: "🔔",  section: "Parent" },
  ],
  finance: [
    { key: "finance",                label: "Overview",       href: "/finance",                   icon: "💰",  section: "Finance" },
    { key: "finance-payments",       label: "Payments",       href: "/finance/payments",          icon: "🧾",  section: "Finance" },
    { key: "finance-mpesa",          label: "M-Pesa STK",     href: "/finance/mpesa",             icon: "📱",  section: "Finance" },
    { key: "finance-payroll",        label: "Payroll",        href: "/finance/payroll",           icon: "👷",  section: "Finance" },
    { key: "finance-expenses",       label: "Expenses",       href: "/finance/expenses",          icon: "📤",  section: "Finance" },
    { key: "finance-fee-structures", label: "Fee Structures", href: "/finance/fee-structures",    icon: "🗂️",  section: "Finance" },
    { key: "notifications",          label: "Notifications",  href: "/notifications",             icon: "🔔",  section: "Admin" },
    { key: "security",               label: "Security (2FA)", href: "/settings/security",         icon: "🔐",  section: "Admin" },
  ],
};

// ─── Role sidebar accent colors (also matches CSS) ──────────────────────────
const roleMeta: Record<string, { color: string; label: string; accentRgb: string }> = {
  hq:        { color: "#3b0764", label: "HQ Super Admin",    accentRgb: "124,58,237" },
  school:    { color: "#0c1a35", label: "School Admin",       accentRgb: "29,78,216" },
  principal: { color: "#064e3b", label: "Principal",          accentRgb: "5,150,105" },
  teacher:   { color: "#0e4f7a", label: "Teacher",            accentRgb: "14,79,122" },
  student:   { color: "#1e1b4b", label: "Student",            accentRgb: "99,102,241" },
  parent:    { color: "#4a044e", label: "Parent",             accentRgb: "168,85,247" },
  finance:   { color: "#431407", label: "Finance Officer",    accentRgb: "220,38,38" },
  shared:    { color: "#1e293b", label: "Shared UI",          accentRgb: "100,116,139" },
};

export function DashboardShell({
  title, subtitle, badge, role = "school", userName, schoolName, children,
}: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const meta = roleMeta[role] ?? roleMeta.shared;
  const navItems = roleNavItems[role] ?? roleNavItems.school;
  const sections = Array.from(new Set(navItems.map((n) => n.section)));

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short", month: "short", day: "numeric",
  });

  const [bottomProfileOpen, setBottomProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", role: "", email: "", school: "" });
  const bottomProfileRef = useRef<HTMLDivElement>(null);

  // CSS custom properties must be set using a computed key to satisfy the JSX parser
  const shellStyle = { ["--role-accent" as any]: meta.accentRgb } as unknown as React.CSSProperties;

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (bottomProfileRef.current && !bottomProfileRef.current.contains(event.target as Node)) {
        setBottomProfileOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setBottomProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={`dashboard-shell ${role}`} style={shellStyle}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className={`dashboard-sidebar${mobileOpen ? " mobile-open" : ""}`} style={{ background: meta.color }}>

        {/* Brand */}
        <div className="brand-block">
          <div className="brand-mark" style={{ background: `rgba(255,255,255,0.15)` }}>
            📚
          </div>
          <div>
            <div className="brand-title">CBC Swift</div>
            <div className="brand-subtitle">TechSwiftTrix</div>
          </div>
        </div>

        {/* Role badge */}
        {role !== "shared" && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.14)",
            marginBottom: 20, fontSize: 12, fontWeight: 700,
            color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
            {meta.label}
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {sections.map((section) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {navItems
                .filter((item) => item.section === section)
                .map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
                  return (
                    <Link key={item.key} href={item.href} className={`nav-link ${isActive ? "active" : ""}`}
                      style={isActive ? { background: "rgba(255,255,255,0.18)", boxShadow: `inset 3px 0 0 rgba(255,255,255,0.7)` } : {}}>
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer" ref={bottomProfileRef} style={{ position: "relative" }}>
          <div 
            className="profile-card" 
            onClick={() => setBottomProfileOpen(!bottomProfileOpen)}
            style={{ cursor: "pointer", transition: "background 0.2s" }}
          >
            <div className="avatar" style={{ background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 800 }}>
              {(userName && userName !== "Shared UI" ? userName : meta.label).slice(0, 2).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="profile-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName && userName !== "Shared UI" ? userName : meta.label}
              </div>
              <div className="profile-role" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {schoolName ?? "Online"}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              {bottomProfileOpen ? "▴" : "▾"}
            </div>
          </div>
          
          {bottomProfileOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 10px)", left: 0, right: 0,
              background: "white", borderRadius: 16, padding: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)", zIndex: 50, color: "var(--text)"
            }}>
              {!isEditingProfile ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: "50%", 
                      background: `rgba(${meta.accentRgb},0.1)`, color: `rgb(${meta.accentRgb})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 800
                    }}>
                      {(userName && userName !== "Shared UI" ? userName : meta.label).slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {userName && userName !== "Shared UI" ? userName : meta.label}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {role.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 6, display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--muted)" }}>Email:</span>
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                       —
                    </span>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 12, display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--muted)" }}>School:</span>
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {schoolName ?? "CBC Swift"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button type="button" className="btn-ghost" style={{ flex: 1, padding: "6px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8 }} onClick={(e) => { e.stopPropagation(); setProfileForm({ name: userName || meta.label, role: role.toUpperCase(), email: "—", school: schoolName || "CBC Swift" }); setIsEditingProfile(true); }}>
                      ✏️ Edit Profile
                    </button>
                  </div>
                  <LogoutButton />
                </>
              ) : (
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Edit Profile</div>
                  <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} value={profileForm.name} onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                  <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} value={profileForm.role} onChange={(e) => setProfileForm(p => ({ ...p, role: e.target.value }))} placeholder="Role" disabled />
                  <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} value={profileForm.email} onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                  <input className="form-input" style={{ fontSize: 13, padding: "6px 10px" }} value={profileForm.school} onChange={(e) => setProfileForm(p => ({ ...p, school: e.target.value }))} placeholder="School" />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button type="button" className="btn-ghost" style={{ flex: 1, padding: "6px", fontSize: 12, background: "#f1f5f9", borderRadius: 8 }} onClick={() => setIsEditingProfile(false)}>Cancel</button>
                    <button type="button" className="btn-primary" style={{ flex: 1, padding: "6px", fontSize: 12, borderRadius: 8 }} onClick={() => { alert("Profile saved (mocked)!"); setIsEditingProfile(false); }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE OVERLAY ─────────────────────────────────── */}
      {mobileOpen && (
        <div className="sidebar-overlay active" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <main className="dashboard-main">

        {/* Topbar */}
        <header 
          className="dashboard-topbar" 
          style={{ 
            background: `linear-gradient(135deg, ${meta.color}, rgb(${meta.accentRgb}))`,
            padding: "24px",
            minHeight: "140px",
            borderRadius: "0 0 32px 32px",
            color: "white",
            alignItems: "flex-start",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            marginBottom: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}
        >
          {/* Top row with actions */}
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
                style={{ color: "white" }}
              >
                {mobileOpen ? "✕" : "☰"}
              </button>
            </div>

            <div className="topbar-actions">
              <span className="topbar-chip" style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none" }}>{dateLabel}</span>
              <Link href="/notifications">
                <button type="button" className="icon-button" aria-label="Notifications" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
                  🔔<span className="badge-dot" />
                </button>
              </Link>
              <Link href="/chat">
                <button type="button" className="icon-button" aria-label="Chat" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>💬</button>
              </Link>
              <div ref={profileRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="user-pill"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                  style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "white" }}
                >
                  <span className="avatar-sm" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                    {(userName && userName !== "Shared UI" ? userName : meta.label).slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userName && userName !== "Shared UI" ? userName : meta.label}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>▾</span>
                </button>

              {profileOpen && (
                <div
                  role="menu"
                  aria-label="Profile menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    minWidth: 220,
                    background: "white",
                    border: "1px solid var(--line)",
                    borderRadius: 16,
                    boxShadow: "0 16px 40px rgba(15,23,42,0.16)",
                    padding: 8,
                    zIndex: 40,
                    color: "var(--text)"
                  }}
                >
                  <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid var(--line)", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{userName && userName !== "Shared UI" ? userName : meta.label}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{schoolName ?? "CBC Swift"}</div>
                  </div>

                  <Link href="/settings/security">
                    <div style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "var(--text)", cursor: "pointer" }} onClick={() => setProfileOpen(false)}>
                      🔐 Security settings
                    </div>
                  </Link>
                  <Link href="/notifications">
                    <div style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "var(--text)", cursor: "pointer" }} onClick={() => setProfileOpen(false)}>
                      🔔 Notifications
                    </div>
                  </Link>
                  <Link href="/chat">
                    <div style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "var(--text)", cursor: "pointer" }} onClick={() => setProfileOpen(false)}>
                      💬 Messages
                    </div>
                  </Link>

                  <div style={{ padding: "8px 4px 4px" }}>
                    <LogoutButton />
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Bottom row with title (Welcome Banner merged here) */}
          <div className="page-title-row" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, marginTop: 10, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "white" }}>{title}</h1>
              {role !== "shared" && (
                <span className="pill" style={{ background: "rgba(255,255,255,0.2)", color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
                  {badge}
                </span>
              )}
            </div>
            <p className="subtitle" style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.85)" }}>
              {subtitle}
            </p>
          </div>
        </header>

        <div className="dashboard-content" style={{ padding: "0 32px 40px" }}>{children}</div>
      </main>
    </div>
  );
}
