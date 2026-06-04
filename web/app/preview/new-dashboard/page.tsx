"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { dashboards } from "@/lib/dashboard-data";

export default function NewDashboardPreview() {
  const [role, setRole] = useState<string>("hq");
  const dashboard = dashboards.find((d) => d.key === role) ?? dashboards[0];

  return (
    <DashboardShell title={dashboard.label} subtitle={dashboard.subtitle} badge={dashboard.badge} role={role}>
      <div style={{ paddingTop: 0 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <label style={{ fontWeight: 600 }}>Preview role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8 }}>
            {dashboards.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="section">
          <div className="card-grid">
            {dashboard.metrics.map((metric) => (
              <StatCard
                key={metric.label}
                {...metric}
                action={<button type="button" aria-label={`More about ${metric.label}`}>•</button>}
              />
            ))}
          </div>
        </div>

        {dashboard.sections.map((section) => (
          <div key={section.heading} className="section">
            <h3>{section.heading}</h3>
            <div className="card-grid">
              {section.features.map((feature) => (
                <article key={feature.title} className="feature-card">
                  <div className="name">{feature.title}</div>
                  <div className="desc">{feature.description}</div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
