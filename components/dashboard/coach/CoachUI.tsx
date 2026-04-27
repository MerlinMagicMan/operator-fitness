"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useChat, type ChatMessage } from "./ChatContext";
import { ChatBubble } from "./ChatBubble";

const EMPTY_PROMPTS = [
  '"Modify today\'s workout, knee is sore"',
  '"I plateaued at 270 — adjust diet"',
  '"Should I add a 3rd run this week?"',
  '"What\'s my realistic mile time at week 24?"',
  '"Peptide protocol for this phase?"',
] as const;

/**
 * Shared chat surface — rendered either inline (DASH tab column 3) or
 * inside the floating CoachDrawer. Reads chat state from ChatContext so
 * conversations persist across tab switches.
 */
export function CoachUI({
  scrollAreaClassName,
  emptyHint,
}: {
  scrollAreaClassName?: string;
  emptyHint?: string;
}) {
  const { chat, setChat } = useChat();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, streaming]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history = [...chat, userMsg];
    setChat(history);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Append empty assistant message and stream tokens into it.
      setChat((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setChat((prev) => {
          const next = prev.slice();
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx]?.role === "assistant") {
            next[lastIdx] = { role: "assistant", content: assistantText };
          }
          return next;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setChat((prev) => {
        const next = prev.slice();
        const lastIdx = next.length - 1;
        const lastMsg = next[lastIdx];
        if (lastIdx >= 0 && lastMsg?.role === "assistant") {
          next[lastIdx] = {
            role: "assistant",
            content: `[Coach offline — ${msg}]`,
          };
        } else {
          next.push({
            role: "assistant",
            content: `[Coach offline — ${msg}]`,
          });
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className={`flex-1 space-y-3 overflow-y-auto pr-1 ${scrollAreaClassName ?? "min-h-[300px]"}`}
      >
        {chat.length === 0 && (
          <div className="space-y-2 text-xs text-zinc-600">
            <p>{emptyHint ?? "Coach is on. Ask anything:"}</p>
            <ul className="space-y-1 pl-2">
              {EMPTY_PROMPTS.map((p) => (
                <li key={p}>· {p}</li>
              ))}
            </ul>
          </div>
        )}
        {chat.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {streaming && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            <span>Coach is thinking…</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask the coach..."
          disabled={streaming}
          className="flex-1 border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={streaming || !input.trim()}
          className="border px-3 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            color: "var(--color-amber)",
            borderColor:
              "color-mix(in oklab, var(--color-amber) 50%, transparent)",
          }}
          aria-label="Send"
        >
          <Send className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}
