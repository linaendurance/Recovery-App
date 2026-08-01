import type { FoodItem } from "@/lib/foods";

export type EntryItemRow = { qty: number; food_items: FoodItem | null };
export type EntryRow = {
  id: string;
  meal_type: string;
  mins_since_midnight: number;
  entry_items: EntryItemRow[];
};

export type Analysis = {
  entries: EntryRow[];
  totals: { protein: number; fibre: number; iron: number; calcium: number };
  groups: string[];
  densities: { low: number; medium: number; high: number };
  names: Map<string, number>;
  firstMeal: number | null;
  lastMeal: number | null;
  longestGap: number;
  sinceLast: number;
  openGapFlag: boolean;
  mealCount: number;
};

export function computeAnalysis(entries: EntryRow[], nowMins: number, isToday: boolean): Analysis {
  const sorted = [...entries].sort((a, b) => a.mins_since_midnight - b.mins_since_midnight);
  const totals = { protein: 0, fibre: 0, iron: 0, calcium: 0 };
  const groups = new Set<string>();
  const densities = { low: 0, medium: 0, high: 0 };
  const names = new Map<string, number>();

  for (const e of sorted) {
    for (const item of e.entry_items) {
      const f = item.food_items;
      if (!f) continue;
      const factor = (f.portion * item.qty) / 100;
      totals.protein += f.protein * factor;
      totals.fibre += f.fibre * factor;
      totals.iron += f.iron * factor;
      totals.calcium += f.calcium * factor;
      groups.add(f.food_group);
      densities[f.density] += item.qty;
      names.set(f.name, (names.get(f.name) || 0) + 1);
    }
  }

  const times = sorted.map((e) => e.mins_since_midnight);
  let longestGap = 0;
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > longestGap) longestGap = times[i] - times[i - 1];
  }
  const sinceLast = times.length && isToday ? nowMins - times[times.length - 1] : 0;
  const openGapFlag = isToday && times.length > 0 && sinceLast > 210;

  return {
    entries: sorted, totals, groups: [...groups], densities, names,
    firstMeal: times[0] ?? null, lastMeal: times[times.length - 1] ?? null,
    longestGap, sinceLast, openGapFlag, mealCount: sorted.length,
  };
}

// Reference FLOORS for adult premenopausal women — the level below which
// deficiency risk rises. Never a ceiling, never a target to hit exactly.
// No calorie figures anywhere in this app, by design.
export const REFERENCE = {
  protein: { label: "Protein", unit: "g", floor: 50 },
  fibre: { label: "Fibre", unit: "g", floor: 25 },
  iron: { label: "Iron", unit: "mg", floor: 18 },
  calcium: { label: "Calcium", unit: "mg", floor: 1000 },
} as const;

export type Observation = { tone: "good" | "note"; text: string };

export function observations(a: Analysis): Observation[] {
  const out: Observation[] = [];
  if (a.mealCount === 0) return out;

  if (a.mealCount >= 4) {
    out.push({ tone: "good", text: "You ate across the day rather than compressing intake into a narrow window. Regularity is one of the strongest levers you have for hormonal recovery." });
  } else if (a.mealCount === 3) {
    out.push({ tone: "good", text: "Three eating occasions logged. Adding a snack between meals shortens the gaps without requiring a bigger meal." });
  } else {
    out.push({ tone: "note", text: "Fewer eating occasions than a standard recovery structure of three meals and two to three snacks. Not a failure — just information for tomorrow." });
  }

  if (a.longestGap > 300) {
    out.push({ tone: "note", text: `Longest gap between meals was ${Math.floor(a.longestGap / 60)} h ${String(Math.round(a.longestGap % 60)).padStart(2, "0")} min. Long fasting windows raise the physiological stress signal that suppresses the menstrual cycle.` });
  } else if (a.longestGap && a.longestGap <= 240) {
    out.push({ tone: "good", text: "No long fasting windows today. Your body received a steady supply of fuel." });
  }

  if (a.groups.length >= 5) {
    out.push({ tone: "good", text: `${a.groups.length} food groups represented. Variety is how micronutrient coverage happens without needing to track every nutrient.` });
  } else if (a.groups.length) {
    out.push({ tone: "note", text: `${a.groups.length} food group${a.groups.length === 1 ? "" : "s"} represented today. One added group tomorrow — a fat, a dairy, a legume — widens coverage more than increasing volume does.` });
  }

  if (!a.groups.includes("protein") && !a.groups.includes("legumes") && !a.groups.includes("dairy")) {
    out.push({ tone: "note", text: "No clear protein source logged. Protein supports tissue repair, immune function and the amino acids used to build hormones." });
  }

  const totalD = a.densities.low + a.densities.medium + a.densities.high;
  if (totalD >= 4 && a.densities.high / totalD < 0.2) {
    out.push({ tone: "note", text: "Today leaned towards low-energy-density foods. Volume can fill the stomach while leaving the energy debt in place — which is often what keeps a cycle suppressed. A fat or a denser carbohydrate added to a meal changes this without changing how much you eat." });
  }
  if (a.densities.high > 0 && a.densities.high / Math.max(totalD, 1) >= 0.25) {
    out.push({ tone: "good", text: "Energy-dense foods appeared today. These do the work that volume cannot." });
  }

  return out;
}
