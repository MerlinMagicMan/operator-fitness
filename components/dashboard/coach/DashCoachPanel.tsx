"use client";

import { CoachUI } from "./CoachUI";

/** Inline coach panel rendered as the third column on the DASH tab. */
export function DashCoachPanel() {
  return <CoachUI scrollAreaClassName="min-h-[300px] max-h-[500px]" />;
}
