"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  allowedRoles: string[];
  role: string | null;
  tenantId: string | null;
  children: ReactNode;
};

export function AuthGuard({ allowedRoles, role, tenantId, children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!role || !tenantId || !allowedRoles.includes(role)) {
      router.replace("/login");
    }
  }, [allowedRoles, role, tenantId, router]);

  if (!role || !tenantId || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}

