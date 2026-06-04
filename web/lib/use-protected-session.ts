"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSession, type Session } from "@/lib/session";

export function useProtectedSession(allowedRoles?: string[]): Session | null {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const current = readSession();
    if (!current) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const roleToCheck = current.type === "hq" ? "hq" : (current.role ?? "").toUpperCase();
      const allowed = allowedRoles.map((r) => r.toUpperCase());
      if (!allowed.includes(roleToCheck.toUpperCase())) {
        router.replace("/login");
        return;
      }
    }

    setSession(current);
  }, [router]);

  return session;
}
