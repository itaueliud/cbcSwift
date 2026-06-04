import { redirect } from "next/navigation";
import { RoleDashboard } from "@/components/role-dashboard";

const validRoles = [
  "hq",
  "school",
  "principal",
  "teacher",
  "student",
  "parent",
  "finance",
  "shared",
] as const;

export function generateStaticParams() {
  return validRoles.map((role) => ({ role }));
}

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const normalizedRole = role.toLowerCase();

  if (role !== normalizedRole) {
    redirect(`/${normalizedRole}`);
  }

  if (!validRoles.includes(normalizedRole as typeof validRoles[number])) {
    redirect("/hq");
  }

  return <RoleDashboard role={normalizedRole} />;
}
