// Pure module: types, labels and search. Deliberately imports NOTHING that
// touches the network, so this logic stays unit-testable on its own.
// Fetching lives in lib/foodsRepo.ts.
export type FoodGroup = "protein" | "carbs" | "fats" | "fruit" | "veg" | "dairy" | "legumes" | "nuts";

export type FoodItem = {
  id: string;
  name: string;
  food_group: FoodGroup;
  portion: number;
  unit: "g" | "ml";
  protein: number;
  /** Available carbohydrate per 100 g/ml — excludes fibre, which is counted separately. */
  carbs: number;
  /** Total fat per 100 g/ml. */
  fat: number;
  fibre: number;
  iron: number;
  calcium: number;
  density: "low" | "medium" | "high";
};

export const GROUP_LABELS: Record<FoodGroup, string> = {
  protein: "Protein", carbs: "Carbohydrates", fats: "Fats",
  fruit: "Fruit", veg: "Vegetables", dairy: "Dairy",
  legumes: "Legumes", nuts: "Nuts & seeds",
};
export const GROUP_ORDER: FoodGroup[] = [
  "protein", "carbs", "fats", "dairy", "legumes", "nuts", "fruit", "veg",
];

// Fuzzy search: prefix match beats word-start match beats substring beats
// a loose subsequence match, so "cra" finds "Crackers" before something
// that merely contains those letters in order somewhere.
export function searchFoods(foods: FoodItem[], q: string): FoodItem[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const scored: [number, FoodItem][] = [];
  for (const f of foods) {
    const n = f.name.toLowerCase();
    let score = -1;
    if (n.startsWith(s)) score = 100 - n.length * 0.1;
    else if (n.split(/[\s,/]+/).some((w) => w.startsWith(s))) score = 80 - n.length * 0.1;
    else if (n.includes(s)) score = 60 - n.length * 0.1;
    else {
      let i = 0;
      for (const ch of n) if (ch === s[i]) i++;
      if (i === s.length) score = 30 - n.length * 0.1;
    }
    if (score > 0) scored.push([score, f]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 7).map((x) => x[1]);
}
