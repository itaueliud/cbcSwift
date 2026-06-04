"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type InviteState = "loading" | "valid" | "used" | "expired" | "invalid" | "success";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "School Administrator", PRINCIPAL: "Principal", TEACHER: "Teacher",
  FINANCE: "Finance Officer", PARENT: "Parent", STUDENT: "Student",
};

export default function InvitePage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const [state, setState] = useState<InviteState>("loading");
  const [invitation, setInvitation] = useState<{ email: string; fullName: string; role: string; schoolName?: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    apiFetch<{ valid: boolean; reason?: string; invitation?: typeof invitation }>(`/invite/${token}`)
      .then((data) => {
        if (data.valid && data.invitation) {
          setInvitation(data.invitation);
          setState("valid");
        } else {
          setState((data.reason?.toLowerCase() ?? "invalid") as InviteState);
        }
      })
      .catch(() => setState("invalid"));
  }, [token]);

  function checkStrength(pw: string) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    setStrength(s);
  }

  async function handleActivate(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (strength < 3) { setError("Password is too weak. Use uppercase, numbers, and symbols."); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch(`/invite/${token}/accept`, { method: "POST", body: JSON.stringify({ password }) });
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation failed. Please try again.");
    } finally { setLoading(false); }
  }

  const strengthColors = ["#dc2626", "#f59e0b", "#3b82f6", "#059669"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  return (
    <div className="login-shell">
      <div className="login-orbit login-orbit-a" />
      <div className="login-orbit login-orbit-b" />
      <div className="container" style={{ maxWidth: 500, paddingTop: 70 }}>
        <div className="login-card auth-stack">

          {state === "loading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <div style={{ color: "rgba(255,255,255,0.7)" }}>Verifying your invitation...</div>
            </div>
          )}

          {state === "used" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ color: "white", margin: "0 0 8px" }}>Already Activated</h2>
              <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 14 }}>This invitation has already been used to create an account.</p>
              <Link href="/login" className="auth-submit login-submit" style={{ display: "block", marginTop: 20, textDecoration: "none", textAlign: "center" }}>
                Go to Login →
              </Link>
            </div>
          )}

          {(state === "expired" || state === "invalid") && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{state === "expired" ? "⏰" : "❌"}</div>
              <h2 style={{ color: "white", margin: "0 0 8px" }}>
                {state === "expired" ? "Invitation Expired" : "Invalid Invitation"}
              </h2>
              <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 14 }}>
                {state === "expired"
                  ? "This invitation link has expired (48h). Contact your School Administrator to resend it."
                  : "This invitation link is not valid. Please contact your School Administrator."}
              </p>
            </div>
          )}

          {state === "success" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h2 style={{ color: "#4ade80", margin: "0 0 8px" }}>Account Activated!</h2>
              <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 14 }}>
                Welcome to CBC Swift! Your account is ready. You can now log in.
              </p>
              <Link href="/login" className="auth-submit login-submit" style={{ display: "block", marginTop: 20, textDecoration: "none", textAlign: "center" }}>
                Log In Now →
              </Link>
            </div>
          )}

          {state === "valid" && invitation && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎓</div>
                <h2 style={{ margin: "0 0 4px", color: "white", fontSize: 21 }}>Welcome, {invitation.fullName}!</h2>
                <p style={{ color: "rgba(229,238,251,0.6)", fontSize: 13, margin: 0 }}>
                  You've been invited to join <strong style={{ color: "rgba(229,238,251,0.9)" }}>{invitation.schoolName ?? "CBC Swift"}</strong>
                </p>
              </div>

              <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 12, padding: "14px 16px", display: "grid", gap: 8 }}>
                {[
                  { label: "Email", value: invitation.email },
                  { label: "Role", value: ROLE_LABELS[invitation.role] ?? invitation.role },
                  { label: "School", value: invitation.schoolName ?? "CBC Swift" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleActivate} style={{ display: "grid", gap: 14 }}>
                <div className="field">
                  <label style={{ color: "rgba(219,234,254,0.75)" }}>Create Password</label>
                  <div className="password-input-wrap">
                    <input type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => { setPassword(e.target.value); checkStrength(e.target.value); setError(null); }}
                      placeholder="Min 8 chars, uppercase, number, symbol" required />
                    <button type="button" className="password-toggle" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                      <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(strength / 4) * 100}%`, background: strengthColors[strength - 1] ?? "#dc2626", transition: "width 0.3s, background 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 11, color: strengthColors[strength - 1] ?? "#dc2626", fontWeight: 700 }}>
                        {strength > 0 ? strengthLabels[strength - 1] : "Enter a password"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label style={{ color: "rgba(219,234,254,0.75)" }}>Confirm Password</label>
                  <input type={showPw ? "text" : "password"} value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                    placeholder="Re-enter your password" required />
                  {confirm && password !== confirm && (
                    <span style={{ fontSize: 12, color: "#f87171", marginTop: 4, display: "block" }}>Passwords do not match</span>
                  )}
                </div>

                {error && <div className="auth-note">⚠️ {error}</div>}

                <button type="submit" className="auth-submit login-submit" disabled={loading || password !== confirm || strength < 2}>
                  {loading ? "Activating..." : "✅ Activate Account →"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
