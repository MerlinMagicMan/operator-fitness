"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { logMeal } from "@/app/actions/log-meal";
import type { ActionResult } from "@/lib/operator-types";

function FieldRow({
  label,
  name,
  type = "text",
  placeholder,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={step}
        className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
      />
    </label>
  );
}

export function DietLogModal({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(logMeal, null);

  useEffect(() => {
    if (state && "success" in state) onClose();
  }, [state, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const errorMsg = state && "error" in state ? state.error : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md space-y-3 border border-zinc-800 bg-zinc-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "var(--color-amber)" }}
          >
            LOG MEAL
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="date" value={defaultDate} />
          <FieldRow
            label="MEAL / FOOD"
            name="meal"
            placeholder="e.g. 6oz chicken + rice + veg"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldRow
              label="CALORIES"
              name="calories"
              type="number"
              placeholder="kcal"
            />
            <FieldRow
              label="PROTEIN (g)"
              name="protein_g"
              type="number"
              step="0.1"
            />
            <FieldRow
              label="CARBS (g)"
              name="carbs_g"
              type="number"
              step="0.1"
            />
            <FieldRow label="FAT (g)" name="fat_g" type="number" step="0.1" />
          </div>

          {errorMsg && (
            <div
              className="border px-2 py-1.5 text-[11px]"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--color-red) 10%, transparent)",
                borderColor:
                  "color-mix(in oklab, var(--color-red) 30%, transparent)",
                color: "var(--color-red)",
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-zinc-700 py-2 text-xs tracking-widest text-zinc-400 hover:text-zinc-200"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 border py-2 text-xs tracking-widest disabled:opacity-50"
              style={{
                borderColor: "var(--color-amber)",
                color: "var(--color-amber)",
              }}
            >
              {pending ? "SAVING…" : "SAVE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
