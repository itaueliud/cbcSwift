"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/session";

// Step type
type Step = "school" | "role" | "credentials";

// Role definitions
const ROLES = [
  { value: "ADMIN",     label: "School Admin",    icon: "⚙️",  desc: "Full school management" },
  { value: "PRINCIPAL", label: "Principal",        icon: "🎓",  desc: "Academic oversight" },
  { value: "TEACHER",   label: "Teacher",          icon: "🧑‍🏫", desc: "Classes & grading" },
  { value: "STUDENT",   label: "Student",          icon: "🎒",  desc: "Learning portal" },
  { value: "PARENT",    label: "Parent",           icon: "👪",  desc: "Child monitoring" },
  { value: "FINANCE",   label: "Finance Officer",  icon: "💰",  desc: "Fees & payroll" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  fontSize: 14,
  outline: "none",
  background: "white",
  color: "#0f172a",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

export default function LoginPage() {
  const [step,        setStep]        = useState<Step>("school");
  const [schoolCode,  setSchoolCode]  = useState("");
  const [schoolName,  setSchoolName]  = useState("");  // typed by user
  const [schoolInfo,  setSchoolInfo]  = useState<{ schoolName: string; subdomain: string; county: string } | null>(null);
  const [selectedRole,setSelectedRole]= useState("");
  const [checking,    setChecking]    = useState(false);
  const [lookupError, setLookupError] = useState("");

  async function handleLookup() {
    // Validate inputs first
    if (!schoolName.trim()) {
      setLookupError("Please enter your school name.");
      return;
    }
    if (!schoolCode.trim()) {
      setLookupError("Please enter your school code.");
      return;
    }

    setChecking(true);
    setLookupError("");

    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
      const res = await fetch(`${API}/auth/school/lookup?code=${encodeURIComponent(schoolCode.trim().toLowerCase())}`);
      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error ?? "School not found. Check your school code.");
        return;
      }

      // School found — move to role selection
      setSchoolInfo(data);
      setStep("role");

    } catch {
      setLookupError("Connection error. Please check your internet and try again.");
    } finally {
      setChecking(false);
    }
  }

  function handleSelectRole(role: string) {
    setSelectedRole(role);
    setStep("credentials");
  }

  return (
    <div className="login-page-grid" style={{ display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "100vh" }}>
      <LeftPanel step={step} schoolInfo={schoolInfo} selectedRole={selectedRole} />
      <RightPanel
        step={step}
        schoolCode={schoolCode}   setSchoolCode={setSchoolCode}
        schoolName={schoolName}   setSchoolName={setSchoolName}
        schoolInfo={schoolInfo}
        selectedRole={selectedRole} setSelectedRole={setSelectedRole}
        checking={checking}       lookupError={lookupError}
        onLookup={handleLookup}
        onSelectRole={handleSelectRole}
        onBack={() => setStep(step === "credentials" ? "role" : "school")}
      />
    </div>
  );
}

function LeftPanel({ step, schoolInfo, selectedRole }: {
  step: Step;
  schoolInfo: { schoolName: string; county: string } | null;
  selectedRole: string;
}) {
  return (
    <aside className="login-left-panel" style={{
      background: "#0d1b3e",
      padding: "32px 28px",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Dot grid texture */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
        backgroundSize: "24px 24px", pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56, position: "relative" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "grid", placeItems: "center", fontSize: 20,
          boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
        }}>📚</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "white" }}>CBC Swift</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>School Operating System</div>
        </div>
      </div>

      {/* Dynamic content changes per step */}
      <div style={{ flex: 1, position: "relative" }}>
        {step === "school" && (
          <>
            {/* Gold badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
              borderRadius: 20, background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)", fontSize: 12,
              fontWeight: 700, color: "#fbbf24", marginBottom: 16,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
              School Access Portal
            </div>

            <h1 style={{
              fontSize: 32, fontWeight: 900, color: "white",
              lineHeight: 1.15, margin: "0 0 16px", letterSpacing: "-0.02em",
            }}>
              Secure<br />Access Portal
            </h1>

            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
              CBC-compliant school management for Kenya's 2025 curriculum. Enter your school details to continue.
            </p>

            {/* Feature checklist */}
            {[
              "Real-time M-Pesa fee collection & receipts",
              "CBC rubric tracking — EE / ME / AE / BE",
              "7 role-based dashboards, fully isolated",
              "Term reports, portfolios & KNEC exports",
              "AI-powered analytics & attendance alerts",
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)",
                  display: "grid", placeItems: "center", marginTop: 1,
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </>
        )}

        {step === "role" && schoolInfo && (
          <>
            {/* Shows verified school details */}
            <div style={{
              padding: "14px 16px", borderRadius: 14, marginBottom: 24,
              background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)",
            }}>
              <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, marginBottom: 4 }}>✅ School Verified</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "white" }}>{schoolInfo.schoolName}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{schoolInfo.county}</div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, color: "white", margin: "0 0 12px" }}>
              Select<br />Your Role
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Choose the role that matches your position at this school. Each role accesses only its own data.
            </p>
          </>
        )}

        {step === "credentials" && (
          <>
            <div style={{
              padding: "14px 16px", borderRadius: 14, marginBottom: 24,
              background: "rgba(29,78,216,0.15)", border: "1px solid rgba(29,78,216,0.3)",
            }}>
              <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, marginBottom: 4 }}>
                {ROLES.find(r => r.value === selectedRole)?.icon} {ROLES.find(r => r.value === selectedRole)?.label}
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "white" }}>{schoolInfo?.schoolName}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{schoolInfo?.county}</div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, color: "white", margin: "0 0 12px" }}>
              Enter Your<br />Credentials
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Your session is encrypted and protected with JWT. High-privilege roles also require 2FA.
            </p>
          </>
        )}
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <span className="login-status-blink" style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>System operational · © 2025 TechSwiftTrix</span>
      </div>
    </aside>
  );
}

function RightPanel({
  step, schoolCode, setSchoolCode, schoolName, setSchoolName,
  schoolInfo, selectedRole, setSelectedRole,
  checking, lookupError, onLookup, onSelectRole, onBack,
}: any) {

  // Step indicator at the top
  const steps = [
    { num: 1, label: "School" },
    { num: 2, label: "Role" },
    { num: 3, label: "Sign In" },
  ];
  const currentStepNum = step === "school" ? 1 : step === "role" ? 2 : 3;

  return (
    <main className="login-right-panel" style={{
      background: "#f0f2f5",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative",
      minHeight: "100vh",
    }}>

      {/* HQ Login — top right, only on Step 1 */}
      {step === "school" && (
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <Link href="/hq-login">
            <button type="button" style={{
              padding: "9px 18px", borderRadius: 10, cursor: "pointer",
              background: "#0d1b3e", color: "white", border: "none",
              fontWeight: 700, fontSize: 13, letterSpacing: "-0.01em",
              boxShadow: "0 2px 8px rgba(13,27,62,0.25)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              👑 HQ Login
            </button>
          </Link>
        </div>
      )}

      {/* Step progress indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s.num} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13,
                background: currentStepNum > s.num
                  ? "#059669"        // completed → green
                  : currentStepNum === s.num
                  ? "#1d4ed8"        // current → blue
                  : "#e2e8f0",       // future → grey
                color: currentStepNum >= s.num ? "white" : "#94a3b8",
                transition: "all 0.3s",
              }}>
                {currentStepNum > s.num ? "✓" : s.num}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: currentStepNum === s.num ? "#1d4ed8" : "#94a3b8",
              }}>
                {s.label}
              </span>
            </div>
            {/* Connector line between steps */}
            {i < steps.length - 1 && (
              <div style={{
                width: 60, height: 2, margin: "0 4px", marginBottom: 18,
                background: currentStepNum > s.num ? "#059669" : "#e2e8f0",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* White card */}
      <div style={{
        width: "100%", maxWidth: 440, background: "white",
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}>
        {/* Blue top bar */}
        <div style={{ height: 4, background: "linear-gradient(90deg, #1d4ed8, #2563eb)" }} />

        <div style={{ padding: "32px 32px 28px" }}>
          {/* STEP 1: School lookup */}
          {step === "school" && <SchoolStep schoolName={schoolName} setSchoolName={setSchoolName} schoolCode={schoolCode} setSchoolCode={setSchoolCode} checking={checking} error={lookupError} onContinue={onLookup} />}

          {/* STEP 2: Role selection */}
          {step === "role"   && <RoleStep schoolInfo={schoolInfo} onSelectRole={onSelectRole} onBack={onBack} />}

          {/* STEP 3: Credentials */}
          {step === "credentials" && <CredentialsStep selectedRole={selectedRole} schoolInfo={schoolInfo} onBack={onBack} />}
        </div>

        {/* Card footer */}
        <div style={{
          padding: "12px 32px", background: "#f8fafc",
          borderTop: "1px solid #f1f5f9", textAlign: "center",
        }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Secured with JWT + 2FA · CBC Swift v2.0
          </span>
        </div>
      </div>

      {/* About link — always visible */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <Link href="/about" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>
          📖 About CBC Swift
        </Link>
      </div>
    </main>
  );
}

function SchoolStep({ schoolName, setSchoolName, schoolCode, setSchoolCode, checking, error, onContinue }: any) {
  return (
    <>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
        Find Your School
      </h2>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
        Enter your school details to get started.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {/* School Name */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            School Name
          </label>
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Green Valley Academy"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
          <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>
            Type the full name of your school
          </span>
        </div>

        {/* School Code */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            School Code
          </label>
          <div style={{ position: "relative" }}>
            <input
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="greenvalley"
              style={{ ...inputStyle, paddingRight: 120 }}
              onKeyDown={(e) => { if (e.key === "Enter") onContinue(); }}
              onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
            />
            <span style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8",
              pointerEvents: "none",
            }}>
              .cbcswift.ke
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>
            Provided by your School Administrator
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Continue button */}
        <button
          type="button"
          onClick={onContinue}
          disabled={checking}
          style={{
            padding: "13px", borderRadius: 10,
            background: checking ? "#93c5fd" : "#1d4ed8",
            color: "white", border: "none", fontWeight: 700,
            fontSize: 15, cursor: checking ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {checking ? "Verifying school…" : <>Continue <span>→</span></>}
        </button>
      </div>
    </>
  );
}

function RoleStep({ schoolInfo, onSelectRole, onBack }: any) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
          Select Your Role
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          {schoolInfo.schoolName}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            onClick={() => onSelectRole(role.value)}
            style={{
              padding: "16px 12px", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "white", cursor: "pointer", textAlign: "left",
              transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563eb";
              e.currentTarget.style.background = "#eff6ff";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.background = "white";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: 22 }}>{role.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{role.label}</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{role.desc}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        style={{
          width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0",
          background: "transparent", color: "#64748b", fontWeight: 600, cursor: "pointer",
          fontSize: 13,
        }}
      >
        ← Back
      </button>
    </>
  );
}

function CredentialsStep({ selectedRole, schoolInfo, onBack }: any) {
  const router = useRouter();
  const role = ROLES.find(r => r.value === selectedRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
      const res = await fetch(`${API}/auth/school/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain: schoolInfo.subdomain,
          email: email.toLowerCase().trim(),
          password,
          trustedDeviceToken: localStorage.getItem("cbc_trusted_device") ?? undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Login failed");

      // 2FA flows
      if (payload.requires2FASetup) {
        saveSession({ token: payload.temporaryToken, type: "school", role: "PENDING_2FA_SETUP" } as any);
        router.push("/setup-2fa"); return;
      }
      if (payload.requires2FA) {
        router.push(`/verify-2fa?token=${encodeURIComponent(payload.temporaryToken)}`); return;
      }

      // Save session and redirect
      saveSession({
        token: payload.token, type: "school",
        userId: payload.user.userId, role: payload.user.role,
        tenantId: payload.tenant.tenantId,
        subdomain: payload.tenant.subdomain,
        schoolName: payload.tenant.schoolName,
        fullName: payload.user.fullName,
        email: payload.user.email,
      } as any);

      const roleMap: Record<string, string> = {
        ADMIN: "school", PRINCIPAL: "principal",
        TEACHER: "teacher", STUDENT: "student",
        PARENT: "parent", FINANCE: "finance",
      };
      router.push(`/${roleMap[payload.user.role] ?? "school"}`);

    } catch (err: any) {
      setError(err.message ?? "Login failed. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSignIn}>
      {/* Role badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        padding: "10px 14px", borderRadius: 12,
        background: "#f0f9ff", border: "1px solid #bae6fd",
      }}>
        <span style={{ fontSize: 20 }}>{role?.icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{role?.label}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{schoolInfo?.schoolName}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>Sign in</h2>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
        Enter your credentials to access your dashboard.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {/* Email */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Email address
          </label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ac.ke"
            required style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Password */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>
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
              onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10,
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          padding: "13px", borderRadius: 10,
          background: loading ? "#93c5fd" : "#1d4ed8", color: "white",
          border: "none", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {loading ? "Signing in…" : <>Sign in <span>→</span></>}
        </button>

        <button type="button" onClick={onBack} style={{
          padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0",
          background: "transparent", color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: 13,
        }}>
          ← Change role
        </button>
      </div>
    </form>
  );
}
