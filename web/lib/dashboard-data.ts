export type DashboardKey =
  | "hq"
  | "school"
  | "principal"
  | "teacher"
  | "student"
  | "parent"
  | "finance"
  | "shared";

export type Feature = {
  title: string;
  description: string;
  badge?: string;
  href?: string;
};

export type DashboardSection = {
  heading: string;
  features: Feature[];
};

export type DashboardDefinition = {
  key: DashboardKey;
  label: string;
  subtitle: string;
  badge: string;
  summary: string;
  metrics: { label: string; value: string; description: string }[];
  sections: DashboardSection[];
};

export const dashboards: DashboardDefinition[] = [
  {
    key: "hq",
    label: "HQ Admin",
    subtitle: "Super Admin (HQ / TechSwiftTrix)",
    badge: "Layer 0",
    summary: "Platform control and tenant orchestration.",
    metrics: [
      { label: "Active schools", value: "3", description: "Tenants onboarded and running" },
      { label: "Monthly revenue", value: "KSh 43.5k", description: "Plan mix across schools" },
      { label: "System health", value: "99.9%", description: "API, queue, and DB uptime" }
    ],
    sections: [
      {
        heading: "Platform Control",
        features: [
          { title: "School onboarding", description: "Create tenants and assign plans", href: "/hq/tenants" },
          { title: "Subscription billing", description: "Track plan tier and cycles" },
          { title: "Revenue analytics", description: "MRR, upgrades, churn, county views" },
          { title: "System health", description: "Queue depth, DB load, service status" },
          { title: "County analytics", description: "School density and usage heatmaps" },
          { title: "Feature toggles", description: "Enable and disable dashboard features", href: "/hq/features" },
          { title: "Storage monitor", description: "Portfolio files and report usage" },
          { title: "NEMIS/KNEC sync", description: "National compliance integration" },
          { title: "Audit logs", description: "Security-critical event history", href: "/audit-logs" }
        ]
      }
    ]
  },
  {
    key: "school",
    label: "School Admin",
    subtitle: "One school, full operating system",
    badge: "Layer 1",
    summary: "Set up the institution, structure the academic year, and govern access.",
    metrics: [
      { label: "Classes", value: "5", description: "Grade and stream combinations" },
      { label: "Staff", value: "4", description: "Teachers and school roles" },
      { label: "Students", value: "8", description: "Admissions and class roster" }
    ],
    sections: [
      {
        heading: "Setup Wizard",
        features: [
          { title: "Control panel", description: "Unified school operating layer", href: "/school/control" },
          { title: "Academic year setup", description: "Terms, dates, and current year", href: "/school/setup" },
          { title: "Class management", description: "Streams, capacities, tier mapping", href: "/school/setup" },
          { title: "Subject allocation", description: "Attach subjects to classes", href: "/school/setup" },
          { title: "Timetable builder", description: "Drag-drop periods and teachers", href: "/school/timetable" },
          { title: "Staff onboarding", description: "TSC, specializations, login access", href: "/school/setup" },
          { title: "Student admissions", description: "NEMIS, class, parent link", href: "/school/setup" }
        ]
      },
      {
        heading: "Governance",
        features: [
          { title: "Transport system", description: "Routes and vehicles" },
          { title: "Inventory", description: "Assets and consumables" },
          { title: "Discipline system", description: "Behaviour and incidents" },
          { title: "Communication hub", description: "Announcements and team chat", href: "/chat" },
          { title: "Ministry reports", description: "Compliance exports" },
          { title: "Role visibility control", description: "Per-role access toggles", href: "/school/setup" },
          { title: "School analytics", description: "Rollups across the institution" }
        ]
      }
    ]
  },
  {
    key: "principal",
    label: "Principal",
    subtitle: "Leadership and approvals",
    badge: "Layer 2",
    summary: "School-wide oversight without transactional clutter.",
    metrics: [
      { label: "Attendance", value: "94%", description: "School-wide presence rate" },
      { label: "CBC compliance", value: "96%", description: "Rubric completeness and grading" },
      { label: "Pending reports", value: "12", description: "Teacher reports waiting approval" }
    ],
    sections: [
      {
        heading: "Analytics",
        features: [
          { title: "School overview", description: "Attendance, grades, compliance" },
          { title: "Class comparison", description: "Performance across grades" },
          { title: "Teacher performance", description: "Marking and attendance gaps" },
          { title: "At-risk students", description: "AI-flagged support list", badge: "AI" }
        ]
      },
      {
        heading: "Approvals",
        features: [
          { title: "Report approvals", description: "Approve and publish term reports" },
          { title: "Expense approvals", description: "Sign off finance submissions", href: "/principal/expenses" },
          { title: "Escalation chat", description: "Teacher, parent, and HQ discussions", href: "/chat" },
          { title: "Ministry reports", description: "Export compliance documents" }
        ]
      }
    ]
  },
  {
    key: "teacher",
    label: "Teacher",
    subtitle: "Daily teaching operations",
    badge: "Layer 2",
    summary: "Fast tools for attendance, marks, assignments, and CBC evidence.",
    metrics: [
      { label: "Classes today", value: "3", description: "From timetable" },
      { label: "Marks pending", value: "18", description: "Unpublished entries" },
      { label: "Assignments", value: "5", description: "Active class tasks" }
    ],
    sections: [
      {
        heading: "Daily Teaching",
        features: [
          { title: "Teacher home", description: "Classes and pending tasks" },
          { title: "Attendance sheet", description: "Mark present, absent, late", href: "/teacher/attendance" },
          { title: "Mark entry", description: "EE / ME / AE / BE scoring", href: "/teacher/marks" },
          { title: "Assignment creator", description: "Tasks, due dates, attachments", href: "/teacher/assignments" },
          { title: "Lesson planner", description: "Objectives and CBC areas" }
        ]
      },
      {
        heading: "Student Management",
        features: [
          { title: "Portfolio upload", description: "Evidence files per student", href: "/teacher/portfolio" },
          { title: "Student profile", description: "Marks, attendance, portfolio history" },
          { title: "Report builder", description: "Auto-filled term reports", href: "/teacher/reports" },
          { title: "Parent messages", description: "Threaded communication", href: "/chat" }
        ]
      }
    ]
  },
  {
    key: "student",
    label: "Student",
    subtitle: "Tier-aware learner experience",
    badge: "Layer 2",
    summary: "Primary is read-only, JSS and SSS become active learning environments.",
    metrics: [
      { label: "Published results", value: "8", description: "Visible assessment items" },
      { label: "Assignments", value: "4", description: "Due and submitted" },
      { label: "Portfolio items", value: "6", description: "CBC evidence artifacts" }
    ],
    sections: [
      {
        heading: "Primary (Grades 1-6)",
        features: [
          { title: "Student home", description: "Timetable and announcements", href: "/student" },
          { title: "My portfolio", description: "Teacher-uploaded evidence", href: "/student/portfolio" },
          { title: "My results", description: "Published marks only", href: "/student/results" }
        ]
      },
      {
        heading: "JSS + SSS",
        features: [
          { title: "Learning materials", description: "Subject files and notes" },
          { title: "Assignments", description: "Pending, submitted, graded", href: "/student/assignments" },
          { title: "Portfolio builder", description: "Self-uploaded evidence", href: "/student/portfolio" },
          { title: "AI tutor", description: "CBC help and study guidance", badge: "AI" },
          { title: "Career pathway", description: "Strength profile and suggestions", badge: "AI" },
          { title: "CV builder", description: "SSS export-ready profile", badge: "SSS" }
        ]
      }
    ]
  },
  {
    key: "parent",
    label: "Parent",
    subtitle: "Child progress and payments",
    badge: "Layer 2",
    summary: "Everything a parent needs to track children, fees, and reports.",
    metrics: [
      { label: "Children", value: "2", description: "Linked student accounts" },
      { label: "Balance", value: "KSh 9,500", description: "Outstanding fees" },
      { label: "Absence alerts", value: "3", description: "Recent attendance issues" }
    ],
    sections: [
      {
        heading: "Overview",
        features: [
          { title: "Parent home", description: "Quick stats and alerts", href: "/parent" },
          { title: "Child performance", description: "Marks and trend charts" },
          { title: "Attendance view", description: "Daily log and monthly rate" },
          { title: "Portfolio view", description: "Teacher-visible evidence" },
          { title: "Reports", description: "Published term reports", href: "/parent/reports" }
        ]
      },
      {
        heading: "Fees & Messaging",
        features: [
          { title: "Fee payment", description: "M-Pesa push and history", href: "/parent/fees" },
          { title: "Payment receipts", description: "Downloadable receipts", href: "/parent/fees" },
          { title: "Messages", description: "Thread with teacher or admin", href: "/chat" },
          { title: "Notifications", description: "Fees, absences, report ready", href: "/notifications" }
        ]
      }
    ]
  },
  {
    key: "finance",
    label: "Finance",
    subtitle: "Fees, payroll, and reports",
    badge: "Layer 2",
    summary: "Everything around money in one controlled workspace.",
    metrics: [
      { label: "Collected", value: "KSh 128k", description: "Current term receipts" },
      { label: "Expenses", value: "KSh 61k", description: "Approved and pending" },
      { label: "Payroll", value: "KSh 240k", description: "Monthly net salary total" }
    ],
    sections: [
      {
        heading: "Fees",
        features: [
          { title: "Fee overview", description: "Collected vs expected", href: "/finance/payments" },
          { title: "Fee structure", description: "Set per tier and term", href: "/finance/fee-structures" },
          { title: "Record payment", description: "Cash, M-Pesa, bank, cheque", href: "/finance/payments" },
          { title: "Defaulters list", description: "Students with balance due" },
          { title: "Payment support chat", description: "M-Pesa disputes and receipts", href: "/chat" },
          { title: "Receipts", description: "Search, reprint, export", href: "/finance/payments" }
        ]
      },
      {
        heading: "Expenses & Payroll",
        features: [
          { title: "Add expense", description: "Receipt upload and approval flow", href: "/finance/expenses" },
          { title: "Budget tracker", description: "Income vs expenditure" },
          { title: "Payroll manager", description: "Gross, deductions, net", href: "/finance/payroll" },
          { title: "Financial reports", description: "Monthly, termly, annual exports" }
        ]
      }
    ]
  },
  {
    key: "shared",
    label: "Shared UI",
    subtitle: "Reusable components for every dashboard",
    badge: "System",
    summary: "Build once, reuse everywhere across the platform.",
    metrics: [
      { label: "Reusable components", value: "12+", description: "Common UI building blocks" },
      { label: "Data grids", value: "TanStack", description: "Filtering, pagination, export" },
      { label: "Auth guards", value: "RBAC", description: "Role and tenant protection" }
    ],
    sections: [
      {
        heading: "Core Components",
        features: [
          { title: "Sidebar nav", description: "Primary navigation across roles" },
          { title: "Notification bell", description: "Alerts and unread counts" },
          { title: "Global search", description: "Tenant-scoped lookup" },
          { title: "Profile menu", description: "Account and logout" },
          { title: "Data table", description: "Sort, filter, paginate, export" },
          { title: "Stat cards", description: "Overview metrics with trends" },
          { title: "File uploader", description: "Images, PDFs, receipts, portfolios" },
          { title: "Auth guard HOC", description: "Role and tenant route enforcement" }
        ]
      },
      {
        heading: "UX Essentials",
        features: [
          { title: "Skeleton loader", description: "Show layout while fetching data" },
          { title: "Empty states", description: "Tell the user what to do next" },
          { title: "Calendar widget", description: "Term dates and lesson planning" },
          { title: "Toast alerts", description: "Feedback for actions and saves" }
        ]
      }
    ]
  }
];
