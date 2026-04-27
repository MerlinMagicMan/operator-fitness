import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { Activity, Target, Zap, MessageSquare, Plus, Send, Check, Flame, Dumbbell, Footprints, Mountain, Heart, Loader2, ChevronRight, RefreshCw, LayoutDashboard, CalendarDays, Apple, Pill, Upload, X, AlertTriangle, Clock, MapPin } from "lucide-react";

const PHASES = [
  { num: 1, name: "FOUNDATION", weeks: 12, color: "amber", focus: "Aerobic base, joint resilience, lean mass preservation", weightTarget: 265 },
  { num: 2, name: "RECOMP", weeks: 16, color: "cyan", focus: "Running base, threshold work, body recomposition", weightTarget: 245 },
  { num: 3, name: "PERFORMANCE", weeks: 16, color: "emerald", focus: "Speed, mixed modal, sub-7 mile, final cut to 225-235", weightTarget: 230 },
];

const TEMPLATES = {
  1: {
    1: { tag: "Z2", name: "Zone 2 Aerobic", icon: Heart, duration: "45-60 min", target: "HR 130-145 / Nasal breathing", blocks: ["10 min progressive warm-up rower or assault bike", "35-50 min steady-state, conversational pace", "5 min cool-down + diaphragmatic breathing"], cue: "If you can't speak in full sentences, slow down. Aerobic base lives below threshold." },
    2: { tag: "STR-A", name: "Strength A — Lower Hinge", icon: Dumbbell, duration: "50 min", target: "RPE 7", blocks: ["A: Goblet squat 4x6 — tempo 3-1-1", "B: Trap bar RDL 4x6", "C1: Push-up or DB bench 3x10", "C2: 1-arm DB row 3x10/side", "D: Front plank 3x45s + side plank 3x30s/side"], cue: "At 290, technique is everything. No grinder reps. Leave 2-3 in the tank." },
    3: { tag: "Z2", name: "Zone 2 — Cross-Modal", icon: Heart, duration: "45-60 min", target: "HR 130-145", blocks: ["Bike, rower, or ski erg — pick what knees feel best with", "Steady, conversational, nasal breathing", "Optional: 20 min Z2 + 20 min slow ruck (20-30 lb)"], cue: "Mitochondrial density is built here. Boring on purpose." },
    4: { tag: "STR-B", name: "Strength B — Posterior + Press", icon: Dumbbell, duration: "50 min", target: "RPE 7-8", blocks: ["A: Trap bar deadlift 4x5", "B: DB split squat 3x8/side", "C1: Standing DB press 3x8", "C2: Lat pulldown or assisted pull-up 3x10", "D: Suitcase carry 3x30 steps/side, heavy"], cue: "Carries are non-negotiable. Anti-rotation is what protects your spine." },
    5: { tag: "Z2+", name: "Z2 + Mobility", icon: Footprints, duration: "60 min", target: "Easy effort", blocks: ["30 min easy cardio (Z2)", "20 min mobility — hips, t-spine, ankles", "10 min sauna or contrast shower if available"], cue: "Mobility is the unsexy multiplier. Vernon Griffith protocol." },
    6: { tag: "RUCK", name: "Long Ruck", icon: Mountain, duration: "60-90 min", target: "20-30 lb pack, brisk pace", blocks: ["Outdoor terrain if possible — hills count double", "Steady cadence, full foot strike", "Hydrate, salt, fuel if > 75 min"], cue: "Your knees can ruck before they can run. Build the chassis first." },
    7: { tag: "REST", name: "Recovery", icon: RefreshCw, duration: "30 min", target: "Active recovery", blocks: ["10-15 min walk outside, no headphones", "Foam roll major chains", "Sleep priority. Lights out by 10:30."], cue: "Recovery is where adaptation happens. Don't be a hero on Sundays." },
  },
  2: {
    1: { tag: "RUN", name: "Easy Run", icon: Footprints, duration: "30-45 min", target: "Z2 pace, ~9:30-10:30/mi", blocks: ["5 min walking warm-up", "20-35 min easy run, conversational", "5 min walk cooldown + light stretch"], cue: "Cadence target 175-180. If pace creeps, walk-run intervals fine." },
    2: { tag: "STR-A", name: "Strength A — Squat Day", icon: Dumbbell, duration: "55 min", target: "Strength under fatigue", blocks: ["A: Back squat 4x5 @ RPE 7-8", "B: Bulgarian split squat 3x8/side", "C1: Bench press 3x6", "C2: Chest-supported row 3x10", "D: Hanging knee raise 3x12"], cue: "Strength preserves muscle while you cut. Don't skip lifts for runs." },
    3: { tag: "THR", name: "Threshold Intervals", icon: Zap, duration: "45 min", target: "Lactate threshold (RPE 8)", blocks: ["12 min progressive warm-up", "5 x 4 min @ threshold / 2 min easy between", "(start with bike if running new — transition by week 20)", "8 min cooldown"], cue: "Threshold is what builds the 6-min mile. Painful but sustainable." },
    4: { tag: "STR-B", name: "Strength B — Pull Day", icon: Dumbbell, duration: "55 min", target: "Posterior chain emphasis", blocks: ["A: Conventional or trap bar deadlift 4x4", "B: Pull-up or assisted 4x6-8", "C1: Standing OHP 3x6", "C2: DB row 3x10/side", "D: Loaded carry 3x40 steps"], cue: "Pull volume saves your posture once you're running 4x/week." },
    5: { tag: "Z2", name: "Z2 Long — Mixed", icon: Heart, duration: "60-90 min", target: "HR 130-145", blocks: ["Mix of bike + rower or hike", "Goal is duration not intensity", "Fuel mid-session if > 75 min"], cue: "Long Z2 is the cheat code most people skip." },
    6: { tag: "LONG", name: "Long Run", icon: Footprints, duration: "45-75 min", target: "Z2 conversational pace", blocks: ["Start at 30 min, build 5 min/week", "Easy effort — slowest run of the week", "Soft surface preferred"], cue: "If anything hurts before 20 min, abort and ruck instead." },
    7: { tag: "REST", name: "Recovery", icon: RefreshCw, duration: "30 min", target: "Active recovery", blocks: ["Mobility 20 min", "Walk + sun exposure", "Sleep priority"], cue: "Adaptation week-over-week requires the rest day. Take it." },
  },
  3: {
    1: { tag: "SPEED", name: "Speed Intervals", icon: Zap, duration: "55 min", target: "VO2max work — RPE 9", blocks: ["15 min dynamic warm-up + drills (A-skips, strides)", "Wk 29-36: 8 x 400m @ goal mile pace, 90s walk", "Wk 37-44: 6 x 800m @ 5K pace, 2 min walk", "10 min cooldown"], cue: "Sub-7 lives here. Hit the splits or shorten the rep — never both slow." },
    2: { tag: "STR+M", name: "Strength + Metcon", icon: Flame, duration: "60 min", target: "Power + conditioning", blocks: ["A: Power clean or KB swing 5x3 (explosive)", "B: Front squat 4x5", "C: 12-min AMRAP — 10 wall ball / 10 burpees / 200m row", "Finisher: 3 x 30s max effort assault bike"], cue: "Football engine meets CrossFit. This is where you remember who you are." },
    3: { tag: "THR", name: "Threshold — Mile Repeats", icon: Footprints, duration: "60 min", target: "Threshold pace (~6:45-7:00)", blocks: ["15 min warm-up + 4x100m strides", "3-5 x 1 mile @ threshold, 90s walk between", "10 min cooldown"], cue: "These hurt. They should. This is the engine for your goal mile." },
    4: { tag: "STR", name: "Strength — Maintenance", icon: Dumbbell, duration: "45 min", target: "Heavy but low volume", blocks: ["A: Deadlift 3x3 @ RPE 8", "B: Bench press 3x5", "C: Pull-up 3x6-8", "D: Core circuit 3 rounds"], cue: "Don't try to PR. You're maintaining strength while running hard." },
    5: { tag: "WOD", name: "Mixed Modal WOD", icon: Flame, duration: "45 min", target: "Sustained intensity", blocks: ["Sample: 5 rounds for time —", "  400m run / 15 KB swings / 10 push-ups / 5 pull-ups", "Or: 'Murph-lite' — 1 mile / 50 squats / 25 push-ups / 1 mile"], cue: "Pace it. Blowing up by round 2 doesn't impress anyone." },
    6: { tag: "LONG", name: "Long Run or Hybrid", icon: Footprints, duration: "60-90 min", target: "Z2 with strength finisher", blocks: ["60-75 min Z2 run or hybrid event prep", "Optional: 15 min strength finisher post-run"], cue: "Endurance ceiling. If goal is sub-7, you need to run 6+ miles easy." },
    7: { tag: "REST", name: "Recovery", icon: RefreshCw, duration: "30 min", target: "Active recovery", blocks: ["Mobility, sauna, walk, mindset", "Plan next week"], cue: "Phase 3 attacks recovery. Nail it." },
  },
};

const PEPTIDE_PROTOCOLS = {
  1: {
    rationale: "Phase 1 priority is joint and tendon resilience as a 290-lb body re-introduces training stress. Sleep architecture support compounds recovery.",
    stack: [
      { name: "BPC-157", dose: "250mcg AM + 250mcg PM", route: "subQ, near affected area", duration: "4-8 weeks", purpose: "Tendon, ligament, gut, vascular healing" },
      { name: "TB-500", dose: "2-2.5mg twice weekly", route: "subQ", duration: "4-6 weeks", purpose: "Systemic tissue regeneration, anti-inflammatory" },
      { name: "DSIP", dose: "100mcg pre-bed", route: "subQ", duration: "ongoing PRN", purpose: "Sleep architecture, stress modulation" },
    ],
    notes: ["BPC-157 + TB-500 ('Wolverine') is the classic recovery base — Mighty Warrior sells it as LOGAN.", "Run a deload week between cycles.", "Focus local injection sites for any nagging knee/hip/back issues."],
  },
  2: {
    rationale: "Phase 2 cuts hardest. Tesamorelin specifically targets visceral fat — the stubborn tier ex-football guys carry. GH pulse via IPA+CJC supports recomp without shutting down endogenous production.",
    stack: [
      { name: "Tesamorelin", dose: "1mg subQ", route: "AM fasted, 5x/week", duration: "8-12 weeks", purpose: "Visceral adipose reduction (FDA-approved mechanism for HIV lipo)" },
      { name: "Ipamorelin + CJC-1295 no-DAC", dose: "100mcg + 100mcg", route: "subQ post-workout, optional pre-bed", duration: "ongoing in cycles", purpose: "GH pulse — recovery and recomp" },
      { name: "BPC-157", dose: "maintenance 250mcg/day", route: "subQ", duration: "as needed", purpose: "Joint protection as running volume rises" },
    ],
    notes: ["Tesa requires consistency — skipping doses tanks results. Set alarms.", "IPA+CJC saturation dose is 100mcg each; more isn't more.", "If running volume spikes, cycle BPC-157 back in for tendons."],
  },
  3: {
    rationale: "Phase 3 is the highest training stress. Recovery peptides cycle hardest, and cognitive support carries the speed/threshold sessions where mental focus matters as much as legs.",
    stack: [
      { name: "Ipamorelin + CJC-1295 no-DAC", dose: "100mcg + 100mcg post-workout", route: "subQ", duration: "ongoing", purpose: "Recovery from speed work" },
      { name: "BPC-157 + TB-500 (LOGAN)", dose: "Cycle on/off in 4-week blocks", route: "subQ", duration: "as needed", purpose: "Soft tissue stress from intervals/mile repeats" },
      { name: "Selank or Semax", dose: "200-300mcg intranasal", route: "intranasal AM/pre-session", duration: "PRN", purpose: "Cognitive focus, anxiolysis without sedation" },
      { name: "NAD+", dose: "100mg subQ 1-2x/week", route: "subQ (slow injection)", duration: "ongoing", purpose: "Mitochondrial support, recovery" },
    ],
    notes: ["NAD+ injections sting — go slow or split site.", "Semax for big sessions, Selank for general anxiety/regulation.", "Don't stack new peptides with PR attempts. Establish baseline first."],
  },
};

const DIET_GUIDANCE = {
  1: { title: "Foundation — Sustainable Deficit", bullets: ["500-cal deficit. Don't go aggressive — you'll bonk training.", "Protein anchor every meal. 30-50g x 4-5 meals.", "Carbs around training. Fat fills gaps.", "Whole foods 90/10. No counting if 90% is whole + protein-anchored."], foods: ["Eggs", "Greek yogurt", "lean beef", "chicken", "salmon", "cottage cheese", "oats", "rice", "sweet potato", "berries", "leafy greens", "EVOO", "avocado", "nuts", "kefir", "sauerkraut"] },
  2: { title: "Recomp — Cycled Deficit", bullets: ["Slightly steeper deficit (~600 cal). Recomp accelerates here.", "Protein non-negotiable. 1g/lb of bodyweight minimum.", "Carbs cycle: high on threshold/long days, low on rest.", "Time-restricted eating window 10-12 hr if helpful for adherence."], foods: ["All Phase 1 foods", "rice cakes pre-run", "BCAA/EAAs intra-workout if fasted", "beet juice for nitric oxide", "tart cherry pre-bed"] },
  3: { title: "Performance — Fueled Cuts", bullets: ["Smaller deficit, fuel the work. You're going hard now.", "Protein stays high. 220-240g/day.", "Strategic refeeds: 1-2 high-carb days/week supports glycogen.", "Hydration + sodium critical for speed work. 4-6g sodium/day."], foods: ["All above", "intra-workout carbs (Maurten or homemade) for sessions > 60 min", "electrolyte loading pre-speed work", "post-workout 4:1 carb:protein within 30 min"] },
};

function calculateDietTargets(weight, age, phaseNum, heightInches = 72) {
  const heightCm = heightInches * 2.54;
  const weightKg = weight * 0.4536;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const activityMult = phaseNum === 1 ? 1.5 : phaseNum === 2 ? 1.65 : 1.75;
  const tdee = Math.round(bmr * activityMult);
  const deficit = phaseNum === 1 ? 500 : phaseNum === 2 ? 600 : 500;
  const calories = tdee - deficit;
  const protein = Math.min(250, Math.round(weight * 1.0));
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { tdee, calories, protein, carbs, fat };
}

const DEFAULT_STATE = {
  profile: { startDate: new Date().toISOString().slice(0, 10), startWeight: 290, targetWeight: 230, age: 38, height: 72 },
  metrics: [], workoutsCompleted: {}, chat: [], importedWorkouts: [], dietLog: [], dietTargetsOverride: null,
};
const STORAGE_KEY = "operator-state-v2";

const dayName = (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];
const fmtDate = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}`; };

const computeProgress = (profile) => {
  const start = new Date(profile.startDate);
  const now = new Date();
  const daysIn = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  const week = Math.floor(daysIn / 7) + 1;
  const phaseNum = week <= 12 ? 1 : week <= 28 ? 2 : 3;
  const phase = PHASES[phaseNum - 1];
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  return { daysIn, week, phaseNum, phase, dow };
};

const getWeekStartISO = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const calcStreak = (workoutsCompleted) => {
  const dates = Object.keys(workoutsCompleted).filter((d) => workoutsCompleted[d]).sort();
  if (dates.length === 0) return { current: 0, longest: 0 };
  let longest = 1, running = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.round((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
    if (diff === 1) { running++; longest = Math.max(longest, running); } else running = 1;
  }
  let current = 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  const yKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dates[dates.length - 1] === todayKey || dates[dates.length - 1] === yKey) {
    current = 1;
    for (let i = dates.length - 2; i >= 0; i--) {
      const diff = Math.round((new Date(dates[i + 1]) - new Date(dates[i])) / 86400000);
      if (diff === 1) current++; else break;
    }
  }
  return { current, longest };
};

const parseGPX = (xmlText) => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const trks = doc.getElementsByTagName("trk");
  const results = [];
  for (let trk of trks) {
    const name = trk.getElementsByTagName("name")[0]?.textContent || "Run";
    const points = trk.getElementsByTagName("trkpt");
    if (points.length === 0) continue;
    const times = [], hrs = [], coords = [];
    for (let pt of points) {
      const t = pt.getElementsByTagName("time")[0]?.textContent;
      if (t) times.push(new Date(t));
      const all = pt.getElementsByTagName("*");
      for (let el of all) {
        const tag = el.tagName.toLowerCase();
        if (tag === "hr" || tag.endsWith(":hr")) {
          const v = parseInt(el.textContent);
          if (!isNaN(v)) { hrs.push(v); break; }
        }
      }
      coords.push([parseFloat(pt.getAttribute("lat")), parseFloat(pt.getAttribute("lon"))]);
    }
    const startTime = times[0], endTime = times[times.length - 1];
    const durationMin = startTime && endTime ? (endTime - startTime) / 60000 : 0;
    let distKm = 0;
    for (let i = 1; i < coords.length; i++) {
      const [la1, lo1] = coords[i - 1], [la2, lo2] = coords[i];
      if (isNaN(la1) || isNaN(la2)) continue;
      const R = 6371, dLat = (la2 - la1) * Math.PI / 180, dLon = (lo2 - lo1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      distKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    results.push({
      id: `gpx_${startTime?.getTime() || Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: "GPX", name,
      date: startTime?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
      sport: name.toLowerCase().includes("run") ? "Run" : "Activity",
      duration: Math.round(durationMin * 10) / 10,
      distance: Math.round(distKm * 0.621371 * 100) / 100,
      avgHR: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
      maxHR: hrs.length ? Math.max(...hrs) : null,
      calories: null,
    });
  }
  return results;
};

const parseTCX = (xmlText) => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const activities = doc.getElementsByTagName("Activity");
  const results = [];
  for (let act of activities) {
    const sport = act.getAttribute("Sport") || "Other";
    const id = act.getElementsByTagName("Id")[0]?.textContent;
    const laps = act.getElementsByTagName("Lap");
    let totalSec = 0, totalMeters = 0, totalCal = 0, hrSum = 0, hrCount = 0, maxHR = 0;
    for (let lap of laps) {
      totalSec += parseFloat(lap.getElementsByTagName("TotalTimeSeconds")[0]?.textContent || 0);
      totalMeters += parseFloat(lap.getElementsByTagName("DistanceMeters")[0]?.textContent || 0);
      totalCal += parseFloat(lap.getElementsByTagName("Calories")[0]?.textContent || 0);
      const avg = lap.getElementsByTagName("AverageHeartRateBpm")[0]?.getElementsByTagName("Value")[0]?.textContent;
      const max = lap.getElementsByTagName("MaximumHeartRateBpm")[0]?.getElementsByTagName("Value")[0]?.textContent;
      if (avg) { hrSum += parseFloat(avg); hrCount++; }
      if (max) maxHR = Math.max(maxHR, parseFloat(max));
    }
    results.push({
      id: `tcx_${id || Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: "TCX", name: sport, date: id ? id.slice(0, 10) : new Date().toISOString().slice(0, 10),
      sport, duration: Math.round((totalSec / 60) * 10) / 10,
      distance: Math.round(totalMeters * 0.000621371 * 100) / 100,
      avgHR: hrCount ? Math.round(hrSum / hrCount) : null, maxHR: maxHR || null, calories: totalCal || null,
    });
  }
  return results;
};

const parseCSV = (text) => {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  const findIdx = (...names) => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  const dateIdx = findIdx("date", "starttime");
  const sportIdx = findIdx("sport", "type", "activity");
  const durIdx = findIdx("duration", "time", "moving");
  const distIdx = findIdx("distance");
  const hrIdx = findIdx("hr", "heart");
  const calIdx = findIdx("calorie", "kcal", "energy");
  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map(c => c.trim());
    return {
      id: `csv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      source: "CSV",
      name: (sportIdx >= 0 ? cols[sportIdx] : null) || "Workout",
      date: (dateIdx >= 0 ? cols[dateIdx] : "")?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      sport: (sportIdx >= 0 ? cols[sportIdx] : null) || "Other",
      duration: durIdx >= 0 ? parseFloat(cols[durIdx]) || 0 : 0,
      distance: distIdx >= 0 ? parseFloat(cols[distIdx]) || 0 : 0,
      avgHR: hrIdx >= 0 ? parseFloat(cols[hrIdx]) || null : null,
      maxHR: null,
      calories: calIdx >= 0 ? parseFloat(cols[calIdx]) || null : null,
    };
  }).filter(w => w.duration > 0 || w.distance > 0);
};

export default function Operator() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState("dash");
  const [logOpen, setLogOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result?.value) setState({ ...DEFAULT_STATE, ...JSON.parse(result.value) });
      } catch (e) {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    (async () => { try { await window.storage.set(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} })();
  }, [state, hydrated]);

  const { daysIn, week, phaseNum, phase, dow } = computeProgress(state.profile);
  const weeksTotal = 44;
  const pctComplete = Math.min(100, (week / weeksTotal) * 100);
  const today = TEMPLATES[phaseNum][dow];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDone = state.workoutsCompleted[todayKey];
  const latestWeight = state.metrics.length > 0 ? state.metrics[state.metrics.length - 1].weight : state.profile.startWeight;
  const weightDelta = state.profile.startWeight - latestWeight;
  const streak = calcStreak(state.workoutsCompleted);
  const isTestWeek = [12, 28, 36, 44].includes(week);

  const update = (fn) => setState((s) => fn(s));
  const markComplete = () => update((s) => ({ ...s, workoutsCompleted: { ...s.workoutsCompleted, [todayKey]: true } }));
  const addMetric = (entry) => update((s) => ({ ...s, metrics: [...s.metrics.filter((m) => m.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date)) }));
  const addChatMessage = (msg) => update((s) => ({ ...s, chat: [...s.chat, msg] }));
  const addImportedWorkouts = (list) => update((s) => ({ ...s, importedWorkouts: [...s.importedWorkouts, ...list] }));
  const removeImportedWorkout = (id) => update((s) => ({ ...s, importedWorkouts: s.importedWorkouts.filter(w => w.id !== id) }));
  const addDietEntry = (entry) => update((s) => ({ ...s, dietLog: [...s.dietLog, { ...entry, id: Date.now() + Math.random() }] }));
  const removeDietEntry = (id) => update((s) => ({ ...s, dietLog: s.dietLog.filter(e => e.id !== id) }));
  const resetAll = () => {
    if (confirm("Reset all data? This wipes everything.")) {
      setState({ ...DEFAULT_STATE, profile: { ...DEFAULT_STATE.profile, startDate: new Date().toISOString().slice(0, 10) } });
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>;
  }

  const coachContext = {
    phaseNum, phase, week, latestWeight,
    targetWeight: state.profile.targetWeight, startWeight: state.profile.startWeight,
    today: today.name, recentMetrics: state.metrics.slice(-5),
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono text-sm">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="px-4 py-2 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 animate-pulse" />
            <span className="text-amber-500 font-bold tracking-widest text-xs">OPERATOR</span>
          </div>
          <div className="text-zinc-700">│</div>
          <Stat label="PHASE" value={`${phaseNum} ${phase.name}`} accent={phase.color} />
          <Stat label="WEEK" value={`${week}/${weeksTotal}`} />
          <Stat label="DAY" value={`${dayName(new Date().getDay())} D${daysIn + 1}`} />
          <Stat label="WEIGHT" value={`${latestWeight} → ${state.profile.targetWeight}`}
            sub={weightDelta > 0 ? `−${weightDelta.toFixed(1)} lb` : weightDelta < 0 ? `+${Math.abs(weightDelta).toFixed(1)} lb` : "—"}
            subColor={weightDelta > 0 ? "text-emerald-400" : "text-red-400"} />
          <Stat label="STREAK" value={`${streak.current}d`} sub={streak.longest > streak.current ? `pr ${streak.longest}` : ""} />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500">{pctComplete.toFixed(0)}%</span>
            <button onClick={resetAll} className="text-xs text-zinc-600 hover:text-red-400" title="Reset all data"><RefreshCw className="w-3 h-3" /></button>
          </div>
        </div>
        <div className="h-px bg-zinc-900"><div className={`h-full bg-${phase.color}-500 transition-all`} style={{ width: `${pctComplete}%` }} /></div>
      </header>

      <TabNav tab={tab} setTab={setTab} onCoachOpen={() => setCoachOpen(true)} />

      {isTestWeek && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-xs text-amber-300">
          <AlertTriangle className="w-3 h-3" />
          <span>TEST WEEK — retest mile time, body fat, key lifts. Establish baseline before phase change.</span>
        </div>
      )}

      {tab === "dash" && <DashboardView state={state} today={today} todayDone={todayDone} phase={phase} markComplete={markComplete} addChatMessage={addChatMessage} onLog={() => setLogOpen(true)} coachContext={coachContext} />}
      {tab === "weekly" && <WeeklyRollup state={state} week={week} />}
      {tab === "diet" && <DietPanel state={state} latestWeight={latestWeight} phaseNum={phaseNum} addDietEntry={addDietEntry} removeDietEntry={removeDietEntry} />}
      {tab === "peptides" && <PeptidePanel phaseNum={phaseNum} />}
      {tab === "import" && <ImportPanel imports={state.importedWorkouts} addImported={addImportedWorkouts} removeImported={removeImportedWorkout} />}

      <PhaseStrip current={phaseNum} week={week} />

      {logOpen && <LogModal onClose={() => setLogOpen(false)} onSubmit={(e) => { addMetric(e); setLogOpen(false); }} lastWeight={latestWeight} />}
      {coachOpen && <CoachDrawer onClose={() => setCoachOpen(false)} chat={state.chat} onAdd={addChatMessage} context={coachContext} />}
    </div>
  );
}

function DashboardView({ state, today, todayDone, phase, markComplete, addChatMessage, onLog, coachContext }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-900">
      <section className="lg:col-span-5 bg-black p-4">
        <PanelHeader icon={Target} label="TODAY'S OPERATION" />
        <TodayCard workout={today} completed={todayDone} onComplete={markComplete} phaseColor={phase.color} />
      </section>
      <section className="lg:col-span-3 bg-black p-4">
        <PanelHeader icon={Activity} label="METRICS" />
        <MetricsPanel state={state} onLog={onLog} />
      </section>
      <section className="lg:col-span-4 bg-black p-4 min-h-[500px] flex flex-col">
        <PanelHeader icon={MessageSquare} label="COACH" />
        <CoachPanel chat={state.chat} onAdd={addChatMessage} context={coachContext} />
      </section>
    </div>
  );
}

function WeeklyRollup({ state, week }) {
  const weekStart = getWeekStartISO();
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }
  const completedThisWeek = weekDates.filter(d => state.workoutsCompleted[d]).length;
  const importsThisWeek = state.importedWorkouts.filter(w => weekDates.includes(w.date));
  const totalDuration = importsThisWeek.reduce((a, w) => a + (w.duration || 0), 0);
  const totalDistance = importsThisWeek.reduce((a, w) => a + (w.distance || 0), 0);
  const totalCalories = importsThisWeek.reduce((a, w) => a + (w.calories || 0), 0);
  const metricsThisWeek = state.metrics.filter(m => weekDates.includes(m.date));
  const startWeight = metricsThisWeek[0]?.weight;
  const endWeight = metricsThisWeek[metricsThisWeek.length - 1]?.weight;
  const sleepEntries = metricsThisWeek.filter(m => m.sleep).map(m => m.sleep);
  const avgSleep = sleepEntries.length ? (sleepEntries.reduce((a, b) => a + b, 0) / sleepEntries.length).toFixed(1) : null;
  const workoutCompliance = Math.min(100, (completedThisWeek / 6) * 100);
  const metricCompliance = Math.min(100, (metricsThisWeek.length / 4) * 100);
  const overallCompliance = Math.round((workoutCompliance + metricCompliance) / 2);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PanelHeader icon={CalendarDays} label={`WEEK ${week} ROLLUP`} />
        <span className="text-[10px] text-zinc-500 tracking-widest">{weekStart} → {weekDates[6]}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-900">
        <BigStat label="WORKOUTS" value={`${completedThisWeek}/6`} sub={`${Math.round(workoutCompliance)}% compliance`} color="amber" />
        <BigStat label="TRAIN TIME" value={`${Math.round(totalDuration)}m`} sub={importsThisWeek.length > 0 ? `${importsThisWeek.length} sessions` : "no imports"} color="cyan" />
        <BigStat label="MILES" value={totalDistance.toFixed(1)} sub={totalCalories ? `${Math.round(totalCalories)} kcal` : ""} color="emerald" />
        <BigStat label="COMPLIANCE" value={`${overallCompliance}%`} sub={overallCompliance >= 80 ? "on track" : overallCompliance >= 60 ? "shaky" : "regroup"} color={overallCompliance >= 80 ? "emerald" : overallCompliance >= 60 ? "amber" : "red"} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-900">
        <div className="bg-black p-4">
          <div className="text-[10px] text-zinc-500 tracking-widest mb-3">DAILY COMPLETION</div>
          <div className="flex items-end gap-2 h-28">
            {weekDates.map((d, i) => {
              const done = state.workoutsCompleted[d];
              const isToday = d === new Date().toISOString().slice(0, 10);
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full transition-all ${done ? "bg-emerald-500" : "bg-zinc-800"} ${isToday ? "ring-1 ring-amber-500" : ""}`} style={{ height: done ? "80%" : "20%" }} />
                  <span className={`text-[10px] ${isToday ? "text-amber-400" : "text-zinc-500"}`}>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-black p-4 space-y-2">
          <div className="text-[10px] text-zinc-500 tracking-widest mb-3">BODY METRICS</div>
          <RollupRow label="Start of week" value={startWeight ? `${startWeight} lb` : "—"} />
          <RollupRow label="Latest" value={endWeight ? `${endWeight} lb` : "—"} />
          <RollupRow label="Δ this week" value={startWeight && endWeight ? `${endWeight - startWeight > 0 ? "+" : ""}${(endWeight - startWeight).toFixed(1)} lb` : "—"} color={startWeight && endWeight ? (endWeight - startWeight < 0 ? "text-emerald-400" : "text-red-400") : "text-zinc-500"} />
          <RollupRow label="Avg sleep" value={avgSleep ? `${avgSleep} h` : "—"} />
          <RollupRow label="Logs" value={`${metricsThisWeek.length} entries`} />
        </div>
      </div>
      <div className="bg-black p-4 border border-zinc-900">
        <div className="text-[10px] text-zinc-500 tracking-widest mb-3">IMPORTED ACTIVITY THIS WEEK</div>
        {importsThisWeek.length === 0 ? (
          <div className="text-xs text-zinc-600 text-center py-4">No imports this week. Upload from Garmin/Suunto on the IMPORT tab.</div>
        ) : (
          <div className="space-y-2">{importsThisWeek.map(w => <ImportedWorkoutRow key={w.id} workout={w} />)}</div>
        )}
      </div>
    </div>
  );
}

function BigStat({ label, value, sub, color = "amber" }) {
  const colors = { amber: "text-amber-400", cyan: "text-cyan-400", emerald: "text-emerald-400", red: "text-red-400" };
  return (
    <div className="bg-black p-4">
      <div className="text-[10px] text-zinc-500 tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function RollupRow({ label, value, color = "text-zinc-200" }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-900">
      <span className="text-zinc-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}

function DietPanel({ state, latestWeight, phaseNum, addDietEntry, removeDietEntry }) {
  const [showAdd, setShowAdd] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);
  const auto = calculateDietTargets(latestWeight, state.profile.age, phaseNum, state.profile.height || 72);
  const targets = state.dietTargetsOverride || auto;
  const todayLog = state.dietLog.filter(e => e.date === todayKey);
  const totals = todayLog.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0), protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0), fat: acc.fat + (e.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const guidance = DIET_GUIDANCE[phaseNum];

  return (
    <div className="p-4 space-y-4">
      <PanelHeader icon={Apple} label="NUTRITION" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-900">
        <div className="bg-black p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-zinc-500 tracking-widest">TODAY · {todayKey}</div>
            <button onClick={() => setShowAdd(true)} className="text-[10px] text-amber-400 hover:text-amber-300 tracking-widest flex items-center gap-1"><Plus className="w-3 h-3" /> ADD MEAL</button>
          </div>
          <MacroBar label="CALORIES" current={totals.calories} target={targets.calories} unit="kcal" color="amber" />
          <MacroBar label="PROTEIN" current={totals.protein} target={targets.protein} unit="g" color="emerald" />
          <MacroBar label="CARBS" current={totals.carbs} target={targets.carbs} unit="g" color="cyan" />
          <MacroBar label="FAT" current={totals.fat} target={targets.fat} unit="g" color="amber" />
          <div className="mt-4 pt-3 border-t border-zinc-900">
            <div className="text-[10px] text-zinc-500 tracking-widest mb-2">TODAY'S MEALS</div>
            {todayLog.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-3">Log your first meal.</div>
            ) : (
              <div className="space-y-1">
                {todayLog.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs border-b border-zinc-900 pb-1">
                    <span className="text-zinc-300 truncate flex-1">{e.meal}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-amber-400">{Math.round(e.calories)}c</span>
                      <span className="text-emerald-400">{Math.round(e.protein)}p</span>
                      <button onClick={() => removeDietEntry(e.id)} className="text-zinc-700 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="bg-black p-4">
          <div className="text-[10px] text-zinc-500 tracking-widest mb-2">PHASE {phaseNum} · {guidance.title}</div>
          <div className="space-y-2 mb-4">
            {guidance.bullets.map((b, i) => (
              <div key={i} className="flex gap-2 text-xs text-zinc-300">
                <ChevronRight className="w-3 h-3 mt-0.5 text-zinc-600 flex-shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-zinc-500 tracking-widest mb-2">FOOD STAPLES</div>
          <div className="text-xs text-zinc-400 leading-relaxed">{guidance.foods.join(" · ")}</div>
          <div className="mt-4 pt-3 border-t border-zinc-900">
            <div className="text-[10px] text-zinc-500 tracking-widest mb-2">CALCULATED TARGETS</div>
            <div className="text-xs text-zinc-500 leading-relaxed">
              TDEE est: <span className="text-zinc-300">{auto.tdee} kcal</span><br/>
              Deficit: <span className="text-zinc-300">{auto.tdee - auto.calories} kcal</span><br/>
              <span className="text-zinc-600 italic">Auto from current weight + phase.</span>
            </div>
          </div>
        </div>
      </div>
      {showAdd && <DietLogModal onClose={() => setShowAdd(false)} onSubmit={(e) => { addDietEntry(e); setShowAdd(false); }} />}
    </div>
  );
}

function MacroBar({ label, current, target, unit, color }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const over = current > target;
  const colors = { amber: "bg-amber-500", emerald: "bg-emerald-500", cyan: "bg-cyan-500" };
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-500 tracking-widest text-[10px]">{label}</span>
        <span className="text-zinc-200">
          <span className={over ? "text-red-400" : ""}>{Math.round(current)}</span>
          <span className="text-zinc-600"> / {target} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-zinc-900 overflow-hidden">
        <div className={`h-full ${colors[color]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DietLogModal({ onClose, onSubmit }) {
  const [meal, setMeal] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const submit = () => {
    if (!meal.trim()) return;
    onSubmit({
      date: new Date().toISOString().slice(0, 10), meal: meal.trim(),
      calories: parseFloat(calories) || 0, protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0, fat: parseFloat(fat) || 0,
    });
  };
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-amber-500 text-xs tracking-widest font-bold">LOG MEAL</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X className="w-4 h-4" /></button>
        </div>
        <Field label="MEAL / FOOD" value={meal} onChange={setMeal} placeholder="e.g. 6oz chicken + rice + veg" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="CALORIES" type="number" value={calories} onChange={setCalories} placeholder="kcal" />
          <Field label="PROTEIN (g)" type="number" value={protein} onChange={setProtein} />
          <Field label="CARBS (g)" type="number" value={carbs} onChange={setCarbs} />
          <Field label="FAT (g)" type="number" value={fat} onChange={setFat} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs tracking-widest">CANCEL</button>
          <button onClick={submit} className="flex-1 py-2 border border-amber-500 text-amber-400 hover:bg-amber-500/10 text-xs tracking-widest">SAVE</button>
        </div>
      </div>
    </div>
  );
}

function PeptidePanel({ phaseNum }) {
  const [activePhase, setActivePhase] = useState(phaseNum);
  const protocol = PEPTIDE_PROTOCOLS[activePhase];
  const phaseInfo = PHASES[activePhase - 1];
  const phaseClass = { amber: "text-amber-400 border-amber-500/40 bg-amber-500/10", cyan: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10", emerald: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" };
  const titleColor = phaseInfo.color === "amber" ? "text-amber-400" : phaseInfo.color === "cyan" ? "text-cyan-400" : "text-emerald-400";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PanelHeader icon={Pill} label="PEPTIDE PROTOCOLS" />
        <div className="flex gap-px bg-zinc-900">
          {PHASES.map(p => (
            <button key={p.num} onClick={() => setActivePhase(p.num)}
              className={`px-3 py-1.5 text-[10px] tracking-widest transition-colors ${activePhase === p.num ? `border ${phaseClass[p.color]}` : "bg-black text-zinc-500 hover:text-zinc-300"}`}>
              P{p.num} · {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-amber-500/5 border border-amber-500/30 p-3 flex gap-3 items-start">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong>RESEARCH USE ONLY.</strong> These compounds are not FDA-approved for athletic performance. Source from reputable vendors with COA/HPLC purity. Consult a knowledgeable physician. Cycle, log responses, and discontinue if anything's off.
        </div>
      </div>
      <div className="bg-black border border-zinc-900 p-4">
        <div className={`text-[10px] tracking-widest mb-2 ${titleColor}`}>RATIONALE</div>
        <div className="text-xs text-zinc-300 leading-relaxed">{protocol.rationale}</div>
      </div>
      <div className="space-y-px bg-zinc-900">
        {protocol.stack.map((p, i) => (
          <div key={i} className="bg-black p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <div className="text-amber-400 text-sm font-bold tracking-wide">{p.name}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{p.duration}</div>
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] text-zinc-500 tracking-widest mb-1">DOSE</div>
              <div className="text-xs text-zinc-200">{p.dose}</div>
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] text-zinc-500 tracking-widest mb-1">ROUTE</div>
              <div className="text-xs text-zinc-200">{p.route}</div>
            </div>
            <div className="md:col-span-3">
              <div className="text-[10px] text-zinc-500 tracking-widest mb-1">PURPOSE</div>
              <div className="text-xs text-zinc-300">{p.purpose}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-black border border-zinc-900 p-4">
        <div className="text-[10px] text-zinc-500 tracking-widest mb-2">PROTOCOL NOTES</div>
        <div className="space-y-2">
          {protocol.notes.map((n, i) => (
            <div key={i} className="flex gap-2 text-xs text-zinc-300">
              <ChevronRight className="w-3 h-3 mt-0.5 text-zinc-600 flex-shrink-0" />
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImportPanel({ imports, addImported, removeImported }) {
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    setError(""); setSuccess("");
    const files = Array.from(e.target.files || []);
    let added = 0;
    for (const file of files) {
      try {
        const text = await file.text();
        let parsed = [];
        if (file.name.toLowerCase().endsWith(".gpx")) parsed = parseGPX(text);
        else if (file.name.toLowerCase().endsWith(".tcx")) parsed = parseTCX(text);
        else { setError(`Unsupported format: ${file.name}. Use .gpx or .tcx.`); continue; }
        if (parsed.length > 0) { addImported(parsed); added += parsed.length; }
      } catch (err) { setError(`Failed to parse ${file.name}: ${err.message}`); }
    }
    if (added > 0) setSuccess(`Imported ${added} workout${added === 1 ? "" : "s"}.`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleCSV = () => {
    setError(""); setSuccess("");
    try {
      const parsed = parseCSV(csvText);
      if (parsed.length === 0) { setError("No valid rows found. Check format."); return; }
      addImported(parsed);
      setSuccess(`Imported ${parsed.length} workout${parsed.length === 1 ? "" : "s"} from CSV.`);
      setCsvText("");
    } catch (err) { setError(`CSV parse failed: ${err.message}`); }
  };

  const sorted = [...imports].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="p-4 space-y-4">
      <PanelHeader icon={Upload} label="ACTIVITY IMPORT" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-zinc-900">
        <div className="bg-black p-4 space-y-3">
          <div className="text-[10px] text-zinc-500 tracking-widest">FILE UPLOAD · GPX / TCX</div>
          <div className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-amber-400">GARMIN:</span> connect.garmin.com → activity → gear icon → Export to GPX or TCX.<br/>
            <span className="text-amber-400">SUUNTO:</span> Suunto app → activity → share → export GPX. Or sports-tracker.com export.
          </div>
          <input ref={fileRef} type="file" accept=".gpx,.tcx" multiple onChange={handleFile} className="hidden" id="file-input" />
          <label htmlFor="file-input" className="block w-full py-3 border-2 border-dashed border-zinc-700 hover:border-amber-500 text-center text-xs text-zinc-400 hover:text-amber-400 cursor-pointer transition-colors tracking-widest">
            <Upload className="w-4 h-4 inline mr-2" /> SELECT FILES
          </label>
        </div>
        <div className="bg-black p-4 space-y-3">
          <div className="text-[10px] text-zinc-500 tracking-widest">PASTE CSV</div>
          <div className="text-xs text-zinc-400 leading-relaxed">Headers: <span className="text-zinc-300">Date, Sport, Duration(min), Distance(mi), AvgHR, Calories</span></div>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={5}
            placeholder={"Date,Sport,Duration,Distance,AvgHR,Calories\n2026-04-26,Run,32.5,3.2,142,420"}
            className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500" />
          <button onClick={handleCSV} disabled={!csvText.trim()} className="w-full py-2 border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 text-xs tracking-widest">IMPORT CSV</button>
        </div>
      </div>
      {error && <div className="bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">{success}</div>}
      <div className="bg-black border border-zinc-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-zinc-500 tracking-widest">IMPORT HISTORY</div>
          <span className="text-[10px] text-zinc-600">{imports.length} total</span>
        </div>
        {sorted.length === 0 ? (
          <div className="text-xs text-zinc-600 text-center py-6">No imports yet.</div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sorted.map(w => <ImportedWorkoutRow key={w.id} workout={w} onRemove={() => removeImported(w.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ImportedWorkoutRow({ workout, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-zinc-900 items-center">
      <div className="col-span-2 text-zinc-500">{fmtDate(workout.date)}</div>
      <div className="col-span-2 text-zinc-300 truncate">{workout.sport}</div>
      <div className="col-span-2 text-cyan-400 flex items-center gap-1"><Clock className="w-3 h-3" />{workout.duration}m</div>
      <div className="col-span-2 text-emerald-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{workout.distance.toFixed(1)}mi</div>
      <div className="col-span-2 text-amber-400 flex items-center gap-1"><Heart className="w-3 h-3" />{workout.avgHR || "—"}</div>
      <div className="col-span-1 text-zinc-500 text-[10px]">{workout.source}</div>
      <div className="col-span-1 text-right">
        {onRemove && <button onClick={onRemove} className="text-zinc-700 hover:text-red-400"><X className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}

function TabNav({ tab, setTab, onCoachOpen }) {
  const tabs = [
    { id: "dash", label: "F1 DASH", icon: LayoutDashboard },
    { id: "weekly", label: "F2 WEEK", icon: CalendarDays },
    { id: "diet", label: "F3 DIET", icon: Apple },
    { id: "peptides", label: "F4 PEP", icon: Pill },
    { id: "import", label: "F5 IMPORT", icon: Upload },
  ];
  return (
    <div className="border-b border-zinc-800 bg-zinc-950 flex items-center gap-px overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)}
          className={`px-4 py-2 text-[10px] tracking-widest flex items-center gap-2 whitespace-nowrap transition-colors ${tab === t.id ? "bg-black text-amber-400 border-b border-amber-500" : "text-zinc-500 hover:text-zinc-200"}`}>
          <t.icon className="w-3 h-3" /> {t.label}
        </button>
      ))}
      {tab !== "dash" && (
        <button onClick={onCoachOpen} className="ml-auto px-4 py-2 text-[10px] tracking-widest text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2 border-l border-zinc-800">
          <MessageSquare className="w-3 h-3" /> ASK COACH
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, sub, accent, subColor }) {
  const colors = { amber: "text-amber-400", cyan: "text-cyan-400", emerald: "text-emerald-400" };
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-zinc-500 tracking-widest">{label}</span>
      <span className={`text-xs ${accent ? colors[accent] : "text-zinc-100"}`}>
        {value}
        {sub && <span className={`ml-2 ${subColor || "text-zinc-500"}`}>{sub}</span>}
      </span>
    </div>
  );
}

function PanelHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
      <Icon className="w-3.5 h-3.5 text-amber-500" />
      <span className="text-[10px] tracking-widest text-zinc-400">{label}</span>
    </div>
  );
}

function TodayCard({ workout, completed, onComplete, phaseColor }) {
  const Icon = workout.icon;
  const colors = { amber: "border-amber-500/40 bg-amber-500/5", cyan: "border-cyan-500/40 bg-cyan-500/5", emerald: "border-emerald-500/40 bg-emerald-500/5" };
  return (
    <div className={`border ${colors[phaseColor]} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-300" />
          <div>
            <div className="text-zinc-100 font-bold tracking-wide">{workout.name}</div>
            <div className="text-xs text-zinc-500">{workout.tag} · {workout.duration}</div>
          </div>
        </div>
        {completed && <div className="flex items-center gap-1 text-emerald-400 text-xs"><Check className="w-3 h-3" /> COMPLETE</div>}
      </div>
      <div className="text-xs">
        <div className="text-zinc-500 mb-1">TARGET</div>
        <div className="text-zinc-200">{workout.target}</div>
      </div>
      <div className="text-xs">
        <div className="text-zinc-500 mb-1">PROTOCOL</div>
        <ul className="space-y-1">
          {workout.blocks.map((b, i) => (
            <li key={i} className="flex gap-2 text-zinc-300"><ChevronRight className="w-3 h-3 mt-0.5 text-zinc-600 flex-shrink-0" /><span>{b}</span></li>
          ))}
        </ul>
      </div>
      <div className="text-xs border-l-2 border-amber-500/50 pl-2 italic text-zinc-400">{workout.cue}</div>
      {!completed && (
        <button onClick={onComplete} className="w-full py-2 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 transition-colors text-xs tracking-widest">MARK COMPLETE</button>
      )}
    </div>
  );
}

function MetricsPanel({ state, onLog }) {
  const metrics = state.metrics;
  const targetWeight = state.profile.targetWeight;
  const chartData = metrics.map((m) => ({ date: fmtDate(m.date), weight: m.weight }));
  const latest = metrics[metrics.length - 1];
  const prev = metrics[metrics.length - 2];

  return (
    <div className="space-y-4">
      <button onClick={onLog} className="w-full py-2 border border-zinc-700 hover:border-amber-500 hover:text-amber-400 text-xs tracking-widest text-zinc-400 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-3 h-3" /> LOG ENTRY
      </button>
      {metrics.length === 0 ? (
        <div className="text-zinc-600 text-xs text-center py-8">No data yet.<br />Log your first entry.</div>
      ) : (
        <>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#71717a" }} stroke="#27272a" />
                <YAxis tick={{ fontSize: 9, fill: "#71717a" }} stroke="#27272a" domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", fontSize: 10 }} />
                <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2, fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <MetricRow label="WEIGHT" value={latest?.weight ? `${latest.weight} lb` : "—"} delta={prev && latest ? (latest.weight - prev.weight).toFixed(1) : null} invertColor />
          <MetricRow label="BODY FAT" value={latest?.bf ? `${latest.bf}%` : "—"} delta={prev && latest && prev.bf && latest.bf ? (latest.bf - prev.bf).toFixed(1) : null} invertColor />
          <MetricRow label="MILE TIME" value={latest?.mile || "—"} />
          <MetricRow label="WAIST" value={latest?.waist ? `${latest.waist}"` : "—"} delta={prev && latest && prev.waist && latest.waist ? (latest.waist - prev.waist).toFixed(1) : null} invertColor />
          <MetricRow label="SLEEP" value={latest?.sleep ? `${latest.sleep}h` : "—"} delta={prev && latest && prev.sleep && latest.sleep ? (latest.sleep - prev.sleep).toFixed(1) : null} />
        </>
      )}
    </div>
  );
}

function MetricRow({ label, value, delta, invertColor }) {
  let color = "text-zinc-500";
  if (delta !== null && delta !== undefined && parseFloat(delta) !== 0) {
    const num = parseFloat(delta);
    if (invertColor) color = num < 0 ? "text-emerald-400" : "text-red-400";
    else color = num > 0 ? "text-emerald-400" : "text-red-400";
  }
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-900">
      <span className="text-zinc-500 tracking-widest text-[10px]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-zinc-100">{value}</span>
        {delta !== null && delta !== undefined && parseFloat(delta) !== 0 && (
          <span className={`text-[10px] ${color}`}>{parseFloat(delta) > 0 ? "+" : ""}{delta}</span>
        )}
      </div>
    </div>
  );
}

function buildSystemPrompt(c) {
  return `You are Joe's personal performance coach inside the OPERATOR app.

ABOUT JOE:
- 38 years old, former pro football player
- Starting weight ${c.startWeight} lbs, target ${c.targetWeight} lbs
- Goals: 10-12% body fat, 34-36" waist, sub-7 min mile (stretch: sub-6), comfortable 5-mile runs
- Has run 5:45 mile and 18:30 3-mile in the past — legitimate aerobic engine
- Wants longevity-focused athleticism, not just aesthetics

CURRENT STATUS:
- Phase ${c.phaseNum}: ${c.phase.name} (week ${c.week} of 44)
- Phase focus: ${c.phase.focus}
- Latest weight: ${c.latestWeight} lbs
- Today's prescribed workout: ${c.today}
${c.recentMetrics?.length > 0 ? `- Recent metrics: ${JSON.stringify(c.recentMetrics)}` : ""}

PROGRAMMING:
- Phase 1 (wks 1-12): Foundation — Z2 base, strength 2x, ruck, no running impact
- Phase 2 (wks 13-28): Recomp — easy running, threshold work, strength 2-3x
- Phase 3 (wks 29-44): Performance — speed intervals, mile repeats, mixed modal

TONE:
Direct, tactical, war-room. No coddling. Reference his data when relevant. Keep responses tight — 3-6 sentences unless he asks for depth. Push back on bad ideas. Cite specific protocol when modifying workouts.`;
}

function useCoach(chat, onAdd, context) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    onAdd(userMsg);
    setInput("");
    setLoading(true);
    try {
      const history = chat.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: buildSystemPrompt(context),
          messages: [...history, userMsg],
        }),
      });
      const data = await response.json();
      const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "[No response]";
      onAdd({ role: "assistant", content: text });
    } catch (err) {
      onAdd({ role: "assistant", content: `[Coach offline — ${err.message}]` });
    } finally { setLoading(false); }
  };
  return { input, setInput, loading, send };
}

function CoachPanel({ chat, onAdd, context }) {
  const { input, setInput, loading, send } = useCoach(chat, onAdd, context);
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [chat, loading]);
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 min-h-[300px] max-h-[500px]">
        {chat.length === 0 && (
          <div className="text-xs text-zinc-600 space-y-2">
            <p>Coach is on. Ask anything:</p>
            <ul className="space-y-1 pl-2">
              <li>· "Modify today's workout, knee is sore"</li>
              <li>· "I plateaued at 270 — adjust diet"</li>
              <li>· "Should I add a 3rd run this week?"</li>
              <li>· "What's my realistic mile time at week 24?"</li>
              <li>· "Peptide protocol for this phase?"</li>
            </ul>
          </div>
        )}
        {chat.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
        {loading && <div className="flex items-center gap-2 text-zinc-500 text-xs"><Loader2 className="w-3 h-3 animate-spin" /><span>Coach is thinking...</span></div>}
      </div>
      <div className="flex gap-2 border-t border-zinc-800 pt-3">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the coach..." disabled={loading}
          className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500" />
        <button onClick={send} disabled={loading || !input.trim()}
          className="px-3 border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <Send className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function CoachDrawer({ onClose, chat, onAdd, context }) {
  const { input, setInput, loading, send } = useCoach(chat, onAdd, context);
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [chat, loading]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-black border-l border-zinc-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] tracking-widest text-zinc-400">COACH</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X className="w-4 h-4" /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {chat.length === 0 && <div className="text-xs text-zinc-600">Coach is on. Ask anything about your training, diet, peptides, or programming.</div>}
          {chat.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
          {loading && <div className="flex items-center gap-2 text-zinc-500 text-xs"><Loader2 className="w-3 h-3 animate-spin" /><span>Coach is thinking...</span></div>}
        </div>
        <div className="flex gap-2 p-4 border-t border-zinc-800">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask the coach..." disabled={loading}
            className="flex-1 bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500" />
          <button onClick={send} disabled={loading || !input.trim()} className="px-3 border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 transition-colors">
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }) {
  if (role === "user") {
    return (
      <div className="text-xs">
        <div className="text-amber-500 text-[10px] tracking-widest mb-1">OPERATOR</div>
        <div className="text-zinc-200 pl-2 border-l-2 border-amber-500/30 whitespace-pre-wrap">{content}</div>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <div className="text-cyan-400 text-[10px] tracking-widest mb-1">COACH</div>
      <div className="text-zinc-300 pl-2 border-l-2 border-cyan-500/30 whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  );
}

function PhaseStrip({ current, week }) {
  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-900">
      {PHASES.map((p) => {
        const active = p.num === current;
        const done = p.num < current;
        const colors = {
          amber: { bg: "bg-amber-500/10", border: "border-amber-500", text: "text-amber-400" },
          cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500", text: "text-cyan-400" },
          emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-400" },
        };
        const c = colors[p.color];
        return (
          <div key={p.num} className={`bg-black p-3 ${active ? `${c.bg} border-l-2 ${c.border}` : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] tracking-widest ${active ? c.text : done ? "text-zinc-500" : "text-zinc-700"}`}>P{p.num} · {p.name}</span>
              {done && <Check className="w-3 h-3 text-emerald-500" />}
              {active && <span className="text-[10px] text-zinc-500">W{week} of {p.weeks}</span>}
            </div>
            <div className={`text-[10px] ${active ? "text-zinc-300" : "text-zinc-600"}`}>{p.focus}</div>
            <div className={`text-[10px] mt-1 ${active ? c.text : "text-zinc-700"}`}>Target: {p.weightTarget} lb</div>
          </div>
        );
      })}
    </div>
  );
}

function LogModal({ onClose, onSubmit, lastWeight }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState(lastWeight || "");
  const [bf, setBf] = useState("");
  const [waist, setWaist] = useState("");
  const [mile, setMile] = useState("");
  const [sleep, setSleep] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const submit = () => {
    onSubmit({
      date, weight: weight ? parseFloat(weight) : null, bf: bf ? parseFloat(bf) : null,
      waist: waist ? parseFloat(waist) : null, mile: mile || null,
      sleep: sleep ? parseFloat(sleep) : null, rpe: rpe ? parseInt(rpe) : null, notes: notes || null,
    });
  };
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 max-w-md w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span className="text-amber-500 text-xs tracking-widest font-bold">LOG ENTRY</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><X className="w-4 h-4" /></button>
        </div>
        <Field label="DATE" type="date" value={date} onChange={setDate} />
        <Field label="WEIGHT (lb)" type="number" value={weight} onChange={setWeight} placeholder="e.g. 287.4" />
        <Field label="BODY FAT (%)" type="number" value={bf} onChange={setBf} placeholder="optional" />
        <Field label="WAIST (in)" type="number" value={waist} onChange={setWaist} placeholder="optional" />
        <Field label="MILE TIME" value={mile} onChange={setMile} placeholder="e.g. 8:42 (optional)" />
        <Field label="SLEEP (hrs)" type="number" value={sleep} onChange={setSleep} placeholder="optional" />
        <Field label="RPE TODAY (1-10)" type="number" value={rpe} onChange={setRpe} placeholder="optional" />
        <div>
          <div className="text-[10px] text-zinc-500 tracking-widest mb-1">NOTES</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full bg-black border border-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs tracking-widest">CANCEL</button>
          <button onClick={submit} className="flex-1 py-2 border border-amber-500 text-amber-400 hover:bg-amber-500/10 text-xs tracking-widest">SAVE</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 tracking-widest mb-1">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} step="0.1"
        className="w-full bg-black border border-zinc-800 px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500" />
    </div>
  );
}
