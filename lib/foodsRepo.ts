import { createClient } from "@/lib/supabase/client";
import type { FoodItem } from "@/lib/foods";

/**
 * Data access for the food list.
 *
 * Split out of lib/foods.ts because that module also holds the pure search
 * logic, and importing `searchFoods` in a test pulled in the Supabase client
 * and its configuration with it — which made the whole test file fail the
 * moment configuration became mandatory. Pure logic and I/O do not belong in
 * the same module.
 */

let cache: FoodItem[] | null = null;

// The food list is small (115 rows) and only ever changes via a migration, so
// it is fetched once per session and reused — this avoids a network round trip
// on every keystroke in the autocomplete box.
export async function getFoods(): Promise<FoodItem[]> {
  if (cache) return cache;
  const supabase = createClient();
  // Deprecated rows are excluded from the picker but deliberately stay in the
  // table: historical entries still reference them, and their values must keep
  // resolving to what was logged at the time. See the food_items_immutable
  // trigger — a correction adds a new row rather than editing this one.
  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .is("deprecated_at", null)
    .order("name");
  if (error || !data) throw new Error("Could not load the food list.");
  cache = data as FoodItem[];
  return cache;
}

/** Clears the cached list. Needed after sign-out so a new session re-fetches. */
export function clearFoodCache() {
  cache = null;
}
