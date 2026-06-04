"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DataTable } from "@/components/data-table";
import { apiFetch } from "@/lib/api";
import { useProtectedSession } from "@/lib/use-protected-session";

type Row = Record<string, any>;

export default function PrincipalPromotionsPage() {
  const session = useProtectedSession(["PRINCIPAL", "ADMIN"]);
  const [promotions, setPromotions] = useState<Row[]>([]);

  async function load() {
    if (!session) return;
    setPromotions(await apiFetch<Row[]>("/school/promotions", {}, session.token));
  }

  useEffect(() => {
    if (session) void load();
  }, [session]);

  if (!session) return null;

  return (
    <DashboardShell title="Promotions" subtitle="Year-end learner transitions" badge="Principal" role="principal">
      <div className="section">
        <DataTable
          columns={[
            { key: "studentName", label: "Student" },
            { key: "fromClass", label: "From" },
            { key: "toClass", label: "To" },
            { key: "decision", label: "Decision" },
            { key: "autoFlagged", label: "Auto" },
          ]}
          rows={promotions.map((promotion) => ({
            studentName: String(promotion.student?.fullName ?? promotion.student_name ?? ""),
            fromClass: String(promotion.fromClass?.className ?? promotion.from_class ?? ""),
            toClass: String(promotion.toClass?.className ?? promotion.to_class ?? ""),
            decision: String(promotion.decision ?? ""),
            autoFlagged: String(promotion.autoFlagged ?? promotion.auto_flagged ?? false),
          }))}
        />
      </div>
    </DashboardShell>
  );
}
