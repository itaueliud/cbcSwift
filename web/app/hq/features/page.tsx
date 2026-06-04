"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

type Feature = { featureKey: string; label: string; description?: string; isEnabled: boolean; planRequired?: string };

const defaultFeatures: Feature[] = [
  { featureKey: "mpesa_payments",     label: "M-Pesa Payments",       description: "STK push, webhooks, reconciliation.",   isEnabled: true,  planRequired: "BASIC" },
  { featureKey: "ai_analytics",       label: "AI Analytics",          description: "Risk prediction, scoring, summaries.",  isEnabled: true,  planRequired: "PRO" },
  { featureKey: "sms_notifications",  label: "SMS Notifications",     description: "Safaricom / Africa's Talking SMS.",     isEnabled: true,  planRequired: "BASIC" },
  { featureKey: "parent_portal",      label: "Parent Portal",         description: "Parent self-service access.",           isEnabled: true,  planRequired: "BASIC" },
  { featureKey: "student_portal",     label: "Student Portal",        description: "Student self-service access.",          isEnabled: true,  planRequired: "BASIC" },
  { featureKey: "cbc_portfolio",      label: "CBC Portfolio",         description: "Digital learning evidence uploads.",    isEnabled: true,  planRequired: "BASIC" },
  { featureKey: "career_pathways",    label: "Career Pathways (SSS)", description: "SSS career suggestion module.",         isEnabled: false, planRequired: "PRO" },
  { featureKey: "custom_reports",     label: "Custom Report Builder", description: "Ministry-ready report exports.",        isEnabled: false, planRequired: "ENTERPRISE" },
  { featureKey: "audit_logs",         label: "Audit Logging",         description: "Full security event trail.",            isEnabled: true,  planRequired: "PRO" },
  { featureKey: "multi_campus",       label: "Multi-Campus Support",  description: "Manage several campuses per tenant.",   isEnabled: false, planRequired: "ENTERPRISE" },
  { featureKey: "payroll",            label: "Payroll Management",    description: "Staff salary and deduction tracking.",  isEnabled: true,  planRequired: "BASIC" },
  { featureKey: "transport",          label: "Transport System",      description: "Bus routes and vehicle management.",    isEnabled: false, planRequired: "PRO" },
];

export default function HQFeaturesPage() {
  const session = useProtectedSession(["hq"]);
  const [features, setFeatures] = useState<Feature[]>(defaultFeatures);
  const [saving, setSaving] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Row[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("GLOBAL");

  useEffect(() => {
    if (!session) return;
    
    // Load tenants
    apiFetch<Row[]>("/hq/tenants", {}, session.token)
      .then(setTenants)
      .catch(() => {});

    // Load features based on selected scope
    const endpoint = selectedTenant === "GLOBAL" ? "/hq/features" : `/hq/features?tenantId=${selectedTenant}`;
    apiFetch<Feature[]>(endpoint, {}, session.token)
      .then((data) => { setFeatures(data.length > 0 ? data : defaultFeatures); })
      .catch(() => { setFeatures(defaultFeatures); });
  }, [session, selectedTenant]);

  async function toggleFeature(key: string) {
    if (!session) return;
    const feat = features.find((f) => f.featureKey === key);
    if (!feat) return;
    const next = !feat.isEnabled;
    setFeatures((prev) => prev.map((f) => f.featureKey === key ? { ...f, isEnabled: next } : f));
    setSaving(key);
    try {
      const endpoint = selectedTenant === "GLOBAL" ? `/hq/features/${key}` : `/hq/features/${key}?tenantId=${selectedTenant}`;
      await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ isEnabled: next }) }, session.token);
    } catch {
      setFeatures((prev) => prev.map((f) => f.featureKey === key ? { ...f, isEnabled: !next } : f));
    } finally { setSaving(null); }
  }

  if (!session) return null;

  const enabledCount = features.filter((f) => f.isEnabled).length;
  const planGroups = ["BASIC", "PRO", "ENTERPRISE"];

  return (
    <DashboardShell title="Feature Toggles" subtitle="Enable or disable platform features globally" badge="HQ Admin" role="hq">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Features", value: String(features.length), icon: "🧩" },
          { label: "Enabled", value: String(enabledCount), icon: "✅" },
          { label: "Disabled", value: String(features.length - enabledCount), icon: "🔒" },
          { label: "Enterprise Only", value: String(features.filter((f) => f.planRequired === "ENTERPRISE").length), icon: "⭐" },
        ].map((item) => (
          <div key={item.label} className="panel-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 24 }}>{item.value}</div>
              <div className="muted" style={{ fontSize: 12 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, flexWrap: "wrap", background: "white", padding: 16, borderRadius: 16, border: "1px solid var(--line)" }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, margin: 0 }}>Select Target Scope</h3>
          <select 
            className="login-select" 
            value={selectedTenant} 
            onChange={(e) => setSelectedTenant(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)" }}
          >
            <option value="GLOBAL">Global (All Schools Default)</option>
            {tenants.map((t) => (
              <option key={t.tenantId ?? t.tenant_id} value={t.tenantId ?? t.tenant_id}>
                {t.schoolName ?? t.school_name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, marginTop: 12 }}>
            Changes made here apply instantly. Select a specific school to override global settings, or leave at Global to change the defaults.
          </p>
        </div>
      </div>

      {planGroups.map((plan) => {
        const planFeatures = features.filter((f) => f.planRequired === plan);
        return (
          <div key={plan} className="section">
            <h3>{plan} PLAN FEATURES</h3>
            <div className="panel-card">
              {planFeatures.map((feat, i) => (
                <div key={feat.featureKey} className="toggle-row" style={{ borderTop: i === 0 ? "none" : undefined }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div className="toggle-label">{feat.label}</div>
                      <span className={`pill ${feat.isEnabled ? "green" : "gray"}`} style={{ fontSize: 10 }}>
                        {feat.isEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="toggle-desc">{feat.description}</div>
                  </div>
                  <button
                    type="button"
                    className={`toggle-switch ${feat.isEnabled ? "on" : ""}`}
                    onClick={() => toggleFeature(feat.featureKey)}
                    disabled={saving === feat.featureKey}
                    aria-label={`Toggle ${feat.label}`}
                    style={{ opacity: saving === feat.featureKey ? 0.6 : 1 }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </DashboardShell>
  );
}
