/**
 * Streak calculation for OPERATOR. A streak is a run of consecutive days
 * with `completed = true` in workouts_completed.
 *
 * Mirrors the artifact's calcStreak logic: the "current" streak only
 * counts if the most-recent completion is today or yesterday — otherwise
 * the streak is broken.
 */

export type StreakResult = {
  current: number;
  longest: number;
};

type StreakInput = {
  date: string;
  completed: boolean;
};

const ISO_DATE_LEN = 10;
const MS_PER_DAY = 86_400_000;

function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, ISO_DATE_LEN);
}

function yesterdayISO(now: Date = new Date()): string {
  return new Date(now.getTime() - MS_PER_DAY)
    .toISOString()
    .slice(0, ISO_DATE_LEN);
}

function daysBetween(aISO: string, bISO: string): number {
  return Math.round(
    (new Date(bISO).getTime() - new Date(aISO).getTime()) / MS_PER_DAY,
  );
}

/**
 * Compute current and longest streaks from workouts_completed rows.
 * Rows where `completed=false` are ignored. Order is irrelevant.
 */
export function calculateStreak(
  rows: StreakInput[],
  now: Date = new Date(),
): StreakResult {
  const dates = rows
    .filter((r) => r.completed)
    .map((r) => r.date)
    .sort();

  if (dates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let running = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const curr = dates[i];
    if (!prev || !curr) continue;
    if (daysBetween(prev, curr) === 1) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 1;
    }
  }

  let current = 0;
  const last = dates[dates.length - 1];
  const today = todayISO(now);
  const yesterday = yesterdayISO(now);
  if (last === today || last === yesterday) {
    current = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const prev = dates[i];
      const next = dates[i + 1];
      if (!prev || !next) break;
      if (daysBetween(prev, next) === 1) current += 1;
      else break;
    }
  }

  return { current, longest };
}
