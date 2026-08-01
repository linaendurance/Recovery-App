import type { FoodItem } from "@/lib/foods";
import {
  macroPresence,
  presenceCount,
  type MacroPresence,
  type NutrientKey,
} from "@/lib/nutrition";

export type EntryItemRow = { qty: number; food_items: FoodItem | null };
export type EntryRow = {
  id: string;
  entry_date?: string;
  meal_type: string;
  mins_since_midnight: number;
  /** The CBT-E asterisk: the person felt this episode was excessive or out of control. */
  felt_excessive?: boolean;
  emotion?: string | null;
  context_note?: string | null;
  entry_items: EntryItemRow[];
};

export type Totals = Record<NutrientKey, number>;

const emptyTotals = (): Totals => ({
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0,
  iron: 0,
  calcium: 0,
});

/** One eating occasion, with its own macro breakdown. */
export type Occasion = {
  entry: EntryRow;
  totals: Totals;
  presence: MacroPresence;
};

export type Analysis = {
  entries: EntryRow[];
  occasions: Occasion[];
  totals: Totals;
  groups: string[];
  densities: { low: number; medium: number; high: number };
  names: Map<string, number>;
  firstMeal: number | null;
  lastMeal: number | null;
  longestGap: number;
  sinceLast: number;
  openGapFlag: boolean;
  mealCount: number;
  /** Occasions carrying all three of carbohydrate, fat and protein. */
  completeFuelCount: number;
  excessiveCount: number;
};

// A gap longer than this prompts a nudge. This is an APP HEURISTIC, not a
// clinical cutoff: standard recovery meal structures land around 3 hours
// between eating occasions, so 3.5 hours flags a stretch that is drifting
// wider than that without treating it as a failure.
export const LONG_GAP_MINS = 210;

export function itemTotals(items: EntryItemRow[]): Totals {
  const t = emptyTotals();
  for (const item of items) {
    const f = item.food_items;
    if (!f) continue;
    const factor = (f.portion * item.qty) / 100;
    t.protein += f.protein * factor;
    t.carbs += f.carbs * factor;
    t.fat += f.fat * factor;
    t.fibre += f.fibre * factor;
    t.iron += f.iron * factor;
    t.calcium += f.calcium * factor;
  }
  return t;
}

export function computeAnalysis(entries: EntryRow[], nowMins: number, isToday: boolean): Analysis {
  const sorted = [...entries].sort((a, b) => a.mins_since_midnight - b.mins_since_midnight);
  const totals = emptyTotals();
  const groups = new Set<string>();
  const densities = { low: 0, medium: 0, high: 0 };
  const names = new Map<string, number>();
  const occasions: Occasion[] = [];

  for (const e of sorted) {
    const occTotals = itemTotals(e.entry_items);
    for (const k of Object.keys(totals) as NutrientKey[]) totals[k] += occTotals[k];

    for (const item of e.entry_items) {
      const f = item.food_items;
      if (!f) continue;
      groups.add(f.food_group);
      densities[f.density] += item.qty;
      names.set(f.name, (names.get(f.name) || 0) + 1);
    }

    occasions.push({ entry: e, totals: occTotals, presence: macroPresence(occTotals) });
  }

  const times = sorted.map((e) => e.mins_since_midnight);
  let longestGap = 0;
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > longestGap) longestGap = times[i] - times[i - 1];
  }
  // Nothing stops someone logging a meal for later today — only future DATES
  // are rejected. When they do, `now - lastMeal` goes negative, which read as
  // a nonsense "time since you last ate" and a negative gap in the legend.
  const sinceLast =
    times.length && isToday ? Math.max(0, nowMins - times[times.length - 1]) : 0;
  const openGapFlag = isToday && times.length > 0 && sinceLast > LONG_GAP_MINS;

  return {
    entries: sorted,
    occasions,
    totals,
    groups: [...groups],
    densities,
    names,
    firstMeal: times[0] ?? null,
    lastMeal: times[times.length - 1] ?? null,
    longestGap,
    sinceLast,
    openGapFlag,
    mealCount: sorted.length,
    completeFuelCount: occasions.filter((o) => presenceCount(o.presence) === 3).length,
    excessiveCount: sorted.filter((e) => e.felt_excessive).length,
  };
}

// ---------------------------------------------------------------------------
// Across days
// ---------------------------------------------------------------------------

export type DayShape = {
  date: string;
  mealCount: number;
  firstMeal: number | null;
  lastMeal: number | null;
  longestGap: number;
  completeFuelCount: number;
  excessiveCount: number;
  /** Minutes from the last meal of this day to the first meal of the next. */
  overnightFast: number | null;
};

/**
 * Meal timing across a run of days.
 *
 * The single-day view could never show an overnight fast, because a gap that
 * crosses midnight lands in two different entry_date buckets. Computing it
 * here is the only place in the app that can see it.
 */
export function computeDayShapes(entries: EntryRow[]): DayShape[] {
  const byDate = new Map<string, EntryRow[]>();
  for (const e of entries) {
    if (!e.entry_date) continue;
    const list = byDate.get(e.entry_date) ?? [];
    list.push(e);
    byDate.set(e.entry_date, list);
  }

  const dates = [...byDate.keys()].sort();
  const shapes: DayShape[] = dates.map((date) => {
    const dayEntries = (byDate.get(date) ?? []).sort(
      (a, b) => a.mins_since_midnight - b.mins_since_midnight
    );
    const times = dayEntries.map((e) => e.mins_since_midnight);
    let longestGap = 0;
    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] > longestGap) longestGap = times[i] - times[i - 1];
    }
    const completeFuelCount = dayEntries.filter(
      (e) => presenceCount(macroPresence(itemTotals(e.entry_items))) === 3
    ).length;

    return {
      date,
      mealCount: dayEntries.length,
      firstMeal: times[0] ?? null,
      lastMeal: times[times.length - 1] ?? null,
      longestGap,
      completeFuelCount,
      excessiveCount: dayEntries.filter((e) => e.felt_excessive).length,
      overnightFast: null,
    };
  });

  // Second pass: an overnight fast needs the following calendar day, and only
  // counts when the two days are actually consecutive.
  for (let i = 0; i < shapes.length - 1; i++) {
    const today = shapes[i];
    const next = shapes[i + 1];
    if (today.lastMeal === null || next.firstMeal === null) continue;
    const dayDiff = Math.round(
      (new Date(next.date + "T12:00:00").getTime() -
        new Date(today.date + "T12:00:00").getTime()) /
        86400000
    );
    if (dayDiff !== 1) continue;
    today.overnightFast = 1440 - today.lastMeal + next.firstMeal;
  }

  return shapes.reverse(); // most recent first
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

export type Observation = { tone: "good" | "note"; text: string };

export function observations(a: Analysis): Observation[] {
  const out: Observation[] = [];
  if (a.mealCount === 0) return out;

  if (a.mealCount >= 4) {
    out.push({
      tone: "good",
      text: "You ate across the day rather than compressing intake into a narrow window. Regularity is one of the strongest levers you have for hormonal recovery.",
    });
  } else if (a.mealCount === 3) {
    out.push({
      tone: "good",
      text: "Three eating occasions logged. Adding a snack between meals shortens the gaps without requiring a bigger meal.",
    });
  } else {
    out.push({
      tone: "note",
      text: "Fewer eating occasions than a standard recovery structure of three meals and two to three snacks. Not a failure — just information for tomorrow.",
    });
  }

  if (a.longestGap > 300) {
    out.push({
      tone: "note",
      text: `Longest gap between meals was ${Math.floor(a.longestGap / 60)} h ${String(
        Math.round(a.longestGap % 60)
      ).padStart(2, "0")} min. Long fasting windows raise the physiological stress signal that suppresses the menstrual cycle.`,
    });
  } else if (a.longestGap && a.longestGap <= 240) {
    out.push({
      tone: "good",
      text: "No long fasting windows today. Your body received a steady supply of fuel.",
    });
  }

  // Fuel consistency — the carbohydrate/fat/protein question, per occasion.
  if (a.completeFuelCount === a.mealCount) {
    out.push({
      tone: "good",
      text: "Every eating occasion today carried carbohydrate, fat and protein together. That combination is what makes energy last between meals rather than spiking and dropping away.",
    });
  } else if (a.completeFuelCount === 0) {
    out.push({
      tone: "note",
      text: "No eating occasion today carried all three of carbohydrate, fat and protein. Meals built from one macronutrient tend to run out early, which shows up later as a gap you did not choose.",
    });
  } else {
    out.push({
      tone: "note",
      text: `${a.completeFuelCount} of ${a.mealCount} eating occasions carried carbohydrate, fat and protein together. Adding the missing one to a meal changes how long it lasts without changing how much you eat.`,
    });
  }

  const missingFat = a.occasions.filter((o) => !o.presence.fat).length;
  if (a.mealCount >= 2 && missingFat >= a.mealCount - 1) {
    out.push({
      tone: "note",
      text: "Fat was largely absent today. Vitamins A, D, E and K need dietary fat to be absorbed at all, so a low-fat day quietly limits several other nutrients regardless of what else you ate.",
    });
  }

  const missingCarbs = a.occasions.filter((o) => !o.presence.carbs).length;
  if (a.mealCount >= 2 && missingCarbs >= a.mealCount - 1) {
    out.push({
      tone: "note",
      text: "Carbohydrate was largely absent today. Low carbohydrate availability specifically — not only low total intake — has been associated with menstrual disruption in the REDs literature.",
    });
  }

  if (a.groups.length >= 5) {
    out.push({
      tone: "good",
      text: `${a.groups.length} food groups represented. Variety is how micronutrient coverage happens without needing to track every nutrient.`,
    });
  } else if (a.groups.length) {
    out.push({
      tone: "note",
      text: `${a.groups.length} food group${
        a.groups.length === 1 ? "" : "s"
      } represented today. One added group tomorrow — a fat, a dairy, a legume — widens coverage more than increasing volume does.`,
    });
  }

  if (!a.groups.includes("protein") && !a.groups.includes("legumes") && !a.groups.includes("dairy")) {
    out.push({
      tone: "note",
      text: "No clear protein source logged. Protein supports tissue repair, immune function and the amino acids used to build hormones.",
    });
  }

  const totalD = a.densities.low + a.densities.medium + a.densities.high;
  if (totalD >= 4 && a.densities.high / totalD < 0.2) {
    out.push({
      tone: "note",
      text: "Today leaned towards low-energy-density foods. Volume can fill the stomach while leaving the energy debt in place — which is often what keeps a cycle suppressed. A fat or a denser carbohydrate added to a meal changes this without changing how much you eat.",
    });
  }
  if (a.densities.high > 0 && a.densities.high / Math.max(totalD, 1) >= 0.25) {
    out.push({
      tone: "good",
      text: "Energy-dense foods appeared today. These do the work that volume cannot.",
    });
  }

  // Episodes that felt excessive. Deliberately framed as information, never as
  // something to correct — the app takes no position on how much was eaten.
  if (a.excessiveCount > 0) {
    out.push({
      tone: "note",
      text:
        a.excessiveCount === 1
          ? "You marked one eating occasion as feeling excessive or out of control. Episodes like this most often follow a long gap or an under-fuelled earlier meal rather than arriving from nowhere — the timeline is worth a look. Nothing here needs correcting tonight."
          : `You marked ${a.excessiveCount} eating occasions as feeling excessive or out of control. That pattern is usually downstream of the day's structure rather than a separate problem. Nothing here needs correcting tonight.`,
    });
  }

  return out;
}
