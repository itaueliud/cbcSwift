"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { loadSession, saveSession } from "@/lib/session";

type Step = "qr" | "verify" | "recovery";

export default function Setup2FAPage() {
  const router = useRouter();
  const [step,       setStep]       = useState<Step>("qr");
  const [qrCode,     setQrCode]     = useState("");
  const [secret,     setSecret]     = useState("");
  const [code,       setCode]       = useState("");
  const [error,      setError]      = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [tempToken,  setTempToken]  = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedAll,  setCopiedAll]  = useState(false);

  useEffect(() => {
    const session = loadSession();
    // Either a normal session that needs 2FA setup, or a PENDING_2FA_SETUP temp token
    const token = (session as { token?: string })?.token
      ?? new URLSearchParams(window.location.search).get("token");
    if (!token) { router.replace("/login"); return; }
    setTempToken(token);
    loadQR(token);
  }, []);

  async function loadQR(token: string) {
    try {
      const data = await apiFetch<{ qrCode: string; secret: string }>("/auth/2fa/setup", { method: "POST" }, token);
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (e) {
      setError("Failed to load QR code. Please try again.");
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!tempToken || code.length !== 6) { setError("Enter the 6-digit code from your authenticator app."); return; }
    setLoading(true); setError(null);
    try {
      const data = await apiFetch<{
        recoveryCodes: string[];
        token: string;
        user: { userId: string; role: string; fullName: string; email: string };
        tenant: { tenantId: string; schoolName: string; subdomain: string };
      }>(
        "/auth/2fa/verify-setup", { method: "POST", body: JSON.stringify({ code }) }, tempToken
      );
      setRecoveryCodes(data.recoveryCodes);
      // Save the full token and restore the real role/tenant context now.
      saveSession({
        token: data.token,
        type: "school",
        userId: data.user.userId,
        role: data.user.role,
        tenantId: data.tenant.tenantId,
        subdomain: data.tenant.subdomain,
        schoolName: data.tenant.schoolName,
        fullName: data.user.fullName,
        email: data.user.email,
      } as never);
      setStep("recovery");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code. Please try again.");
    } finally { setLoading(false); }
  }

  function copyAll() {
    navigator.clipboard.writeText(recoveryCodes.join("\n")).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 3000);
    });
  }

  function finish() {
    const session = loadSession();
    if (!session) { router.replace("/login"); return; }
    const role = (session as { role?: string }).role;
    const roleMap: Record<string, string> = {
      ADMIN: "/admin", PRINCIPAL: "/principal", FINANCE: "/finance", TEACHER: "/teacher",
    };
    router.replace(roleMap[role ?? ""] ?? "/admin");
  }

  return (
    <div className="login-shell">
      <div className="login-orbit login-orbit-a" />
      <div className="login-orbit login-orbit-b" />
      <div className="container" style={{ maxWidth: 520, paddingTop: 60 }}>
        <div className="login-card auth-stack" style={{ gap: 20 }}>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            {(["qr", "verify", "recovery"] as Step[]).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 13,
                  background: step === s ? "#3b82f6" : (["qr","verify","recovery"].indexOf(step) > i ? "#059669" : "rgba(255,255,255,0.1)"),
                  color: "white", transition: "background 0.3s",
                }}>
                  {["qr","verify","recovery"].indexOf(step) > i ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 12, color: step === s ? "white" : "rgba(255,255,255,0.45)", fontWeight: step === s ? 700 : 400 }}>
                  {s === "qr" ? "Scan" : s === "verify" ? "Verify" : "Save Codes"}
                </span>
                {i < 2 && <div style={{ width: 30, height: 1, background: "rgba(255,255,255,0.15)" }} />}
              </div>
            ))}
          </div>

          {/* Step 1: QR Code */}
          {step === "qr" && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
                <h2 style={{ margin: "0 0 6px", color: "white", fontSize: 20 }}>Set Up Two-Factor Authentication</h2>
                <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 13, margin: 0 }}>
                  Scan this QR code with Google Authenticator, Authy, or any TOTP app.
                </p>
              </div>

              {qrCode ? (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ background: "white", padding: 16, borderRadius: 16, display: "inline-block" }}>
                    <img src={qrCode} alt="2FA QR Code" width={200} height={200} style={{ display: "block" }} />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.5)" }}>Loading QR code...</div>
              )}

              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Can't scan? Enter this key manually:</div>
                <div style={{ fontFamily: "monospace", fontSize: 14, color: "#93c5fd", letterSpacing: 2, wordBreak: "break-all" }}>{secret}</div>
              </div>

              <button type="button" className="auth-submit login-submit" onClick={() => setStep("verify")} disabled={!qrCode}>
                I've scanned the code →
              </button>
            </>
          )}

          {/* Step 2: Verify */}
          {step === "verify" && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                <h2 style={{ margin: "0 0 6px", color: "white", fontSize: 20 }}>Enter Verification Code</h2>
                <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 13, margin: 0 }}>
                  Open your authenticator app and enter the 6-digit code.
                </p>
              </div>

              <form onSubmit={verify} style={{ display: "grid", gap: 14 }}>
                <div className="field">
                  <label style={{ color: "rgba(219,234,254,0.75)" }}>6-Digit Authentication Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(null); }}
                    placeholder="000000"
                    style={{ textAlign: "center", letterSpacing: "0.35em", fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}
                    autoFocus
                    required
                  />
                </div>
                {error && <div className="auth-note">⚠️ {error}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn-ghost" onClick={() => setStep("qr")} style={{ flex: "0 0 auto", padding: "12px 16px" }}>← Back</button>
                  <button type="submit" className="auth-submit login-submit" disabled={loading || code.length !== 6} style={{ flex: 1 }}>
                    {loading ? "Verifying..." : "Verify & Enable 2FA →"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step 3: Recovery codes */}
          {step === "recovery" && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
                <h2 style={{ margin: "0 0 6px", color: "white", fontSize: 20 }}>Save Your Recovery Codes</h2>
                <p style={{ color: "rgba(229,238,251,0.65)", fontSize: 13, margin: 0 }}>
                  Store these codes safely. Each can be used once if you lose access to your authenticator.
                </p>
              </div>

              <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {recoveryCodes.map((code, i) => (
                  <div key={i} style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "#93c5fd", padding: "8px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 8, textAlign: "center", letterSpacing: 1 }}>
                    {code}
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#fbbf24" }}>
                ⚠️ These codes will not be shown again. Save them in a secure location.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn-ghost" onClick={copyAll} style={{ flex: "0 0 auto", padding: "12px 16px" }}>
                  {copiedAll ? "✓ Copied!" : "📋 Copy All"}
                </button>
                <button type="button" className="auth-submit login-submit" onClick={finish} style={{ flex: 1 }}>
                  I've saved my codes — Continue →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
