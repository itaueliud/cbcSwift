import Link from "next/link";
import RequestSystemForm from "@/components/request-system-form";

export default function RequestSystemPage() {
  return (
    <div className="landing-shell">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-orb landing-orb-c" />

      <header className="landing-nav container">
        <div className="brand-mark">
          <span className="brand-dot" />
          <div>
            <div className="brand-name">TechSwiftTrix</div>
            <div className="brand-tag">Request the CBC Swift system</div>
          </div>
        </div>
        <nav className="landing-links">
          <Link className="landing-link" href="/">Home</Link>
          <Link className="landing-link" href="/login">Login</Link>
        </nav>
      </header>

      <main className="container request-shell">
        <section className="section-head request-head">
          <div>
            <span className="section-kicker">Request this system</span>
            <h1>TechSwiftTrix is ready to onboard your school.</h1>
          </div>
          <p className="section-copy">
            Contact details are shown below. Use the form to send a request by email or WhatsApp instantly.
          </p>
        </section>

        <div className="request-grid">
          <aside className="request-summary glass-card">
            <span className="pill">Contact TechSwiftTrix</span>
            <div className="contact-stack">
              <div>
                <strong>Email</strong>
                <a href="mailto:techswifttrix@gmail.com">techswifttrix@gmail.com</a>
              </div>
              <div>
                <strong>Phone</strong>
                <a href="tel:+254703670841">+254 703 670 841</a>
              </div>
              <div>
                <strong>WhatsApp</strong>
                <a href="https://wa.me/254703670841" target="_blank" rel="noreferrer">
                  +254 703 670 841
                </a>
              </div>
            </div>
            <div className="request-note">
              Choose Email or WhatsApp to contact us directly, or submit the form to build your request message.
            </div>
          </aside>

          <section className="glass-card request-form-panel">
            <RequestSystemForm />
          </section>
        </div>

        <div className="final-cta request-footer glass-card">
          <div>
            <h2>Need a guided walkthrough?</h2>
            <p>Our team can help you get the system live quickly and support your CBC rollout.</p>
          </div>
          <div className="request-footer-actions">
            <Link className="auth-submit landing-primary" href="mailto:techswifttrix@gmail.com">
              Email Us
            </Link>
            <Link className="chip" href="https://wa.me/254703670841" target="_blank" rel="noreferrer">
              Chat on WhatsApp
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
