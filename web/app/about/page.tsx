// web/app/about/page.tsx
import Link from "next/link";

const features = [
  {
    icon: "📚",
    title: "CBC Academic Management",
    desc: "EE/ME/AE/BE grading, portfolios, competency tracking aligned to Kenya's CBC framework.",
    color: "#1d4ed8",
  },
  {
    icon: "💳",
    title: "M-Pesa Fee Collection",
    desc: "STK push payments, instant digital receipts, parent fee statements, and automated balance tracking.",
    color: "#059669",
  },
  {
    icon: "📊",
    title: "AI Analytics",
    desc: "Attendance predictions, performance trends, ministry-ready reports, and early intervention alerts.",
    color: "#7c3aed",
  },
  {
    icon: "👪",
    title: "Parent Portal",
    desc: "Real-time academic results, fee balance visibility, direct teacher communication channel.",
    color: "#db2777",
  },
  {
    icon: "🔐",
    title: "Enterprise Security",
    desc: "2FA for admins, role-based access control (RBAC), full audit logs, and tenant data isolation.",
    color: "#dc2626",
  },
  {
    icon: "🏫",
    title: "Multi-School Platform",
    desc: "HQ manages all schools from one dashboard — feature flags, billing, and cross-school analytics.",
    color: "#0891b2",
  },
];

const roles = [
  { icon: "👑", label: "HQ Admin", desc: "Platform-wide management, tenant provisioning, billing oversight" },
  { icon: "⚙️", label: "School Admin", desc: "School configuration, staff management, fee structure setup" },
  { icon: "🎓", label: "Principal", desc: "Academic oversight, teacher evaluation, school-wide reports" },
  { icon: "🧑‍🏫", label: "Teacher", desc: "CBC mark entry, lesson plans, student assessment, parent comms" },
  { icon: "🎒", label: "Student", desc: "View results, portfolios, assignments, and attendance records" },
  { icon: "👪", label: "Parent", desc: "Track child progress, pay fees via M-Pesa, message teachers" },
  { icon: "💰", label: "Finance Officer", desc: "Fee collection, M-Pesa reconciliation, financial reports" },
];

const rubrics = [
  { code: "EE", label: "Exceeding Expectations", color: "#059669", desc: "Student demonstrates exceptional understanding beyond grade level" },
  { code: "ME", label: "Meeting Expectations", color: "#1d4ed8", desc: "Student meets the required competency standards for their grade" },
  { code: "AE", label: "Approaching Expectations", color: "#f59e0b", desc: "Student is progressing towards but hasn't fully met standards" },
  { code: "BE", label: "Below Expectations", color: "#dc2626", desc: "Student needs additional support to reach grade-level standards" },
];

export default function AboutPage() {
  return (
    <div style={{ background: "#f0f2f5", minHeight: "100vh" }}>
      {/* ── Navigation ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", background: "white",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "grid", placeItems: "center", fontSize: 16,
            boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
          }}>
            📚
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>CBC Swift</span>
        </div>
        <Link href="/login">
          <button type="button" style={{
            padding: "9px 20px", borderRadius: 10,
            background: "#1d4ed8", color: "white",
            border: "none", fontWeight: 700, fontSize: 13,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 8px rgba(29,78,216,0.25)",
          }}>
            ← Back to Login
          </button>
        </Link>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ── Hero Section ── */}
        <section style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 14px", borderRadius: 20,
            background: "rgba(29,78,216,0.1)", border: "1px solid rgba(29,78,216,0.2)",
            fontSize: 12, fontWeight: 700, color: "#1d4ed8",
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d4ed8" }} />
            About the Platform
          </div>
          <h1 style={{
            fontSize: 40, fontWeight: 900, color: "#0f172a",
            lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-0.02em",
          }}>
            What is CBC Swift?
          </h1>
          <p style={{
            fontSize: 17, color: "#475569", lineHeight: 1.8, maxWidth: 700, margin: "0 auto",
          }}>
            CBC Swift is Kenya&apos;s first AI-powered, CBC-compliant school management system.
            Built by TechSwiftTrix, it runs your entire school from one platform — from
            student admission and CBC mark entry to M-Pesa fee collection and automated term reports.
          </p>
        </section>

        {/* ── The Problem ── */}
        <section style={{
          background: "#0d1b3e", borderRadius: 20, padding: "36px 32px",
          marginBottom: 48, position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px", pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: "0 0 12px" }}>
              The Problem We Solve
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.8 }}>
              Before CBC Swift, Kenyan schools used spreadsheets, paper registers, and disconnected
              apps. CBC rubrics were poorly tracked, fees were a manual nightmare, and parents had
              no visibility into their child&apos;s progress. School admins spent more time on paperwork
              than education. We built CBC Swift to change that.
            </p>
          </div>
        </section>

        {/* ── 6 Feature Cards ── */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", textAlign: "center" }}>
            How CBC Swift Solves It
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, textAlign: "center", marginBottom: 32 }}>
            Six integrated modules that cover every aspect of school management.
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}>
            {features.map((f) => (
              <div key={f.title} style={{
                background: "white", borderRadius: 16, padding: "24px 22px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: `${f.color}14`, border: `1.5px solid ${f.color}30`,
                  display: "grid", placeItems: "center", fontSize: 20, marginBottom: 14,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who Uses It ── */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", textAlign: "center" }}>
            Who Uses CBC Swift?
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, textAlign: "center", marginBottom: 32 }}>
            7 distinct roles, each with their own tailored dashboard.
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}>
            {roles.map((r) => (
              <div key={r.label} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                background: "white", borderRadius: 14, padding: "18px 18px",
                border: "1px solid #e2e8f0",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  display: "grid", placeItems: "center", fontSize: 18,
                }}>
                  {r.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 3 }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    {r.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CBC Compliance ── */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", textAlign: "center" }}>
            CBC Compliance
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, textAlign: "center", marginBottom: 32 }}>
            Full support for Kenya&apos;s Competency-Based Curriculum assessment rubrics.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {rubrics.map((r) => (
              <div key={r.code} style={{
                background: "white", borderRadius: 14, padding: "20px 18px",
                border: "1px solid #e2e8f0", borderLeft: `4px solid ${r.color}`,
              }}>
                <div style={{
                  fontWeight: 800, fontSize: 24, color: r.color, marginBottom: 4, letterSpacing: "-0.02em",
                }}>
                  {r.code}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 6 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  {r.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── M-Pesa Integration ── */}
        <section style={{
          background: "linear-gradient(135deg, #059669, #10b981)", borderRadius: 20,
          padding: "36px 32px", marginBottom: 48, color: "white",
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 12px" }}>
            💳 M-Pesa Integration
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>
            CBC Swift integrates directly with Safaricom&apos;s M-Pesa Daraja API for seamless
            fee collection. Parents receive STK push prompts on their phone, and payments are
            instantly reconciled in the system. Digital receipts are generated automatically,
            and fee balances update in real time for both parents and finance officers.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {["STK Push", "Auto Receipts", "Real-time Balance", "Fee Statements", "Reconciliation"].map((t) => (
              <span key={t} style={{
                padding: "6px 14px", borderRadius: 20,
                background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
                fontSize: 12, fontWeight: 600,
              }}>
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* ── Security ── */}
        <section style={{
          background: "white", borderRadius: 20, padding: "36px 32px",
          border: "1px solid #e2e8f0", marginBottom: 48,
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>
            🔐 Security &amp; Compliance
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#475569", marginBottom: 20 }}>
            CBC Swift is built with enterprise-grade security from the ground up.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { title: "Two-Factor Auth (2FA)", desc: "TOTP-based 2FA for admin and finance roles" },
              { title: "Role-Based Access", desc: "7 roles with strict permission boundaries" },
              { title: "Audit Logging", desc: "Every action is logged with user, IP, and timestamp" },
              { title: "Tenant Isolation", desc: "Complete data separation between schools" },
            ].map((s) => (
              <div key={s.title} style={{
                padding: "16px", borderRadius: 12,
                background: "#f8fafc", border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Get Started ── */}
        <section style={{
          background: "#0d1b3e", borderRadius: 20, padding: "40px 32px",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px", pointerEvents: "none",
          }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", margin: "0 0 10px" }}>
              Ready to Transform Your School?
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 28, lineHeight: 1.7 }}>
              Contact TechSwiftTrix to get your school onboarded to the CBC Swift platform.
              We handle setup, training, and ongoing support.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link href="/login">
                <button type="button" style={{
                  padding: "13px 28px", borderRadius: 12,
                  background: "#1d4ed8", color: "white",
                  border: "none", fontWeight: 700, fontSize: 15,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  boxShadow: "0 4px 16px rgba(29,78,216,0.35)",
                }}>
                  🏫 Go to School Login
                </button>
              </Link>
              <Link href="/hq-login">
                <button type="button" style={{
                  padding: "13px 28px", borderRadius: 12,
                  background: "rgba(255,255,255,0.1)", color: "white",
                  border: "1.5px solid rgba(255,255,255,0.2)", fontWeight: 700,
                  fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}>
                  👑 HQ Login
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2025 TechSwiftTrix · CBC Swift v2.0 · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
