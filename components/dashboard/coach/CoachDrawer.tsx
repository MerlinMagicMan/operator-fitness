"use client";

import { useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { CoachUI } from "./CoachUI";

export function CoachDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="presentation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-zinc-800 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare
              className="h-3.5 w-3.5"
              style={{ color: "var(--color-cyan)" }}
              aria-hidden
            />
            <span className="text-[10px] tracking-widest text-zinc-400">
              COACH
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <CoachUI
            scrollAreaClassName="min-h-0"
            emptyHint="Coach is on. Ask anything about your training, diet, peptides, or programming."
          />
        </div>
      </div>
    </div>
  );
}
