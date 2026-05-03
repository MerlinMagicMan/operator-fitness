"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, FileUp } from "lucide-react";
import type { ProgramArchetype } from "@/lib/programs/types";

const ARCHETYPE_LABELS: Record<ProgramArchetype, string> = {
  bodyweight_mobility: "Bodyweight mobility",
  banded_mobility: "Banded mobility",
  loaded_mobility: "Loaded mobility",
  advanced_loaded_mobility: "Advanced loaded mobility",
  bodyweight_conditioning: "Bodyweight conditioning",
  dynamic_strength: "Dynamic strength",
  functional_sc: "Functional S&C",
  custom: "Custom",
};

const ARCHETYPES = Object.keys(ARCHETYPE_LABELS) as ProgramArchetype[];

const MAX_PDF_BYTES = 32 * 1024 * 1024;

export function ImportProgramModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [programName, setProgramName] = useState("");
  const [archetype, setArchetype] = useState<ProgramArchetype | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setProgramName("");
      setArchetype("");
      setNotes("");
      setError(null);
      setSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Pick a PDF first.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError(
        `PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB; max is 32 MB.`,
      );
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("file", file);
    if (programName.trim()) fd.append("program_name", programName.trim());
    if (archetype) fd.append("archetype", archetype);
    if (notes.trim()) fd.append("notes", notes.trim());

    try {
      const res = await fetch("/api/coach/import-program-pdf", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Request failed with ${res.status}`);
        setSubmitting(false);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

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
            className="flex items-center gap-2 text-xs font-bold tracking-widest"
            style={{ color: "var(--color-cyan)" }}
          >
            <FileUp className="h-3 w-3" aria-hidden />
            IMPORT PROGRAM PDF
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

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              PDF FILE (max 32 MB)
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-zinc-300 file:mr-3 file:border file:border-zinc-700 file:bg-black file:px-3 file:py-1.5 file:text-[10px] file:tracking-widest file:text-zinc-300 hover:file:border-zinc-500"
            />
            {file && (
              <span className="mt-1 block text-[10px] text-zinc-500">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              PROGRAM NAME (optional override)
            </span>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="leave blank to use the title from the PDF"
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-cyan)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              ARCHETYPE HINT (optional)
            </span>
            <select
              value={archetype}
              onChange={(e) =>
                setArchetype(e.target.value as ProgramArchetype | "")
              }
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-cyan)] focus:outline-none"
            >
              <option value="">(let the importer decide)</option>
              {ARCHETYPES.map((a) => (
                <option key={a} value={a}>
                  {ARCHETYPE_LABELS[a]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              NOTES (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="anything the parser should know — e.g. 'use the Tuesday/Thursday/Saturday schedule'"
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-cyan)] focus:outline-none"
            />
          </label>

          {error && (
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
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 border border-zinc-700 py-2 text-xs tracking-widest text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting || !file}
              className="flex-1 border py-2 text-xs tracking-widest disabled:opacity-50"
              style={{
                borderColor: "var(--color-cyan)",
                color: "var(--color-cyan)",
              }}
            >
              {submitting ? "PARSING…" : "IMPORT"}
            </button>
          </div>
          {submitting && (
            <p className="text-[10px] text-zinc-500">
              Reading the PDF. Long programs may take 60-120 seconds.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
