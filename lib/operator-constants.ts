/**
 * OPERATOR program constants — phase plan, peptide protocols, user
 * defaults, and macro math. Pure, no side effects, importable from both
 * server and client.
 */

export type PhaseColor = "amber" | "cyan" | "emerald";
export type PhaseSlug = "foundation" | "recomp" | "performance";

export type DayPrescription = {
  tag: string;
  name: string;
  duration: string;
  target: string;
  blocks: string[];
  cue: string;
};

export type PhaseDef = {
  num: 1 | 2 | 3;
  slug: PhaseSlug;
  name: string;
  weeks: number;
  startWeek: number;
  endWeek: number;
  color: PhaseColor;
  focus: string;
  weightTargetLb: number;
  /** Mon..Sun prescription. Index 0 = Monday. */
  week: [
    DayPrescription,
    DayPrescription,
    DayPrescription,
    DayPrescription,
    DayPrescription,
    DayPrescription,
    DayPrescription,
  ];
};

export const USER_DEFAULTS = {
  ageYears: 38,
  heightInches: 73,
  startWeightLb: 290,
  goalWeightLb: 230,
  /** TDEE multiplier for moderate activity baseline. */
  activityMultiplier: 1.5,
  /** Calorie deficit applied to TDEE for cut targets. */
  cutDeficitKcal: 500,
} as const;

const FOUNDATION_WEEK: PhaseDef["week"] = [
  {
    tag: "Z2",
    name: "Zone 2 Aerobic",
    duration: "60 min",
    target: "HR 130-145 / nasal breathing",
    blocks: [
      "10 min progressive warm-up rower or assault bike",
      "45 min steady-state, conversational pace",
      "5 min cool-down + diaphragmatic breathing",
    ],
    cue: "If you can't speak in full sentences, slow down. Aerobic base lives below threshold.",
  },
  {
    tag: "STR-A",
    name: "Strength A — Lower Hinge",
    duration: "50 min",
    target: "RPE 7",
    blocks: [
      "A: Goblet squat 4x6 — tempo 3-1-1",
      "B: Trap bar RDL 4x6",
      "C1: Push-up or DB bench 3x10",
      "C2: 1-arm DB row 3x10/side",
      "D: Front plank 3x45s + side plank 3x30s/side",
    ],
    cue: "At 290, technique is everything. No grinder reps. Leave 2-3 in the tank.",
  },
  {
    tag: "Z2",
    name: "Zone 2 — Cross-Modal",
    duration: "45 min",
    target: "HR 130-145",
    blocks: [
      "Bike, rower, or ski erg — pick what knees feel best with",
      "Steady, conversational, nasal breathing",
      "Optional: 20 min Z2 + 20 min slow ruck (20-30 lb)",
    ],
    cue: "Mitochondrial density is built here. Boring on purpose.",
  },
  {
    tag: "STR-B",
    name: "Strength B — Posterior + Press",
    duration: "50 min",
    target: "RPE 7-8",
    blocks: [
      "A: Trap bar deadlift 4x5",
      "B: DB split squat 3x8/side",
      "C1: Standing DB press 3x8",
      "C2: Lat pulldown or assisted pull-up 3x10",
      "D: Suitcase carry 3x30 steps/side, heavy",
    ],
    cue: "Carries are non-negotiable. Anti-rotation is what protects your spine.",
  },
  {
    tag: "Z2+",
    name: "Z2 + Mobility",
    duration: "60 min",
    target: "Easy effort",
    blocks: [
      "30 min easy cardio (Z2)",
      "20 min mobility — hips, t-spine, ankles",
      "10 min sauna or contrast shower if available",
    ],
    cue: "Mobility is the unsexy multiplier.",
  },
  {
    tag: "RUCK",
    name: "Long Z2 Ruck",
    duration: "90 min",
    target: "20-30 lb pack, brisk pace",
    blocks: [
      "Outdoor terrain if possible — hills count double",
      "Steady cadence, full foot strike",
      "Hydrate, salt, fuel if > 75 min",
    ],
    cue: "Your knees can ruck before they can run. Build the chassis first.",
  },
  {
    tag: "REST",
    name: "Recovery Walk",
    duration: "30 min",
    target: "Active recovery",
    blocks: [
      "10-15 min walk outside, no headphones",
      "Foam roll major chains",
      "Sleep priority. Lights out by 10:30.",
    ],
    cue: "Recovery is where adaptation happens. Don't be a hero on Sundays.",
  },
];

const RECOMP_WEEK: PhaseDef["week"] = [
  {
    tag: "RUN",
    name: "Easy Run",
    duration: "30-45 min",
    target: "Z2 pace, ~9:30-10:30/mi",
    blocks: [
      "5 min walking warm-up",
      "20-35 min easy run, conversational",
      "5 min walk cooldown + light stretch",
    ],
    cue: "Cadence target 175-180. If pace creeps, walk-run intervals fine.",
  },
  {
    tag: "STR-A",
    name: "Strength A — Squat Day",
    duration: "55 min",
    target: "Strength under fatigue",
    blocks: [
      "A: Back squat 4x5 @ RPE 7-8",
      "B: Bulgarian split squat 3x8/side",
      "C1: Bench press 3x6",
      "C2: Chest-supported row 3x10",
      "D: Hanging knee raise 3x12",
    ],
    cue: "Strength preserves muscle while you cut. Don't skip lifts for runs.",
  },
  {
    tag: "THR",
    name: "Threshold Intervals",
    duration: "45 min",
    target: "Lactate threshold (RPE 8)",
    blocks: [
      "12 min progressive warm-up",
      "5 x 4 min @ threshold / 2 min easy between",
      "(start with bike if running new — transition by week 20)",
      "8 min cooldown",
    ],
    cue: "Threshold is what builds the 6-min mile. Painful but sustainable.",
  },
  {
    tag: "STR-B",
    name: "Strength B — Pull Day",
    duration: "55 min",
    target: "Posterior chain emphasis",
    blocks: [
      "A: Conventional or trap bar deadlift 4x4",
      "B: Pull-up or assisted 4x6-8",
      "C1: Standing OHP 3x6",
      "C2: DB row 3x10/side",
      "D: Loaded carry 3x40 steps",
    ],
    cue: "Pull volume saves your posture once you're running 4x/week.",
  },
  {
    tag: "Z2",
    name: "Z2 Long — Mixed",
    duration: "60-90 min",
    target: "HR 130-145",
    blocks: [
      "Mix of bike + rower or hike",
      "Goal is duration not intensity",
      "Fuel mid-session if > 75 min",
    ],
    cue: "Long Z2 is the cheat code most people skip.",
  },
  {
    tag: "LONG",
    name: "Long Run",
    duration: "45-75 min",
    target: "Z2 conversational pace",
    blocks: [
      "Start at 30 min, build 5 min/week",
      "Easy effort — slowest run of the week",
      "Soft surface preferred",
    ],
    cue: "If anything hurts before 20 min, abort and ruck instead.",
  },
  {
    tag: "REST",
    name: "Recovery",
    duration: "30 min",
    target: "Active recovery",
    blocks: ["Mobility 20 min", "Walk + sun exposure", "Sleep priority"],
    cue: "Adaptation week-over-week requires the rest day. Take it.",
  },
];

const PERFORMANCE_WEEK: PhaseDef["week"] = [
  {
    tag: "SPEED",
    name: "Speed Intervals",
    duration: "55 min",
    target: "VO2max work — RPE 9",
    blocks: [
      "15 min dynamic warm-up + drills (A-skips, strides)",
      "Wk 29-36: 8 x 400m @ goal mile pace, 90s walk",
      "Wk 37-44: 6 x 800m @ 5K pace, 2 min walk",
      "10 min cooldown",
    ],
    cue: "Sub-7 lives here. Hit the splits or shorten the rep — never both slow.",
  },
  {
    tag: "STR+M",
    name: "Strength + Metcon",
    duration: "60 min",
    target: "Power + conditioning",
    blocks: [
      "A: Power clean or KB swing 5x3 (explosive)",
      "B: Front squat 4x5",
      "C: 12-min AMRAP — 10 wall ball / 10 burpees / 200m row",
      "Finisher: 3 x 30s max effort assault bike",
    ],
    cue: "Football engine meets CrossFit. This is where you remember who you are.",
  },
  {
    tag: "THR",
    name: "Threshold — Mile Repeats",
    duration: "60 min",
    target: "Threshold pace (~6:45-7:00)",
    blocks: [
      "15 min warm-up + 4x100m strides",
      "3-5 x 1 mile @ threshold, 90s walk between",
      "10 min cooldown",
    ],
    cue: "These hurt. They should. This is the engine for your goal mile.",
  },
  {
    tag: "STR",
    name: "Strength — Maintenance",
    duration: "45 min",
    target: "Heavy but low volume",
    blocks: [
      "A: Deadlift 3x3 @ RPE 8",
      "B: Bench press 3x5",
      "C: Pull-up 3x6-8",
      "D: Core circuit 3 rounds",
    ],
    cue: "Don't try to PR. You're maintaining strength while running hard.",
  },
  {
    tag: "WOD",
    name: "Mixed Modal WOD",
    duration: "45 min",
    target: "Sustained intensity",
    blocks: [
      "Sample: 5 rounds for time —",
      "  400m run / 15 KB swings / 10 push-ups / 5 pull-ups",
      "Or: 'Murph-lite' — 1 mile / 50 squats / 25 push-ups / 1 mile",
    ],
    cue: "Pace it. Blowing up by round 2 doesn't impress anyone.",
  },
  {
    tag: "LONG",
    name: "Long Run or Hybrid",
    duration: "60-90 min",
    target: "Z2 with strength finisher",
    blocks: [
      "60-75 min Z2 run or hybrid event prep",
      "Optional: 15 min strength finisher post-run",
    ],
    cue: "Endurance ceiling. If goal is sub-7, you need to run 6+ miles easy.",
  },
  {
    tag: "REST",
    name: "Recovery",
    duration: "30 min",
    target: "Active recovery",
    blocks: ["Mobility, sauna, walk, mindset", "Plan next week"],
    cue: "Phase 3 attacks recovery. Nail it.",
  },
];

export const PHASE_PLAN: readonly [PhaseDef, PhaseDef, PhaseDef] = [
  {
    num: 1,
    slug: "foundation",
    name: "FOUNDATION",
    weeks: 12,
    startWeek: 1,
    endWeek: 12,
    color: "amber",
    focus: "Aerobic base, joint resilience, lean mass preservation",
    weightTargetLb: 265,
    week: FOUNDATION_WEEK,
  },
  {
    num: 2,
    slug: "recomp",
    name: "RECOMP",
    weeks: 16,
    startWeek: 13,
    endWeek: 28,
    color: "cyan",
    focus: "Running base, threshold work, body recomposition",
    weightTargetLb: 245,
    week: RECOMP_WEEK,
  },
  {
    num: 3,
    slug: "performance",
    name: "PERFORMANCE",
    weeks: 16,
    startWeek: 29,
    endWeek: 44,
    color: "emerald",
    focus: "Speed, mixed modal, sub-7 mile, final cut to 225-235",
    weightTargetLb: 230,
    week: PERFORMANCE_WEEK,
  },
];

export const PROGRAM_TOTAL_WEEKS = 44;
export const TEST_WEEKS: ReadonlySet<number> = new Set([12, 28, 36, 44]);

export type PhaseInfo = {
  phase: PhaseDef;
  weekNum: number;
  daysIn: number;
  /** Today's day-of-week index (0 = Monday, 6 = Sunday). */
  dayIndex: number;
  pctComplete: number;
  isTestWeek: boolean;
};

/**
 * Compute the program week number, current phase, and today's day index
 * from the program start date (typically profile.created_at).
 */
export function getPhaseInfo(
  startISO: string,
  now: Date = new Date(),
): PhaseInfo {
  const start = new Date(startISO);
  const startUTC = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const daysIn = Math.max(0, Math.floor((nowUTC - startUTC) / 86400000));
  const weekNum = Math.min(PROGRAM_TOTAL_WEEKS, Math.floor(daysIn / 7) + 1);

  const phase =
    weekNum <= 12
      ? PHASE_PLAN[0]
      : weekNum <= 28
        ? PHASE_PLAN[1]
        : PHASE_PLAN[2];

  // JS getDay(): 0=Sun..6=Sat. We want 0=Mon..6=Sun.
  const jsDay = now.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;

  return {
    phase,
    weekNum,
    daysIn,
    dayIndex,
    pctComplete: Math.min(100, (weekNum / PROGRAM_TOTAL_WEEKS) * 100),
    isTestWeek: TEST_WEEKS.has(weekNum),
  };
}

export function getTodayPrescription(info: PhaseInfo): DayPrescription {
  return info.phase.week[info.dayIndex] as DayPrescription;
}

// =============================================================
// Mifflin-St Jeor BMR + macro targets
// =============================================================

export type MacroTargets = {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/**
 * Mifflin-St Jeor BMR for males:
 *   BMR = 10*kg + 6.25*cm - 5*age + 5
 * Then TDEE = BMR * activity, cut = TDEE - deficit.
 * Protein anchored at 1g/lb bodyweight, fat at 27% of calories,
 * carbs from the remainder (clamped non-negative).
 */
export function calcMacroTargets(
  weightLb: number,
  ageYears: number = USER_DEFAULTS.ageYears,
  heightInches: number = USER_DEFAULTS.heightInches,
  activityMultiplier: number = USER_DEFAULTS.activityMultiplier,
  deficitKcal: number = USER_DEFAULTS.cutDeficitKcal,
): MacroTargets {
  const weightKg = weightLb * 0.4536;
  const heightCm = heightInches * 2.54;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5);
  const tdee = Math.round(bmr * activityMultiplier);
  const calories = Math.max(1200, tdee - deficitKcal);
  const proteinG = Math.min(260, Math.round(weightLb));
  const fatG = Math.round((calories * 0.27) / 9);
  const carbsG = Math.max(
    0,
    Math.round((calories - proteinG * 4 - fatG * 9) / 4),
  );
  return { bmr, tdee, calories, proteinG, carbsG, fatG };
}

// =============================================================
// Peptide protocols
// =============================================================

export type PeptideEntry = {
  name: string;
  dose: string;
  frequency: string;
  route: string;
  purpose: string;
};

export type PeptideProtocol = {
  rationale: string;
  stack: PeptideEntry[];
  notes: string[];
};

export const PEPTIDE_PROTOCOLS: Record<1 | 2 | 3, PeptideProtocol> = {
  1: {
    rationale:
      "Phase 1 priority is joint and tendon resilience as a 290-lb body re-introduces training stress. Sleep architecture support compounds recovery.",
    stack: [
      {
        name: "BPC-157",
        dose: "250mcg AM + 250mcg PM",
        frequency: "daily, 4-8 weeks",
        route: "subQ near affected area",
        purpose: "Tendon, ligament, gut, vascular healing",
      },
      {
        name: "TB-500",
        dose: "2-2.5mg",
        frequency: "2x weekly, 4-6 weeks",
        route: "subQ",
        purpose: "Systemic tissue regeneration, anti-inflammatory",
      },
      {
        name: "DSIP",
        dose: "100mcg",
        frequency: "pre-bed PRN",
        route: "subQ",
        purpose: "Sleep architecture, stress modulation",
      },
    ],
    notes: [
      "BPC-157 + TB-500 ('Wolverine') is the classic recovery base.",
      "Run a deload week between cycles.",
      "Focus local injection sites for any nagging knee/hip/back issues.",
    ],
  },
  2: {
    rationale:
      "Phase 2 cuts hardest. Tesamorelin specifically targets visceral fat. GH pulse via IPA+CJC supports recomp without shutting down endogenous production.",
    stack: [
      {
        name: "Tesamorelin",
        dose: "1mg",
        frequency: "AM fasted, 5x/week, 8-12 weeks",
        route: "subQ",
        purpose:
          "Visceral adipose reduction (FDA-approved mechanism for HIV lipo)",
      },
      {
        name: "Ipamorelin + CJC-1295 no-DAC",
        dose: "100mcg + 100mcg",
        frequency: "post-workout, optional pre-bed",
        route: "subQ",
        purpose: "GH pulse — recovery and recomp",
      },
      {
        name: "BPC-157",
        dose: "250mcg",
        frequency: "daily maintenance as needed",
        route: "subQ",
        purpose: "Joint protection as running volume rises",
      },
    ],
    notes: [
      "Tesamorelin requires consistency — skipping doses tanks results. Set alarms.",
      "IPA+CJC saturation dose is 100mcg each; more isn't more.",
      "If running volume spikes, cycle BPC-157 back in for tendons.",
    ],
  },
  3: {
    rationale:
      "Phase 3 is the highest training stress. Recovery peptides cycle hardest, and cognitive support carries the speed/threshold sessions where mental focus matters as much as legs.",
    stack: [
      {
        name: "Ipamorelin + CJC-1295 no-DAC",
        dose: "100mcg + 100mcg",
        frequency: "post-workout, ongoing",
        route: "subQ",
        purpose: "Recovery from speed work",
      },
      {
        name: "BPC-157 + TB-500 (LOGAN)",
        dose: "Cycle on/off in 4-week blocks",
        frequency: "as needed",
        route: "subQ",
        purpose: "Soft tissue stress from intervals/mile repeats",
      },
      {
        name: "Selank or Semax",
        dose: "200-300mcg",
        frequency: "AM or pre-session PRN",
        route: "intranasal",
        purpose: "Cognitive focus, anxiolysis without sedation",
      },
      {
        name: "NAD+",
        dose: "100mg",
        frequency: "1-2x weekly",
        route: "subQ (slow injection)",
        purpose: "Mitochondrial support, recovery",
      },
    ],
    notes: [
      "NAD+ injections sting — go slow or split site.",
      "Semax for big sessions, Selank for general anxiety/regulation.",
      "Don't stack new peptides with PR attempts. Establish baseline first.",
    ],
  },
};

// =============================================================
// Diet guidance copy (per phase)
// =============================================================

export const DIET_GUIDANCE: Record<
  1 | 2 | 3,
  { title: string; bullets: string[]; foods: string[] }
> = {
  1: {
    title: "Foundation — Sustainable Deficit",
    bullets: [
      "500-cal deficit. Don't go aggressive — you'll bonk training.",
      "Protein anchor every meal. 30-50g x 4-5 meals.",
      "Carbs around training. Fat fills gaps.",
      "Whole foods 90/10. No counting if 90% is whole + protein-anchored.",
    ],
    foods: [
      "Eggs",
      "Greek yogurt",
      "lean beef",
      "chicken",
      "salmon",
      "cottage cheese",
      "oats",
      "rice",
      "sweet potato",
      "berries",
      "leafy greens",
      "EVOO",
      "avocado",
      "nuts",
      "kefir",
      "sauerkraut",
    ],
  },
  2: {
    title: "Recomp — Cycled Deficit",
    bullets: [
      "Slightly steeper deficit (~600 cal). Recomp accelerates here.",
      "Protein non-negotiable. 1g/lb of bodyweight minimum.",
      "Carbs cycle: high on threshold/long days, low on rest.",
      "Time-restricted eating window 10-12 hr if helpful for adherence.",
    ],
    foods: [
      "All Phase 1 foods",
      "rice cakes pre-run",
      "BCAA/EAAs intra-workout if fasted",
      "beet juice for nitric oxide",
      "tart cherry pre-bed",
    ],
  },
  3: {
    title: "Performance — Fueled Cuts",
    bullets: [
      "Smaller deficit, fuel the work. You're going hard now.",
      "Protein stays high. 220-240g/day.",
      "Strategic refeeds: 1-2 high-carb days/week supports glycogen.",
      "Hydration + sodium critical for speed work. 4-6g sodium/day.",
    ],
    foods: [
      "All above",
      "intra-workout carbs (Maurten or homemade) for sessions > 60 min",
      "electrolyte loading pre-speed work",
      "post-workout 4:1 carb:protein within 30 min",
    ],
  },
};

export const DAY_NAMES_MON_FIRST = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
