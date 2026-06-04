import Link from "next/link";

const features = [
  {
    icon: "📚",
    title: "CBC Academic Tracking",
    desc: "Full EE/ME/AE/BE rubric coverage, CBC learning areas, and automated term report generation.",
  },
  {
    icon: "💳",
    title: "M-Pesa Payments",
    desc: "Real-time STK push, webhook confirmation, fee structures, payroll, and receipt management.",
  },
  {
    icon: "🤖",
    title: "AI Intelligence Layer",
    desc: "Attendance risk prediction, teacher performance scoring, and automatic report summaries.",
  },
  {
    icon: "💬",
    title: "Communication Hub",
    desc: "Real-time chat, SMS/email notifications, parent messaging, and role-scoped announcements.",
  },
  {
    icon: "🏫",
    title: "Multi-School Platform",
    desc: "One HQ, unlimited schools. Each tenant gets their own data, roles, and workspace.",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "County-level analytics, school rankings, class comparisons, and at-risk student detection.",
  },
];

const roles = [
  { label: "HQ Admin", icon: "👑", color: "#3b0764", desc: "Platform control, tenant onboarding, revenue analytics, and system health." },
  { label: "School Admin", icon: "⚙️", color: "#0c1a35", desc: "Full school setup, academic year, staff, students, and governance tools." },
  { label: "Principal", icon: "🎓", color: "#064e3b", desc: "School analytics, report approvals, expense sign-offs, and at-risk tracking." },
  { label: "Teacher", icon: "🧑‍🏫", color: "#0e4f7a", desc: "Attendance, CBC mark entry, lesson plans, assignments, and student portfolios." },
  { label: "Student", icon: "🎒", color: "#1e1b4b", desc: "Results, assignments, portfolio builder, AI tutor, and career pathways." },
  { label: "Parent", icon: "👪", color: "#4a044e", desc: "Child progress, fee payments via M-Pesa, reports, and teacher messaging." },
  { label: "Finance Officer", icon: "💰", color: "#431407", desc: "Fee collection, M-Pesa STK push, payroll, budgets, and financial reports." },
];

const testimonials = [
  { name: "Head of School, Nairobi", quote: "It feels like a government-grade education OS, but simple enough for our whole staff to use from day one." },
  { name: "Class Teacher, Mombasa", quote: "Attendance and marks take half the time now. The CBC rubric scoring actually makes sense in this system." },
  { name: "Parent, Kisumu", quote: "I can see my child's results, get notified when fees are due, and pay via M-Pesa — all from my phone." },
];

const steps = [
  { n: 1, title: "School Onboarding", desc: "Register your school, configure structure, and get your secure subdomain." },
  { n: 2, title: "Role Assignment", desc: "Assign teachers, admins, learners, parents, and finance officers." },
  { n: 3, title: "Live Data Capture", desc: "Track attendance, performance, payments, and engagement daily." },
  { n: 4, title: "Smart Insights", desc: "AI surfaces alerts, summaries, and leadership signals automatically." },
];

export default function HomePage() {
  return (
    <div className="landing-shell">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-orb landing-orb-c" />

      {/* NAV */}
      <header className="container landing-nav">
        <div className="brand-mark">
          <div className="brand-dot">📚</div>
          <div>
            <div className="brand-name">CBC Swift</div>
            <div className="brand-tag">by TechSwiftTrix</div>
          </div>
        </div>
        <nav className="landing-links">
          <Link className="landing-link" href="#features">Features</Link>
          <Link className="landing-link" href="#roles">Dashboards</Link>
          <Link className="landing-link" href="#how-it-works">How it works</Link>
          <Link className="landing-link" href="#trust">Trust</Link>
          <Link className="landing-link cta" href="/login">Login →</Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="container landing-hero">
        <div className="landing-copy animate-rise">
          <div style={{ display: "inline-flex", gap: 8, marginBottom: 16 }}>
            <span className="trust-chip">✅ CBC-Ready</span>
            <span className="trust-chip">🇰🇪 Built for Kenya</span>
            <span className="trust-chip">🤖 AI-Powered</span>
          </div>
          <h1>The AI School Operating System for Africa.</h1>
          <p className="landing-summary">
            CBC Swift is a complete, multi-tenant school management platform — academic tracking,
            M-Pesa payments, AI analytics, and role-based dashboards for every stakeholder.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary pulse-cta" href="/request-system">
              Request This System
            </Link>
            <Link className="chip" href="/login" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(248,251,255,0.86)" }}>
              Login to Dashboard
            </Link>
            <Link className="chip" href="/first-login" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(248,251,255,0.78)" }}>
              First-time Setup
            </Link>
          </div>
          <div className="auth-points" style={{ marginTop: 20 }}>
            <span className="auth-point">🏫 Multi-school HQ</span>
            <span className="auth-point">📱 M-Pesa STK push</span>
            <span className="auth-point">🤖 AI risk detection</span>
            <span className="auth-point">📊 CBC reporting</span>
          </div>
        </div>

        <aside className="landing-panel animate-rise delay-2">
          <div className="landing-layers">
            <div className="landing-layer landing-layer-a" />
            <div className="landing-layer landing-layer-b" />
          </div>
          <div className="landing-card">
            <div className="dashboard-topline">
              <span className="pill">📡 Live system preview</span>
              <span className="snapshot-badge">● Active</span>
            </div>
            <div className="preview-grid">
              <div className="preview-main">
                <div className="preview-label">CBC Readiness</div>
                <div className="preview-value">98.4%</div>
                <div className="preview-sub">Across 3 active schools</div>
                <div className="chart-bars">
                  <span style={{ height: "40%" }} />
                  <span style={{ height: "62%" }} />
                  <span style={{ height: "78%" }} />
                  <span style={{ height: "55%" }} />
                  <span style={{ height: "88%" }} />
                  <span style={{ height: "72%" }} />
                </div>
              </div>
              <div className="preview-side">
                <div className="mini-card">
                  <div className="mini-title">🤖 AI Alert</div>
                  <div className="mini-body">Attendance risk in Class 6B — 4 students flagged.</div>
                </div>
                <div className="mini-card">
                  <div className="mini-title">💳 M-Pesa</div>
                  <div className="mini-body">KSh 4,500 confirmed in 12 seconds.</div>
                </div>
              </div>
            </div>
            <div className="notification-pill">
              <span className="notification-dot" />
              Principal report ready — Green Valley Academy
            </div>
          </div>
        </aside>
      </section>

      {/* FEATURES */}
      <section className="container section-block" id="features">
        <div className="section-head">
          <div>
            <span className="section-kicker">Core Features</span>
            <h2>Everything a modern Kenyan school needs.</h2>
          </div>
          <p className="section-copy">
            Built from the ground up for CBC, M-Pesa, and the realities of running schools in Kenya.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
          {features.map((feature, i) => (
            <article key={feature.title} className={`feature-rail animate-rise delay-${i + 1}`}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section className="container section-block" id="roles">
        <div className="section-head">
          <div>
            <span className="section-kicker">Role Dashboards</span>
            <h2>Seven dashboards. One connected platform.</h2>
          </div>
          <p className="section-copy">
            Every user sees the exact surface area they need — nothing more, nothing less.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
          {roles.map((role, i) => (
            <article key={role.label} className={`preview-card animate-rise delay-${(i % 4) + 1}`} style={{ borderTop: `3px solid ${role.color}` }}>
              <div className="preview-card-top">
                <div className="card-badge">{role.icon}</div>
                <div className="card-dot" />
              </div>
              <h3>{role.label}</h3>
              <p>{role.desc}</p>
            </article>
          ))}
          {/* Extra CBC card */}
          <article className="preview-card animate-rise delay-4">
            <div className="preview-card-top">
              <div className="card-badge">📡</div>
              <div className="card-dot" />
            </div>
            <h3>AI Analytics</h3>
            <p>Cross-role intelligence: risk alerts, scoring, summaries, and talent discovery.</p>
          </article>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container section-block" id="how-it-works">
        <div className="section-head">
          <div>
            <span className="section-kicker">How It Works</span>
            <h2>Up and running in four steps.</h2>
          </div>
          <p className="section-copy">
            Simple onboarding, powerful results. Most schools go live within a day.
          </p>
        </div>
        <div className="timeline">
          <div className="timeline-line" />
          {steps.map((step, i) => (
            <article key={step.title} className={`timeline-step animate-rise delay-${i + 1}`}>
              <div className="timeline-index">{step.n}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* AI SECTION */}
      <section className="container section-block">
        <div className="ai-panel">
          <div className="section-head ai-head">
            <div>
              <span className="section-kicker">AI Intelligence</span>
              <h2>Intelligence that helps leaders act sooner.</h2>
            </div>
            <p className="section-copy">
              Predict problems, surface patterns, and automate the paperwork.
            </p>
          </div>
          <div className="ai-grid">
            <article className="ai-item">
              <h3>⚠️ Risk Prediction</h3>
              <p>Detect attendance or performance drops before they become critical issues.</p>
            </article>
            <article className="ai-item">
              <h3>👨‍🏫 Teacher Scoring</h3>
              <p>Surface coaching signals, workload trends, and class performance gaps.</p>
            </article>
            <article className="ai-item">
              <h3>📄 Auto Reports</h3>
              <p>Generate parent-ready term summaries with one click per class.</p>
            </article>
            <article className="ai-item">
              <h3>🌟 Talent Discovery</h3>
              <p>Identify learner strengths, growth areas, and pathway opportunities early.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ANALYTICS PREVIEW */}
      <section className="container section-block">
        <div className="section-head">
          <div>
            <span className="section-kicker">Analytics Preview</span>
            <h2>Visual intelligence for every leader.</h2>
          </div>
        </div>
        <div className="analytics-grid">
          <article className="analytics-card">
            <div className="analytics-header">
              <span>Performance trend</span>
              <strong>+18%</strong>
            </div>
            <div className="analytics-chart">
              <span style={{ height: "46%" }} />
              <span style={{ height: "58%" }} />
              <span style={{ height: "72%" }} />
              <span style={{ height: "64%" }} />
              <span style={{ height: "82%" }} />
              <span style={{ height: "90%" }} />
            </div>
          </article>
          <article className="analytics-card">
            <div className="analytics-header">
              <span>School ranking</span>
              <strong>Top 5</strong>
            </div>
            <div className="ranking-list">
              <div><span>1</span> Green Valley Academy <strong>98</strong></div>
              <div><span>2</span> Hillcrest Primary <strong>95</strong></div>
              <div><span>3</span> Sunrise JSS <strong>93</strong></div>
            </div>
          </article>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container section-block" id="trust">
        <div className="section-head">
          <div>
            <span className="section-kicker">Trust</span>
            <h2>Built to feel trustworthy from the first glance.</h2>
          </div>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((t, i) => (
            <article key={t.name} className={`testimonial-card animate-rise delay-${i + 1}`}>
              <p>"{t.quote}"</p>
              <strong>{t.name}</strong>
            </article>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container final-cta">
        <div className="final-cta-card">
          <span className="section-kicker">Ready to transform your school?</span>
          <h2>Africa's most complete school operating system.</h2>
          <p>
            CBC Swift brings academic tracking, M-Pesa payments, AI analytics, and
            role-based dashboards together in one modern, multi-tenant platform.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary pulse-cta" href="/login">
              Get Started Now →
            </Link>
            <Link className="chip" href="/request-system" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}>
              Request This System
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
