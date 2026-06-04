"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { Suspense } from "react";

function VerifyContent() {
  const router  = useRouter();
  const params  = useSearchParams();
  const tempToken = params.get("token") ?? "";

  const [code,         setCode]         = useState("");
  const [trustDevice,  setTrustDevice]  = useState(false);
  const [useRecovery,  setUseRecovery]  = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tempToken) { router.replace("/login"); return; }
    setLoading(true); setError(null);

    try {
      const body = { temporaryToken: tempToken, code: useRecovery ? recoveryCode : code, trustDevice };
      const data = await apiFetch<{
        token: string;
        user: { userId: string; role: string; fullName: string; email: string };
        tenant: { tenantId: string; schoolName: string; subdomain: string };
        trustedDeviceToken?: string;
      }>("/auth/2fa/login", { method: "POST", body: JSON.stringify(body) });

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

      if (data.trustedDeviceToken) {
        localStorage.setItem("cbc_trusted_device", data.trustedDeviceToken);
      }

      const roleMap: Record<string, string> = {
        ADMIN: "/admin", PRINCIPAL: "/principal", FINANCE: "/finance",
        TEACHER: "/teacher", STUDENT: "/student", PARENT: "/parent",
      };
      router.replace(roleMap[data.user.role] ?? "/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div className="login-shell">
      <div className="login-orbit login-orbit-a" />
      <div className="login-orbit login-orbit-b" />
      <div className="container" style={{ maxWidth: 440, paddingTop: 80 }}>
        <div className="login-card auth-stack">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
            <h2 style={{ margin: "0 0 6px", color: "white", fontSize: 22 }}>Two-Factor Verification</h2>
            <p style={{ color: "rgba(229,238,251,0.6)", fontSize: 13, margin: 0 }}>
              {useRecovery ? "Enter one of your recovery codes." : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
            {!useRecovery ? (
              <div className="field">
                <label style={{ color: "rgba(219,234,254,0.75)" }}>Authentication Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(null); }}
                  placeholder="000000"
                  style={{ textAlign: "center", fontSize: 32, letterSpacing: "0.4em", fontWeight: 900, fontFamily: "monospace" }}
                  autoFocus
                  required
                />
              </div>
            ) : (
              <div className="field">
                <label style={{ color: "rgba(219,234,254,0.75)" }}>Recovery Code</label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => { setRecoveryCode(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="XXXXXX-XXXXXX"
                  style={{ textAlign: "center", fontSize: 18, fontFamily: "monospace", letterSpacing: 2 }}
                  required
                />
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#3b82f6" }} />
              <span style={{ fontSize: 13, color: "rgba(229,238,251,0.7)" }}>Trust this device for 30 days</span>
            </label>

            {error && <div className="auth-note">⚠️ {error}</div>}

            <button type="submit" className="auth-submit login-submit" disabled={loading || (!useRecovery && code.length !== 6)}>
              {loading ? "Verifying..." : "Verify →"}
            </button>

            <button type="button" onClick={() => { setUseRecovery((v) => !v); setCode(""); setRecoveryCode(""); setError(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(229,238,251,0.5)", fontSize: 13, textDecoration: "underline", padding: 0 }}>
              {useRecovery ? "Use authenticator app instead" : "Use a recovery code instead"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
