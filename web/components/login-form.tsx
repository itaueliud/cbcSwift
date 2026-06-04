"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readSession, saveSession } from "@/lib/session";

type LoginState = "hq" | "school";
type SchoolRole = "ADMIN" | "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT" | "FINANCE";
type HqRole = "SUPER_ADMIN" | "SUPPORT" | "SALES" | "BILLING";

const SCHOOL_ROLES: Array<{ label: string; value: SchoolRole; icon: string; color: string }> = [
  { label: "Admin", value: "ADMIN", icon: "⚙️", color: "#1d4ed8" },
  { label: "Principal", value: "PRINCIPAL", icon: "🎓", color: "#059669" },
  { label: "Teacher", value: "TEACHER", icon: "🧑‍🏫", color: "#0e4f7a" },
  { label: "Student", value: "STUDENT", icon: "🎒", color: "#1e1b4b" },
  { label: "Parent", value: "PARENT", icon: "👪", color: "#4a044e" },
  { label: "Finance", value: "FINANCE", icon: "💰", color: "#431407" },
];

const HQ_ROLES: Array<{ label: string; value: HqRole; icon: string }> = [
  { label: "Super Admin", value: "SUPER_ADMIN", icon: "👑" },
  { label: "Support", value: "SUPPORT", icon: "🛎️" },
  { label: "Sales", value: "SALES", icon: "📈" },
  { label: "Billing", value: "BILLING", icon: "🧾" },
];

function normalizePageRole(role?: string) {
  if (!role) return "school";
  const n = role.toLowerCase();
  if (n === "admin") return "school";
  if (n === "principal") return "principal";
  if (n === "teacher") return "teacher";
  if (n === "student") return "student";
  if (n === "parent") return "parent";
  if (n === "finance") return "finance";
  return "school";
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginState>("school");
  const [subdomain, setSubdomain] = useState("greenvalley");
  const [email, setEmail] = useState("admin@greenvalley.ac.ke");
  const [password, setPassword] = useState("School@2025!");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) return;
    router.replace(`/${session.type === "hq" ? "hq" : normalizePageRole(session.role)}`);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = window.localStorage.getItem("cbc-login-mode");
    const savedSubdomain = window.localStorage.getItem("cbc-login-subdomain");
    const savedEmail = window.localStorage.getItem("cbc-login-email");
    if (savedMode === "hq" || savedMode === "school") setMode(savedMode);
    if (savedSubdomain) setSubdomain(savedSubdomain);
    if (savedEmail) setEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || mode !== "school") return;
    const parts = email.split("@");
    if (parts.length < 2) return;
    const candidate = parts[1].split(".")[0];
    if (candidate && candidate !== "techswifttrix") setSubdomain(candidate);
  }, [email, mode]);

  useEffect(() => {
    setSelectedRole(mode === "hq" ? "SUPER_ADMIN" : "ADMIN");
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cbc-login-mode", mode);
        window.localStorage.setItem("cbc-login-email", email);
        if (mode === "school") window.localStorage.setItem("cbc-login-subdomain", subdomain);
      }

      if (mode === "hq") {
        const payload = await apiFetch<{
          token: string;
          user: { fullName: string; email: string; hqRole: string; platformUserId?: string };
        }>("/auth/hq/login", {
          method: "POST",
          body: JSON.stringify({ email, password, role: selectedRole }),
        });
        saveSession({
          token: payload.token,
          type: "hq",
          platformUserId: payload.user.platformUserId,
          hqRole: payload.user.hqRole,
          fullName: payload.user.fullName,
          email: payload.user.email,
        });
        router.push("/hq");
      } else {
        const payload = await apiFetch<{
          token?: string;
          temporaryToken?: string;
          requires2FA?: boolean;
          requires2FASetup?: boolean;
          user: { fullName: string; email: string; role: string; userId?: string; platformUserId?: string };
          tenant: { tenantId: string; subdomain: string; schoolName: string };
        }>("/auth/school/login", {
          method: "POST",
          body: JSON.stringify({
            subdomain, email, password,
            trustedDeviceToken: typeof window !== "undefined"
              ? localStorage.getItem("cbc_trusted_device") ?? undefined
              : undefined,
          }),
        });
        // ── 2FA flow ──────────────────────────────────────────────────────
        if (payload.requires2FASetup) {
          // User must set up 2FA before accessing dashboard
          saveSession({
            token: payload.temporaryToken || "",
            type: "school",
            role: "PENDING_2FA_SETUP",
            userId: payload.user.userId,
            tenantId: payload.tenant.tenantId,
            subdomain: payload.tenant.subdomain,
            schoolName: payload.tenant.schoolName,
            fullName: payload.user.fullName,
            email: payload.user.email,
          } as never);
          router.push("/setup-2fa");
          return;
        }
        if (payload.requires2FA) {
          // User has 2FA, redirect to verification page
          router.push(`/verify-2fa?token=${encodeURIComponent(payload.temporaryToken || "")}`);
          return;
        }
        saveSession({
          token: payload.token || "",
          type: "school",
          userId: payload.user.userId,
          role: payload.user.role,
          tenantId: payload.tenant.tenantId,
          subdomain: payload.tenant.subdomain,
          schoolName: payload.tenant.schoolName,
          fullName: payload.user.fullName,
          email: payload.user.email,
        });
        router.push(`/${normalizePageRole(payload.user.role)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  const roleOptions = mode === "hq" ? HQ_ROLES : SCHOOL_ROLES;

  return (
    <form onSubmit={handleSubmit} className="auth-stack login-card">
      <div className="login-card-top">
        <div>
          <span className="section-kicker">Secure Sign In</span>
          <h2 className="login-form-title">Access Dashboard</h2>
        </div>
        <span className={`login-hint ${mode === "hq" ? "login-hint-hq" : "login-hint-school"}`}>
          {mode === "hq" ? "HQ Platform" : "School Portal"}
        </span>
      </div>

      {/* Mode toggle */}
      <div className="auth-toggle">
        <button
          type="button"
          className="tab-button"
          data-active={mode === "school"}
          onClick={() => setMode("school")}
        >
          🏫 School Login
        </button>
        <button
          type="button"
          className="tab-button"
          data-active={mode === "hq"}
          onClick={() => setMode("hq")}
        >
          👑 HQ Login
        </button>
      </div>

      {/* Role quick-select */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(219,234,254,0.7)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Select your role
        </div>
        <div className="role-cards-grid">
          {roleOptions.map((roleOption) => (
            <button
              key={roleOption.value}
              type="button"
              className={`role-card-btn ${selectedRole === roleOption.value ? "active" : ""}`}
              onClick={() => {
                setSelectedRole(roleOption.value);
                if (mode === "school") {
                  const creds: Record<string, { email: string; password: string }> = {
                    ADMIN:     { email: "admin@greenvalley.ac.ke",     password: "School@2025!" },
                    PRINCIPAL: { email: "principal@greenvalley.ac.ke", password: "Principal@2025!" },
                    TEACHER:   { email: "teacher1@greenvalley.ac.ke",  password: "Teacher@2025!" },
                    STUDENT:   { email: "adm001@greenvalley.ac.ke",    password: "Student@2025!" },
                    PARENT:    { email: "parent1@greenvalley.ac.ke",   password: "Parent@2025!" },
                    FINANCE:   { email: "finance@greenvalley.ac.ke",   password: "Finance@2025!" },
                  };
                  if (creds[roleOption.value]) {
                    setEmail(creds[roleOption.value].email);
                    setPassword(creds[roleOption.value].password);
                    setSubdomain("greenvalley");
                  }
                } else {
                  const hqCreds: Record<string, { email: string; password: string }> = {
                    SUPER_ADMIN: { email: "admin@techswifttrix.com", password: "Admin@2025!" },
                    SUPPORT:     { email: "admin@techswifttrix.com", password: "Admin@2025!" },
                    SALES:       { email: "admin@techswifttrix.com", password: "Admin@2025!" },
                    BILLING:     { email: "admin@techswifttrix.com", password: "Admin@2025!" },
                  };
                  if (hqCreds[roleOption.value]) {
                    setEmail(hqCreds[roleOption.value].email);
                    setPassword(hqCreds[roleOption.value].password);
                  }
                }
              }}
            >
              <span className="role-card-icon">{roleOption.icon}</span>
              <span>{roleOption.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div className="field">
        <label htmlFor="email">{mode === "hq" ? "HQ Email" : "Email / Phone"}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder={mode === "hq" ? "admin@techswifttrix.com" : "admin@greenvalley.ac.ke"}
          required
        />
      </div>

      {/* Subdomain (school only) */}
      {mode === "school" && (
        <div className="field">
          <label htmlFor="subdomain">School Subdomain</label>
          <input
            id="subdomain"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            autoComplete="organization"
            placeholder="greenvalley"
          />
        </div>
      )}

      {/* Password */}
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-input-wrap">
          <input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((s) => !s)}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      {/* Detected role */}
      <div className={`login-detected ${mode === "hq" ? "login-detected-hq" : "login-detected-school"}`}>
        {mode === "hq" ? "👑" : "🏫"} Logging in as <strong>{selectedRole.replace("_", " ")}</strong>
        {mode === "school" && subdomain ? ` · ${subdomain}` : ""}
      </div>

      {/* Error */}
      {error && <div className="auth-note">⚠️ {error}</div>}

      {/* Submit */}
      <button className="auth-submit login-submit" type="submit" disabled={loading}>
        {loading ? "Authenticating..." : "Enter System →"}
      </button>

      {/* Loading state */}
      {loading ? (
        <div className="loading-state">
          <span className="loading-icon" />
          <div>
            <strong style={{ display: "block", color: "#f8fbff", fontSize: 13 }}>
              Verifying credentials...
            </strong>
            <span style={{ display: "block", fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
              Checking role, tenant, and permissions.
            </span>
          </div>
          <div className="loading-bar"><span /></div>
        </div>
      ) : (
        <div className="login-system-line">🔒 Encrypted · Role-based access · Multi-tenant</div>
      )}

      <details className="login-more">
        <summary>More options</summary>
        <div className="login-more-body">
          <div className="login-more-note">
            Need to reset your password or set up your account for the first time?
          </div>
          <div className="tab-row">
            <a className="chip" href="/forgot-password">Forgot password?</a>
            <a className="chip" href="/first-login">First login setup</a>
          </div>
        </div>
      </details>
    </form>
  );
}
