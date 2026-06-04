"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/session";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <button
      type="button"
      className="logout-btn"
      onClick={handleLogout}
      aria-label="Sign out"
    >
      <span>⬅️</span>
      <span>Sign out</span>
    </button>
  );
}
