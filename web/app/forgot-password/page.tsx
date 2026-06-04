"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [subdomain, setSubdomain] = useState("greenvalley");
  const [mode,      setMode]      = useState<"school" | "hq">("school");
  const [sent,      setSent]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email, subdomain: mode === "school" ? subdomain : undefined }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-shell">
      <div className="login-orbit login-orbit-a" />
      <div className="login-orbit login-orbit-b" />
      <div className="container" style={{ maxWidth: 480, paddingTop: 80 }}>
        <div className="login-card auth-stack">
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Reset Password</h2>
            <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 14, margin: "8px 0 0" }}>
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <div style={{ padding: "20px", borderRadius: 14, background: "rgba(5,150,105,0.15)", border: "1px solid rgba(5,150,105,0.3)", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📧</div>
              <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>Check your inbox</div>
              <div style={{ color: "rgba(229,238,251,0.65)", fontSize: 13 }}>
                If an account exists for <strong>{email}</strong>, a password reset link has been sent.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <div className="auth-toggle">
                <button type="button" className="tab-button" data-active={mode === "school"} onClick={() => setMode("school")}>🏫 School</button>
                <button type="button" className="tab-button" data-active={mode === "hq"} onClick={() => setMode("hq")}>👑 HQ</button>
              </div>

              {mode === "school" && (
                <div className="field">
                  <label>School Subdomain</label>
                  <input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} placeholder="greenvalley" required />
                </div>
              )}

              <div className="field">
                <label>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.ac.ke" required />
              </div>

              {error && <div className="auth-note">⚠️ {error}</div>}

              <button type="submit" className="auth-submit login-submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link →"}
              </button>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Link href="/login" style={{ fontSize: 13, color: "rgba(229,238,251,0.6)", textDecoration: "none" }}>
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
