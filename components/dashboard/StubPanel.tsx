import type { LucideIcon } from "lucide-react";
import { PanelHeader } from "./Primitives";

/**
 * Placeholder used while individual panels are still being ported in
 * follow-up commits. Each tab renders one of these until its real panel
 * lands.
 */
export function StubPanel({
  label,
  icon,
  message,
}: {
  label: string;
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div className="space-y-4 p-4">
      <PanelHeader icon={icon} label={label} />
      <div className="border border-zinc-900 bg-zinc-950 p-6 text-center text-xs text-zinc-500">
        {message}
      </div>
    </div>
  );
}
