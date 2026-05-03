"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Mic, MicOff, Send, Trash2 } from "lucide-react";
import { logMeals } from "@/app/actions/log-meal";
import type { MealInput, ParsedMealItem } from "@/lib/operator-types";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function MacroCell({
  value,
  unit,
  color,
  onChange,
}: {
  value: number | null;
  unit: string;
  color: string;
  onChange: (n: number | null) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <input
        type="number"
        step="0.1"
        min="0"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v === "") {
            onChange(null);
            return;
          }
          const n = Number(v);
          onChange(Number.isFinite(n) && n >= 0 ? n : null);
        }}
        className="w-14 border border-zinc-800 bg-black px-1 py-0.5 text-right text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
      />
      <span className="text-[10px]" style={{ color }}>
        {unit}
      </span>
    </label>
  );
}

function SourceBadge({ source }: { source: ParsedMealItem["source"] }) {
  if (source === "usda") {
    return (
      <span
        className="border px-1 py-0.5 text-[9px] font-bold tracking-widest"
        style={{
          color: "var(--color-cyan)",
          borderColor:
            "color-mix(in oklab, var(--color-cyan) 40%, transparent)",
        }}
      >
        VERIFIED
      </span>
    );
  }
  return (
    <span
      className="border px-1 py-0.5 text-[9px] font-bold tracking-widest"
      style={{
        color: "var(--color-amber)",
        borderColor: "color-mix(in oklab, var(--color-amber) 40%, transparent)",
      }}
    >
      ESTIMATE
    </span>
  );
}

export function QuickLogMeal({
  date,
  onAfterSave,
}: {
  date: string;
  onAfterSave?: () => void;
}) {
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [items, setItems] = useState<ParsedMealItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [saving, startSaving] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const speechAvailable =
    typeof window !== "undefined" && getSpeechRecognition() !== null;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0]?.transcript ?? "")
          .join(" ")
          .trim();
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = (event) => {
        setError(`Voice error: ${event.error}`);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setError(null);
      setListening(true);
      rec.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setListening(false);
    }
  };

  const parse = async () => {
    const trimmed = text.trim();
    if (!trimmed || parsing) return;
    setParsing(true);
    setError(null);
    setItems(null);
    try {
      const res = await fetch("/api/food/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { items: ParsedMealItem[] };
      if (!json.items || json.items.length === 0) {
        setError("Couldn't identify any foods. Try rephrasing.");
        return;
      }
      setItems(json.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ParsedMealItem>) => {
    setItems((prev) => {
      if (!prev) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx]!, ...patch };
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  };

  const save = () => {
    if (!items || items.length === 0) return;
    const payload: MealInput[] = items.map((it) => ({
      date,
      meal: it.name,
      calories: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      source: it.source,
      fdc_id: it.fdc_id,
    }));
    startSaving(async () => {
      const result = await logMeals(payload);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setItems(null);
      setText("");
      setError(null);
      onAfterSave?.();
    });
  };

  const cancel = () => {
    setItems(null);
    setError(null);
  };

  return (
    <div className="mb-3 border border-zinc-900 bg-zinc-950/40 p-3">
      <div className="mb-2 text-[10px] tracking-widest text-zinc-500">
        QUICK LOG · TYPE OR TALK
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void parse();
            }
          }}
          placeholder='e.g. "two eggs and a slice of sourdough toast"'
          rows={2}
          disabled={parsing || saving}
          className="flex-1 resize-none border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none disabled:opacity-60"
        />
        <div className="flex flex-col gap-1">
          {speechAvailable && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={parsing || saving}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              className="border px-2 py-1.5 transition-colors disabled:opacity-30"
              style={{
                color: listening ? "var(--color-red)" : "var(--color-cyan)",
                borderColor: listening
                  ? "color-mix(in oklab, var(--color-red) 50%, transparent)"
                  : "color-mix(in oklab, var(--color-cyan) 50%, transparent)",
              }}
            >
              {listening ? (
                <MicOff className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Mic className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => void parse()}
            disabled={parsing || saving || !text.trim()}
            aria-label="Parse"
            className="border px-2 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              color: "var(--color-amber)",
              borderColor:
                "color-mix(in oklab, var(--color-amber) 50%, transparent)",
            }}
          >
            {parsing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
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

      {items && items.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-zinc-900 pt-3">
          <div className="text-[10px] tracking-widest text-zinc-500">
            CONFIRM &amp; EDIT
          </div>
          {items.map((item, i) => (
            <div
              key={i}
              className="space-y-1 border border-zinc-900 bg-black p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={item.source} />
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      className="min-w-0 flex-1 border-none bg-transparent px-0 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                  {item.qty_text && (
                    <div className="text-[10px] text-zinc-600">
                      {item.qty_text}
                      {item.grams != null && ` · ${item.grams}g`}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-zinc-700 hover:text-[var(--color-red)]"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pl-1">
                <MacroCell
                  value={item.kcal}
                  unit="kcal"
                  color="var(--color-amber)"
                  onChange={(n) => updateItem(i, { kcal: n })}
                />
                <MacroCell
                  value={item.protein_g}
                  unit="P"
                  color="var(--color-emerald)"
                  onChange={(n) => updateItem(i, { protein_g: n })}
                />
                <MacroCell
                  value={item.carbs_g}
                  unit="C"
                  color="var(--color-cyan)"
                  onChange={(n) => updateItem(i, { carbs_g: n })}
                />
                <MacroCell
                  value={item.fat_g}
                  unit="F"
                  color="var(--color-amber)"
                  onChange={(n) => updateItem(i, { fat_g: n })}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="flex-1 border border-zinc-700 py-1.5 text-[10px] tracking-widest text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || items.length === 0}
              className="flex-1 border py-1.5 text-[10px] tracking-widest disabled:opacity-50"
              style={{
                color: "var(--color-amber)",
                borderColor: "var(--color-amber)",
              }}
            >
              {saving
                ? "SAVING…"
                : `LOG ${items.length} ITEM${items.length === 1 ? "" : "S"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
