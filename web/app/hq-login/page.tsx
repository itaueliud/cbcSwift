// web/app/hq-login/page.tsx
"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { saveSession } from "@/lib/session";

export default function HqLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const payload = await apiFetch<any>("/auth/hq/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveSession({
        token: payload.token, type: "hq",
        platformUserId: payload.user.platformUserId,
        hqRole: payload.user.hqRole,
        fullName: payload.user.fullName,
        email: payload.user.email,
      } as any);
      router.push("/hq");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid HQ credentials.");
    } finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1.5px solid #e2e8f0", fontSize: 14,
    outline: "none", background: "white", color: "#0f172a",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 6,
  };

  return (
    <div className="login-page-grid" style={{
      display: "grid",
      gridTemplateColumns: "360px 1fr",
      minHeight: "100vh",
    }}>

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <aside className="login-left-panel" style={{
        background: "#0d1b3e",
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Subtle dot-grid background texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 64, position: "relative" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "grid", placeItems: "center", fontSize: 20, fontWeight: 900,
            boxShadow: "0 4px 16px rgba(245,158,11,0.4)",
          }}>
            👑
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "white", lineHeight: 1.2 }}>
              CBC Swift
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
              Headquarters Platform
            </div>
          </div>
        </div>

        {/* Headline + copy */}
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
            fontSize: 12, fontWeight: 700, color: "#fbbf24",
            marginBottom: 16,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
            HQ Admin Portal
          </div>

          <h1 style={{
            fontSize: 32, fontWeight: 900, color: "white",
            lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-0.02em",
          }}>
            HQ Platform<br />Access
          </h1>

          <p style={{
            color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.7,
            margin: "0 0 32px",
          }}>
            TechSwiftTrix headquarters — manage all schools, tenants,
            billing and platform features from one control centre.
          </p>

          {/* Feature checklist */}
          <div style={{ display: "grid", gap: 12 }}>
            {[
              "Manage all school tenants from one dashboard",
              "Feature flag control & platform configuration",
              "Platform analytics & usage monitoring",
              "Billing & subscription management",
              "Audit trail across all schools",
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)",
                  display: "grid", placeItems: "center", marginTop: 1,
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom status */}
        <div style={{
          position: "relative", marginTop: 40,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span className="login-status-blink" style={{
            width: 8, height: 8, borderRadius: "50%", background: "#4ade80",
            boxShadow: "0 0 6px #4ade80", flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            System operational
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 4px" }}>·</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
            © 2025 TechSwiftTrix
          </span>
        </div>
      </aside>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <main className="login-right-panel" style={{
        background: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
      }}>

        {/* Back to School Login — top right */}
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <Link href="/login">
            <button type="button" style={{
              padding: "9px 18px", borderRadius: 10,
              background: "white", color: "#0d1b3e",
              border: "1.5px solid #e2e8f0", fontWeight: 700, fontSize: 13,
              cursor: "pointer", letterSpacing: "-0.01em",
              display: "flex", alignItems: "center", gap: 7,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "background 0.2s",
            }}>
              🏫 School Login
            </button>
          </Link>
        </div>

        {/* Login card */}
        <div style={{
          width: "100%", maxWidth: 420,
          background: "white", borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {/* Purple top accent bar for HQ */}
          <div style={{ height: 4, background: "linear-gradient(90deg, #7c3aed, #a855f7)" }} />

          <div style={{ padding: "32px 32px 28px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
              HQ Sign in
            </h2>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 28px" }}>
              Enter your headquarters credentials to access the platform
            </p>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
              {/* Email */}
              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@techswifttrix.com"
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                  <Link href="/forgot-password" style={{ fontSize: 12, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer", color: "#94a3b8",
                      fontSize: 16, padding: 0, lineHeight: 1,
                    }}
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "#fef2f2", border: "1px solid #fecaca",
                  color: "#dc2626", fontSize: 13, fontWeight: 500,
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "13px", borderRadius: 10,
                  background: loading ? "#c4b5fd" : "#7c3aed",
                  color: "white", border: "none", fontWeight: 700,
                  fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 0.2s, transform 0.15s",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#6d28d9"; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#7c3aed"; }}
              >
                {loading ? "Signing in…" : <>Sign in to HQ <span style={{ fontSize: 16 }}>→</span></>}
              </button>
            </form>

            {/* About link */}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <Link href="/about">
                <button type="button" style={{
                  padding: "10px 24px", borderRadius: 10,
                  background: "transparent", color: "#7c3aed",
                  border: "1.5px solid #ddd6fe", fontWeight: 600,
                  fontSize: 13, cursor: "pointer", width: "100%",
                  transition: "background 0.2s, border-color 0.2s",
                }}>
                  📖 About CBC Swift
                </button>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "12px 32px", background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            textAlign: "center",
          }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              Secured with JWT + 2FA · CBC Swift HQ v2.0
            </span>
          </div>
        </div>

        {/* Tagline below card */}
        <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
          This portal is for TechSwiftTrix staff only.{" "}
          <span style={{ color: "#64748b" }}>
            School users should use the <Link href="/login" style={{ color: "#2563eb", fontWeight: 600 }}>School Login</Link>.
          </span>
        </p>
      </main>
    </div>
  );
}
