import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="landing-shell">
      <div className="container" style={{ padding: "56px 0" }}>
        <section className="auth-hero">
          <div className="auth-top">
            <div className="auth-copy">
              <span className="auth-kicker">CBC Swift</span>
              <h1>Page not found.</h1>
              <p className="subtitle">
                The page you tried to open is not available. Return to the landing page or continue to login.
              </p>
              <div className="landing-actions">
                <Link className="auth-submit landing-primary" href="/">Go home</Link>
                <Link className="chip" href="/login">Login</Link>
              </div>
            </div>

            <aside className="auth-panel">
              <span className="pill">Quick links</span>
              <div className="auth-list">
                <div className="auth-list-item">
                  <div>
                    <strong>Landing page</strong>
                    <span>Overview of CBC Swift.</span>
                  </div>
                </div>
                <div className="auth-list-item">
                  <div>
                    <strong>Login</strong>
                    <span>School and HQ access.</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
