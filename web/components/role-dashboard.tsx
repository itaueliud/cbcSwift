"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dashboards } from "@/lib/dashboard-data";
import { apiFetch } from "@/lib/api";
import { clearSession, readSession, type Session } from "@/lib/session";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";

type Props = { role: string };

const roleEndpoint: Record<string, string> = {
  hq: "/hq/stats",
  school: "/school/overview",
  principal: "/principal/analytics",
  teacher: "/teacher/dashboard-stats",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
  finance: "/finance/dashboard",
  shared: "",
};

function deriveRoleSession(session: Session | null, role: string) {
  if (!session) return null;
  if (session.type === "hq" && role === "hq") return session;
  if (session.type === "school") {
    const r = (session.role ?? "").toUpperCase();
    if (role === "school"    && r === "ADMIN")     return session;
    if (role === "principal" && r === "PRINCIPAL") return session;
    if (role === "teacher"   && r === "TEACHER")   return session;
    if (role === "student"   && r === "STUDENT")   return session;
    if (role === "parent"    && r === "PARENT")    return session;
    if (role === "finance"   && r === "FINANCE")   return session;
  }
  return null;
}

const quickActionsByRole: Record<string, Array<{ label: string; href: string; icon: string }>> = {
  hq:        [{ label:"Onboard School",    href:"/hq/tenants",            icon:"🏫" },{ label:"Feature Toggles", href:"/hq/features",          icon:"🔧" },{ label:"Audit Logs",       href:"/audit-logs",           icon:"📋" },{ label:"Chat",             href:"/chat",                 icon:"💬" }],
  school:    [{ label:"Control Panel",     href:"/school/control",        icon:"⚙️" },{ label:"Setup",           href:"/school/setup",          icon:"🛠️" },{ label:"Timetable",        href:"/school/timetable",     icon:"📅" },{ label:"Chat",             href:"/chat",                 icon:"💬" }],
  principal: [{ label:"Expenses",          href:"/principal/expenses",    icon:"💸" },{ label:"Reports",         href:"/principal/reports",     icon:"📄" },{ label:"Promotions",       href:"/principal/promotions", icon:"🎓" },{ label:"Chat",             href:"/chat",                 icon:"💬" }],
  teacher:   [{ label:"My Class",          href:"/teacher/students",      icon:"🎒" },{ label:"Timetable",         href:"/teacher/timetable",     icon:"📅" },{ label:"Attendance",        href:"/teacher/attendance",    icon:"✅" },{ label:"Mark Entry",      href:"/teacher/marks",         icon:"📊" },{ label:"Assignments",      href:"/teacher/assignments",  icon:"📝" },{ label:"Portfolio",        href:"/teacher/portfolio",    icon:"🗂️" },{ label:"Reports",         href:"/teacher/reports",      icon:"📄" },{ label:"Chat",            href:"/chat",                 icon:"💬" }],
  student:   [{ label:"Timetable",         href:"/student/timetable",     icon:"📅" },{ label:"My Results",        href:"/student/results",       icon:"📈" },{ label:"Assignments",     href:"/student/assignments",   icon:"📌" },{ label:"Portfolio",        href:"/student/portfolio",    icon:"🗂️" }],
  parent:    [{ label:"Fee Payment",       href:"/parent/fees",           icon:"💳" },{ label:"Reports",         href:"/parent/reports",        icon:"📄" },{ label:"Messages",         href:"/chat",                 icon:"💬" },{ label:"Notifications",    href:"/notifications",        icon:"🔔" }],
  finance:   [{ label:"Record Payment",    href:"/finance/payments",      icon:"🧾" },{ label:"M-Pesa STK",      href:"/finance/mpesa",         icon:"📱" },{ label:"Payroll",          href:"/finance/payroll",      icon:"👷" },{ label:"Expenses",         href:"/finance/expenses",     icon:"📤" },{ label:"Fee Structures",  href:"/finance/fee-structures",icon:"🗂️" }],
};

const activityByRole: Record<string, Array<{ text: string; time: string; type: "blue"|"green"|"amber"|"red" }>> = {
  hq:        [{ text:"New school onboarded: Sunrise Academy",      time:"2h ago",  type:"green" },{ text:"Subscription renewed: Green Valley",        time:"5h ago",  type:"blue"  },{ text:"System health check passed",               time:"1d ago",  type:"green" },{ text:"Audit: Feature toggle changed",             time:"2d ago",  type:"amber" }],
  school:    [{ text:"Term report published for Grade 6",          time:"1h ago",  type:"green" },{ text:"3 new students admitted",                   time:"3h ago",  type:"blue"  },{ text:"Fee payment received: KSh 12,000",          time:"5h ago",  type:"green" },{ text:"Timetable updated for Class 8",             time:"1d ago",  type:"amber" }],
  principal: [{ text:"Attendance flagged: Class 6B below 80%",     time:"30m ago", type:"amber" },{ text:"John submitted marks for Grade 5",          time:"2h ago",  type:"blue"  },{ text:"Expense request pending approval",          time:"4h ago",  type:"amber" },{ text:"Term 1 report ready for review",            time:"1d ago",  type:"green" }],
  teacher:   [{ text:"Marks saved for Grade 4 Math",               time:"1h ago",  type:"green" },{ text:"Attendance completed for today",             time:"2h ago",  type:"green" },{ text:"New assignment: Science project due Fri",   time:"1d ago",  type:"blue"  },{ text:"Parent message received",                  time:"2d ago",  type:"blue"  }],
  student:   [{ text:"Results published for Term 1 exams",         time:"1h ago",  type:"green" },{ text:"Assignment due: English essay — tomorrow",  time:"today",   type:"amber" },{ text:"Portfolio item added by teacher",           time:"2d ago",  type:"blue"  },{ text:"New notice from school admin",              time:"3d ago",  type:"blue"  }],
  parent:    [{ text:"Fee payment confirmed: KSh 4,500 via M-Pesa",time:"2h ago",  type:"green" },{ text:"Term 1 report ready for download",          time:"1d ago",  type:"blue"  },{ text:"Absence alert: 2 missed days this week",   time:"2d ago",  type:"amber" },{ text:"School notice: Parents meeting on Friday",  time:"3d ago",  type:"blue"  }],
  finance:   [{ text:"M-Pesa STK: KSh 3,200 — confirmed",         time:"30m ago", type:"green" },{ text:"Payroll processed for 12 staff",             time:"3h ago",  type:"blue"  },{ text:"Expense submitted — pending approval",      time:"5h ago",  type:"amber" },{ text:"Fee structure updated for Term 2",          time:"1d ago",  type:"blue"  }],
};

export function RoleDashboard({ role }: Props) {
  const router = useRouter();
  const dashboard = dashboards.find((d) => d.key === role) ?? dashboards[0];
  const [session, setSession] = useState<Session | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role === "shared") {
      setSession({ token:"", type:"school", role:"ADMIN", tenantId:"shared", fullName:"Shared UI", email:"shared@cbcswift.local", schoolName:"Shared Components" });
      return;
    }
    const current = deriveRoleSession(readSession(), role);
    if (!current) { clearSession(); router.replace("/login"); return; }
    setSession(current);
  }, [role, router]);

  useEffect(() => {
    if (!session || !roleEndpoint[role]) return;
    apiFetch<Record<string, unknown>>(roleEndpoint[role], {}, session.token)
      .then(setPayload)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [role, session]);

  const metrics = useMemo(() => {
    const base = [...dashboard.metrics];
    if (!payload) return base.slice(0, 4);
    if (typeof payload.total_students === "number") base.unshift({ label:"Students", value:String(payload.total_students), description:"Live count" });
    if (typeof payload.total_staff    === "number") base.unshift({ label:"Staff",    value:String(payload.total_staff),    description:"Live count" });
    if (typeof payload.fee_collected  === "number") base.unshift({ label:"Collected",value:`KSh ${(payload.fee_collected as number).toLocaleString()}`, description:"Live total" });
    return base.slice(0, 4);
  }, [dashboard.metrics, payload]);

  if (!session) return null;

  const quickActions = quickActionsByRole[role] ?? [];
  const activity     = activityByRole[role]    ?? [];

  return (
    <DashboardShell
      title={dashboard.label}
      subtitle={`${session.schoolName ?? session.hqRole ?? session.role ?? ""} · ${session.email}`}
      badge={dashboard.badge}
      role={role}
      userName={session.fullName}
      schoolName={session.schoolName}
    >
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="quick-actions" style={{ marginBottom: 20 }}>
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}>
              <button type="button" className="quick-action-btn">
                <span>{a.icon}</span><span>{a.label}</span>
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Stat Cards */}
      <div className="card-grid" style={{ marginBottom: 24 }}>
        {metrics.map((m) => <StatCard key={m.label} {...m} />)}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding:"12px 16px", borderRadius:12, background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", marginBottom:20, display:"flex", gap:10, alignItems:"center" }}>
          <span>⚠️</span>
          <div><strong style={{ fontSize:14 }}>Live data unavailable</strong> — showing demo data. ({error})</div>
        </div>
      )}

      {/* Body: sections + activity */}
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 320px", gap:24 }}>

        {/* Left: feature sections */}
        <div>
          {dashboard.sections.map((section) => (
            <div key={section.heading} style={{ marginBottom:24 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--muted)", marginBottom:12 }}>{section.heading}</div>
              <div className="card-grid">
                {section.features.map((f) => (
                  <article key={f.title} className="feature-card">
                    {f.href ? (
                      <Link href={f.href}>
                        <div className="name" style={{ color:"var(--brand)", cursor:"pointer" }}>
                          {f.title}
                          {f.badge && <span className="pill" style={{ marginLeft:6, fontSize:10 }}>{f.badge}</span>}
                        </div>
                      </Link>
                    ) : (
                      <div className="name">
                        {f.title}
                        {f.badge && <span className="pill" style={{ marginLeft:6, fontSize:10 }}>{f.badge}</span>}
                      </div>
                    )}
                    <div className="desc">{f.description}</div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: activity + links */}
        <div>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--muted)", marginBottom:12 }}>Recent Activity</div>
            <div className="activity-feed">
              {activity.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-dot ${item.type}`} />
                  <div>
                    <div className="activity-text">{item.text}</div>
                    <div className="activity-time">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--muted)", marginBottom:12 }}>Quick Links</div>
            <div className="panel-card" style={{ display:"grid", gap:4 }}>
              {[{ href:"/chat", icon:"💬", label:"Chat", sub:"School communication" },{ href:"/notifications", icon:"🔔", label:"Notifications", sub:"Alerts and updates" }].map((link) => (
                <Link key={link.href} href={link.href}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, cursor:"pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-soft)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span style={{ fontSize:18 }}>{link.icon}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{link.label}</div>
                      <div style={{ fontSize:12, color:"var(--muted)" }}>{link.sub}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
