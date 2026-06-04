import Link from "next/link";

const checklist = [
  {
    title: "Change password",
    text: "Set a secure personal password before continuing.",
  },
  {
    title: "Confirm phone",
    text: "Verify SMS recovery details for faster account access.",
  },
  {
    title: "Complete profile",
    text: "Add avatar, role, and any missing school information.",
  },
];

export default function FirstLoginPage() {
  return (
    <div className="auth-shell auth-mode">
      <div className="container">
        <section className="auth-hero setup-hero">
          <div className="auth-top setup-top">
            <div className="auth-copy">
              <span className="auth-kicker">First login</span>
              <h1>Finish setup before entering the dashboard.</h1>
              <p className="subtitle">
                New staff, students, and parents land here to complete a guided setup experience that feels secure, calm, and branded.
              </p>
              <div className="auth-points">
                <span className="auth-point">Step-by-step setup</span>
                <span className="auth-point">Secure recovery</span>
                <span className="auth-point">TechSwiftTrix branded</span>
              </div>
            </div>

            <aside className="auth-panel setup-panel">
              <span className="pill">Setup checklist</span>
              <div className="setup-steps">
                {checklist.map((item, index) => (
                  <div key={item.title} className={`setup-step animate-rise delay-${index + 1}`}>
                    <div className="setup-step-index">{index + 1}</div>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <div className="auth-grid setup-grid" style={{ marginTop: 18 }}>
          <section className="auth-card auth-stack setup-card">
            <div className="setup-card-top">
              <span className="section-kicker">Setup flow</span>
              <Link className="chip" href="/login">Back to login</Link>
            </div>
            <h3 style={{ margin: 0 }}>Everything is grouped into three clear steps.</h3>
            <p className="subtitle" style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
              This screen now mirrors the modern landing page with clear structure, trust cues, and motion.
            </p>
            <div className="setup-progress">
              <span style={{ width: "34%" }} />
            </div>
            <div className="setup-grid-cards">
              <div className="setup-metric glass-card">
                <strong>01</strong>
                <span>Password</span>
              </div>
              <div className="setup-metric glass-card">
                <strong>02</strong>
                <span>Recovery</span>
              </div>
              <div className="setup-metric glass-card">
                <strong>03</strong>
                <span>Profile</span>
              </div>
            </div>
          </section>

          <aside className="auth-card auth-stack setup-side">
            <h3 style={{ margin: 0 }}>What happens next</h3>
            <div className="auth-note">
              Once setup is complete, the user is redirected to their role dashboard with a clean TechSwiftTrix handoff.
            </div>
            <div className="setup-note">
              This flow is meant to feel secure, fast, and easy to understand for every user type.
            </div>
            <div className="setup-links">
              <Link className="auth-submit landing-primary" href="/login">Continue setup</Link>
              <Link className="chip" href="/">View landing page</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
