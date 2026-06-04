"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { loadSession } from "@/lib/session";

type Message = { role: "user" | "bot"; text: string; ts: number };
type Session = { token?: string; role?: string; hqRole?: string; fullName?: string };

const QUICK_PROMPTS: Record<string, string[]> = {
  ADMIN:     ["School overview", "Student count", "Staff count", "Pending fees"],
  PRINCIPAL: ["Academic overview", "Pending report approvals", "Attendance summary"],
  TEACHER:   ["My classes today", "Pending assignments", "Attendance status"],
  STUDENT:   ["My results", "Upcoming assignments", "My attendance"],
  PARENT:    ["My child's results", "Fee balance", "Attendance report"],
  FINANCE:   ["Revenue this term", "Pending payments", "Expense summary"],
  SUPER_ADMIN: ["School overview", "Tenant health", "Audit logs", "Revenue"],
  SUPPORT:   ["Help requests", "Login issues", "System status"],
  SALES:     ["New schools", "Trial conversions", "Plan upgrades"],
  BILLING:   ["Invoices", "Payments", "Overdue accounts"],
  DEFAULT:   ["How can you help?", "School overview", "Fee status"],
};

const ASSISTANT_LABELS: Record<string, string> = {
  ADMIN: "Admin Assistant",
  PRINCIPAL: "Principal Assistant",
  TEACHER: "Teacher Assistant",
  STUDENT: "Student Assistant",
  PARENT: "Parent Assistant",
  FINANCE: "Finance Assistant",
  SUPER_ADMIN: "HQ Assistant",
  SUPPORT: "Support Assistant",
  SALES: "Sales Assistant",
  BILLING: "Billing Assistant",
  DEFAULT: "CBC Swift Assistant",
};

export function BotWidget() {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [session,   setSession]   = useState<Session | null>(null);
  const [unread,    setUnread]    = useState(0);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const pathname   = usePathname();

  useEffect(() => {
    const s = loadSession() as Session | null;
    setSession(s);
    if (s?.token) {
      const roleKey = (s.role ?? s.hqRole ?? "DEFAULT").toUpperCase();
      const assistantLabel = ASSISTANT_LABELS[roleKey] ?? ASSISTANT_LABELS.DEFAULT;
      setMessages([{
        role: "bot",
        text: `Hello${s.fullName ? `, ${s.fullName.split(" ")[0]}` : ""}! 👋 I'm your ${assistantLabel}. I can help with fees, attendance, results, assignments, and more. What would you like to know?`,
        ts: Date.now(),
      }]);
    }
  }, [pathname]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading || !session?.token) return;
    const userMsg: Message = { role: "user", text: text.trim(), ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiFetch<{ reply: string }>("/bot/chat", {
        method: "POST",
        body: JSON.stringify({ message: text.trim() }),
      }, session.token);

      const botMsg: Message = { role: "bot", text: res.reply, ts: Date.now() };
      setMessages((m) => [...m, botMsg]);
      if (!open) setUnread((n) => n + 1);
    } catch (e) {
      setMessages((m) => [...m, {
        role: "bot",
        text: "⚠️ Sorry, I couldn't process that right now. Please try again.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, session, open]);

  if (!session?.token) return null;

  const role = (session.role ?? session.hqRole ?? "DEFAULT").toUpperCase();
  const assistantLabel = ASSISTANT_LABELS[role] ?? ASSISTANT_LABELS.DEFAULT;
  const prompts = QUICK_PROMPTS[role] ?? QUICK_PROMPTS.DEFAULT;

  return (
    <>
      {/* Floating button */}
      <div className="bot-widget" style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9000,
      }}>
        {/* Unread badge */}
        {unread > 0 && !open && (
          <div style={{
            position: "absolute", top: -6, right: -6,
            background: "#ef4444", color: "white",
            borderRadius: "50%", width: 20, height: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, zIndex: 1,
            animation: "bounceIn 0.4s ease",
          }}>
            {unread}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="CBC Swift Assistant"
          style={{
            width: 56, height: 56, borderRadius: "50%", border: "none",
            background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
            color: "white", fontSize: 24, cursor: "pointer",
            boxShadow: "0 6px 28px rgba(29,78,216,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s, box-shadow 0.2s",
            animation: !open ? "botBounce 3s ease-in-out infinite" : "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {open ? "✕" : "🤖"}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="bot-panel" style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 8999,
          width: 380, maxHeight: 560,
          background: "white", borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "botPanelOpen 0.3s ease",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{assistantLabel}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                Online · {assistantLabel}
              </div>
            </div>
            <button type="button" onClick={() => setMessages([messages[0]!])}
              title="Clear chat"
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "5px 8px", color: "white", cursor: "pointer", fontSize: 12 }}>
              🗑️
            </button>
            <button type="button" onClick={() => setOpen(false)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "5px 8px", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              ✕
            </button>
          </div>

          {/* Quick prompts (only if just greeting) */}
          {messages.length <= 1 && (
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {prompts.map((p) => (
                <button key={p} type="button" onClick={() => send(p)} style={{
                  padding: "5px 10px", borderRadius: 20, border: "1.5px solid #e2e8f0",
                  background: "#f8fafc", fontSize: 11, cursor: "pointer", fontWeight: 600,
                  color: "#334155", transition: "all 0.15s",
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; e.currentTarget.style.borderColor = "#93c5fd"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                animation: "msgIn 0.25s ease",
              }}>
                {msg.role === "bot" && (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, marginRight: 6, flexShrink: 0, marginTop: 2 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "78%", padding: "9px 13px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                  background: msg.role === "user" ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "#f1f5f9",
                  color: msg.role === "user" ? "white" : "#1e293b",
                  fontSize: 13, lineHeight: 1.55,
                  boxShadow: msg.role === "user" ? "0 2px 8px rgba(29,78,216,0.25)" : "none",
                }}>
                  {msg.text.split("\n").map((line, li) => (
                    <span key={li}>{line}{li < msg.text.split("\n").length - 1 && <br />}</span>
                  ))}
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: "right" }}>
                    {new Date(msg.ts).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "msgIn 0.25s ease" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                <div style={{ background: "#f1f5f9", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, alignItems: "center", background: "#fafcff" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder="Ask anything…"
              disabled={loading}
              style={{
                flex: 1, padding: "9px 13px", borderRadius: 14, border: "1.5px solid #e2e8f0",
                fontSize: 13, outline: "none", background: "white", transition: "border-color 0.2s",
                fontFamily: "inherit",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#93c5fd"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={() => void send(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: "50%", border: "none",
                background: input.trim() ? "linear-gradient(135deg,#1d4ed8,#7c3aed)" : "#e2e8f0",
                color: input.trim() ? "white" : "#94a3b8",
                cursor: input.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "all 0.2s", flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
