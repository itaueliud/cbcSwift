"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type TwoFAStatus = { isEnabled: boolean; setupCompleted: boolean; remainingRecoveryCodes: number };

const ROLES_REQUIRING_2FA = ["ADMIN", "PRINCIPAL", "FINANCE"];

export default function SecuritySettingsPage() {
  const session = useProtectedSession();
  const router  = useRouter();
  const [status,    setStatus]    = useState<TwoFAStatus | null>(null);
  const [showDisable, setShowDisable] = useState(false);
  const [disableForm, setDisableForm] = useState({ password: "", code: "" });
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [msg2FA,  setMsg2FA]  = useState<string | null>(null);
  const [msgPw,   setMsgPw]   = useState<string | null>(null);
  const [saving2FA, setSaving2FA] = useState(false);
  const [savingPw,  setSavingPw]  = useState(false);

  const needs2FA = ROLES_REQUIRING_2FA.includes(session?.role ?? "");

  async function load() {
    if (!session) return;
    try {
      const s = await apiFetch<TwoFAStatus>("/auth/2fa/status", {}, session.token);
      setStatus(s);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (session) void load(); }, [session]);

  async function disable2FA(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSaving2FA(true); setMsg2FA(null);
    try {
      await apiFetch("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify(disableForm),
      }, session.token);
      setMsg2FA("✅ 2FA disabled.");
      setShowDisable(false);
      await load();
    } catch (e) {
      setMsg2FA(`❌ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setSaving2FA(false); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    if (pwForm.newPassword !== pwForm.confirm) { setMsgPw("❌ Passwords do not match."); return; }
    setSavingPw(true); setMsgPw(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
      }, session.token);
      setMsgPw("✅ Password changed successfully.");
      setPwForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      setMsgPw(`❌ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setSavingPw(false); }
  }

  if (!session) return null;

  return (
    <DashboardShell title="Security Settings" subtitle="Manage your account security" badge="Security" role={(session.role ?? "").toLowerCase()}>
      <div className="section" style={{ marginTop: 0 }}>
        <div style={{ display: "grid", gap: 20 }}>

          {/* 2FA Panel */}
          {needs2FA && (
            <div className="panel-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px" }}>🔐 Two-Factor Authentication (2FA)</h3>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                    Required for {session.role?.replace("_", " ")} accounts. Adds an extra layer of security.
                  </p>
                </div>
                <span style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800,
                  background: status?.isEnabled ? "rgba(5,150,105,0.12)" : "rgba(220,38,38,0.08)",
                  color: status?.isEnabled ? "#059669" : "#dc2626",
                }}>
                  {status?.isEnabled ? "✅ Enabled" : "⚠️ Not Set Up"}
                </span>
              </div>

              {status && !status.isEnabled && (
                <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 13, color: "#b45309" }}>
                  ⚠️ Your role requires 2FA. Please set it up to maintain full access.
                </div>
              )}

              {status?.isEnabled && (
                <div style={{ marginBottom: 16, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Status</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>Active</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Recovery Codes Remaining</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: (status.remainingRecoveryCodes ?? 0) < 3 ? "#dc2626" : "#059669" }}>
                      {status.remainingRecoveryCodes}
                    </span>
                  </div>
                </div>
              )}

              {msg2FA && (
                <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: msg2FA.startsWith("✅") ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.07)", fontSize: 13, fontWeight: 600, color: msg2FA.startsWith("✅") ? "#059669" : "#dc2626" }}>
                  {msg2FA}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {!status?.isEnabled && (
                  <button type="button" className="btn-primary" onClick={() => router.push("/setup-2fa")}>
                    🔐 Set Up 2FA
                  </button>
                )}
                {status?.isEnabled && (
                  <>
                    <button type="button" className="btn-ghost" onClick={() => setShowDisable((v) => !v)}>
                      {showDisable ? "Cancel" : "Disable 2FA"}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => router.push("/setup-2fa")}>
                      🔄 Regenerate Codes
                    </button>
                  </>
                )}
              </div>

              {showDisable && (
                <form onSubmit={disable2FA} style={{ marginTop: 16, display: "grid", gap: 12, padding: "16px", background: "rgba(220,38,38,0.04)", borderRadius: 12, border: "1px solid rgba(220,38,38,0.12)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#dc2626" }}>⚠️ Disable 2FA – Confirm identity</div>
                  <div className="field">
                    <label>Current Password</label>
                    <input type="password" value={disableForm.password} onChange={(e) => setDisableForm((f) => ({ ...f, password: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label>2FA Code</label>
                    <input type="text" maxLength={6} value={disableForm.code} onChange={(e) => setDisableForm((f) => ({ ...f, code: e.target.value.replace(/\D/g,"") }))} placeholder="000000" required />
                  </div>
                  <button type="submit" disabled={saving2FA} style={{ padding: "10px 16px", borderRadius: 10, background: "#dc2626", color: "white", border: "none", fontWeight: 700, cursor: saving2FA ? "not-allowed" : "pointer" }}>
                    {saving2FA ? "Disabling..." : "Disable 2FA"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Change Password */}
          <div className="panel-card">
            <h3 style={{ marginBottom: 4 }}>🔑 Change Password</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)" }}>Update your account password.</p>
            {msgPw && (
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: msgPw.startsWith("✅") ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.07)", fontSize: 13, fontWeight: 600, color: msgPw.startsWith("✅") ? "#059669" : "#dc2626" }}>
                {msgPw}
              </div>
            )}
            <form onSubmit={changePassword} style={{ display: "grid", gap: 14, maxWidth: 400 }}>
              <div className="field">
                <label>Current Password</label>
                <input type="password" value={pwForm.oldPassword} onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))} required />
              </div>
              <div className="field">
                <label>New Password</label>
                <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} placeholder="Min 8 characters" required />
              </div>
              <div className="field">
                <label>Confirm New Password</label>
                <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} required />
              </div>
              <button type="submit" className="btn-primary" disabled={savingPw} style={{ width: "fit-content", padding: "10px 20px" }}>
                {savingPw ? "Saving..." : "🔑 Change Password"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </DashboardShell>
  );
}
