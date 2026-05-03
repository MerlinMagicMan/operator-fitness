"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { localDateISO } from "@/lib/date";
import type { MealType, ParsedMealItem } from "@/lib/operator-types";

type ChatMessage = { role: "user" | "assistant"; content: string };

type MealAnalysisCardProps = {
  scope: "meal" | "day";
  /** YYYY-MM-DD; defaults to today. */
  date?: string;
  /** scope='meal': existing diet_log row id. */
  mealId?: string;
  /** scope='meal': pass parsed items when analyzing a meal not yet in DB. */
  items?: ParsedMealItem[];
  mealType?: MealType;
  eatenAt?: string;
  onDismiss?: () => void;
};

const HEADING: Record<"meal" | "day", string> = {
  meal: "MEAL ANALYSIS",
  day: "TODAY · ANALYSIS",
};

export function MealAnalysisCard({
  scope,
  date,
  mealId,
  items,
  mealType,
  eatenAt,
  onDismiss,
}: MealAnalysisCardProps) {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const initialFetchDone = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const dateISO = date ?? localDateISO();

  const send = async (history: ChatMessage[]) => {
    setStreaming(true);
    setError(null);
    setChat([...history, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/meal/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          date: dateISO,
          mealId,
          items,
          mealType,
          eatenAt,
          messages: history,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
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
      setError(msg);
      setChat((prev) => {
        const next = prev.slice();
        const lastIdx = next.length - 1;
        if (
          lastIdx >= 0 &&
          next[lastIdx]?.role === "assistant" &&
          next[lastIdx]!.content === ""
        ) {
          next.pop();
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void send([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, streaming]);

  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    await send([...chat, userMsg]);
  };

  return (
    <div className="border border-zinc-900 bg-zinc-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles
            className="h-3 w-3"
            style={{ color: "var(--color-cyan)" }}
            aria-hidden
          />
          <span
            className="text-[10px] font-bold tracking-widest"
            style={{ color: "var(--color-cyan)" }}
          >
            {HEADING[scope]}
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-zinc-700 hover:text-zinc-300"
            aria-label="Dismiss analysis"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="max-h-60 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed"
      >
        {chat.length === 0 && streaming && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            <span>Analyzing…</span>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i}>
            {m.role === "user" ? (
              <div className="border-l-2 border-zinc-800 pl-2 text-zinc-500">
                {m.content}
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-zinc-200">
                {m.content || (streaming ? "…" : "")}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div
          className="mt-2 border px-2 py-1 text-[11px]"
          style={{
            backgroundColor:
              "color-mix(in oklab, var(--color-red) 10%, transparent)",
            borderColor:
              "color-mix(in oklab, var(--color-red) 30%, transparent)",
            color: "var(--color-red)",
          }}
        >
          {error}
        </div>
      )}

      <div className="mt-2 flex gap-2 border-t border-zinc-900 pt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask a follow-up..."
          disabled={streaming}
          className="flex-1 border border-zinc-800 bg-black px-2 py-1 text-[11px] text-zinc-100 focus:border-[var(--color-cyan)] focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={streaming || !input.trim()}
          className="border px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            color: "var(--color-cyan)",
            borderColor:
              "color-mix(in oklab, var(--color-cyan) 50%, transparent)",
          }}
          aria-label="Send"
        >
          {streaming ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3 w-3" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
