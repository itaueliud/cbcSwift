"use client";

import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: Props) {
  return (
    <div className="landing-shell">
      <div className="container" style={{ padding: "56px 0" }}>
        <section className="auth-hero">
          <div className="auth-top">
            <div className="auth-copy">
              <span className="auth-kicker">CBC Swift</span>
              <h1>Something went wrong.</h1>
              <p className="subtitle">
                We hit a runtime issue. Try again, or go back to the landing page and reopen the route.
              </p>
              <div className="landing-actions">
                <button className="auth-submit landing-primary" onClick={reset} type="button">
                  Try again
                </button>
                <Link className="chip" href="/">
                  Go home
                </Link>
              </div>
            </div>

            <aside className="auth-panel">
              <span className="pill">Recovery</span>
              <div className="auth-list">
                <div className="auth-list-item">
                  <div>
                    <strong>Refresh the route</strong>
                    <span>Reset the current React tree.</span>
                  </div>
                </div>
                <div className="auth-list-item">
                  <div>
                    <strong>Restart dev server</strong>
                    <span>If the cache is stale, restart `npm run dev`.</span>
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
