import type { LucideIcon } from "lucide-react";
import type { PhaseColor } from "@/lib/operator-constants";

const ACCENT_VAR: Record<PhaseColor, string> = {
  amber: "var(--color-amber)",
  cyan: "var(--color-cyan)",
  emerald: "var(--color-emerald)",
};

export function accentColor(color: PhaseColor): string {
  return ACCENT_VAR[color];
}

/** Compact label/value pair used in the OPERATOR header strip. */
export function Stat({
  label,
  value,
  sub,
  accent,
  subClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: PhaseColor;
  subClassName?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] tracking-widest text-zinc-500">{label}</span>
      <span
        className="text-xs"
        style={accent ? { color: ACCENT_VAR[accent] } : undefined}
      >
        {value}
        {sub && (
          <span className={`ml-2 ${subClassName ?? "text-zinc-500"}`}>
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

/** Section header used at the top of every dashboard panel. */
export function PanelHeader({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-zinc-800 pb-2">
      <Icon
        className="h-3.5 w-3.5"
        style={{ color: "var(--color-amber)" }}
        aria-hidden
      />
      <span className="text-[10px] tracking-widest text-zinc-400">{label}</span>
    </div>
  );
}
