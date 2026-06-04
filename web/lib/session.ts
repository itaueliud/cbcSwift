export type Session = {
  token: string;
  type: "hq" | "school";
  role?: string;
  hqRole?: string;
  userId?: string;
  platformUserId?: string;
  tenantId?: string;
  fullName: string;
  email: string;
  schoolName?: string;
  subdomain?: string;
};

const KEY = "cbcnexus-session";

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(KEY);
}

// Backwards-compatible alias expected by some components
export const loadSession = readSession;
