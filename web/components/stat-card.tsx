type Props = {
  label: string;
  value: string;
  description?: string;
  icon?: string;
  trend?: string;
  trendUp?: boolean;
  action?: React.ReactNode;
};

const iconMap: Record<string, string> = {
  "active schools": "🏫",
  "monthly revenue": "💰",
  "system health": "✅",
  classes: "📚",
  staff: "👩‍🏫",
  students: "🎒",
  attendance: "📊",
  "cbc compliance": "🎯",
  "pending reports": "📋",
  "classes today": "🗓️",
  "marks pending": "✏️",
  assignments: "📝",
  "published results": "📈",
  "portfolio items": "🗂️",
  children: "👶",
  balance: "💳",
  "absence alerts": "⚠️",
  collected: "🧾",
  expenses: "📤",
  payroll: "👷",
  payments: "✅",
  "student records": "👤",
  "fee items": "🗂️",
  rooms: "💬",
  unread: "🔔",
  status: "📡",
  "reusable components": "🧩",
};

export function StatCard({ label, value, description, icon, trend, trendUp, action }: Props) {
  const autoIcon = icon ?? iconMap[label.toLowerCase()] ?? "📌";

  return (
    <div className="metric-card">
      <div className="metric-head">
        <div className="metric-icon">{autoIcon}</div>
        {action && <div className="metric-action">{action}</div>}
      </div>
      <div className="metric-value">{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0d1117", marginTop: 4 }}>{label}</div>
      {description && <div className="metric-desc">{description}</div>}
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: trendUp ? "#059669" : "#dc2626", fontWeight: 700 }}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        </div>
      )}
    </div>
  );
}
