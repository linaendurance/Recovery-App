import { test } from "node:test";
import assert from "node:assert/strict";

import { fmtTime, fmtGap, dayKey, daysBetween, recentDays, minsNow } from "../lib/dates";
import {
  computeAnalysis,
  computeDayShapes,
  itemTotals,
  observations,
  LONG_GAP_MINS,
  type EntryRow,
} from "../lib/analysis";
import { macroPresence, presenceCount, ageBandFromBirthYear, referencesFor, NUTRIENT_ORDER } from "../lib/nutrition";
import { todaysPrompts, answeredPairs, JOURNAL_BANK, ADVANCED_FORMATS, OPEN_PROMPT } from "../lib/journalBank";
import { responsiveFacts, todaysFact, tonightsInsight, FOOD_FACTS, RECOVERY_INSIGHTS } from "../lib/facts";
import { searchFoods, type FoodItem } from "../lib/foods";

// --- helpers ---------------------------------------------------------------

const food = (over: Partial<FoodItem> = {}): FoodItem => ({
  id: Math.random().toString(36).slice(2),
  name: "Test food",
  food_group: "carbs",
  portion: 100,
  unit: "g",
  protein: 0,
  carbs: 0,
  fat: 0,
  fibre: 0,
  iron: 0,
  calcium: 0,
  density: "low",
  ...over,
});

const entry = (over: Partial<EntryRow> = {}): EntryRow => ({
  id: Math.random().toString(36).slice(2),
  meal_type: "Lunch",
  mins_since_midnight: 720,
  entry_items: [],
  ...over,
});

// --- dates -----------------------------------------------------------------

test("fmtTime pads and wraps at 24h", () => {
  assert.equal(fmtTime(0), "00:00");
  assert.equal(fmtTime(9 * 60 + 5), "09:05");
  assert.equal(fmtTime(23 * 60 + 59), "23:59");
});

test("fmtGap formats hours and minutes", () => {
  assert.equal(fmtGap(45), "45 min");
  assert.equal(fmtGap(60), "1 h 00 min");
  assert.equal(fmtGap(210), "3 h 30 min");
});

test("fmtGap never renders a negative duration", () => {
  // A meal logged for later today makes `now - lastMeal` negative. The old
  // output was "-9 h 00 min" in the ribbon legend.
  assert.ok(!fmtGap(-540).includes("-"), `got ${fmtGap(-540)}`);
});

test("daysBetween counts whole days and survives DST", () => {
  assert.equal(daysBetween("2026-03-01", "2026-03-01"), 0);
  assert.equal(daysBetween("2026-03-01", "2026-03-08"), 7);
  assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2); // spans EU DST change
});

test("recentDays returns today first and the right count", () => {
  const d = recentDays(14, new Date("2026-08-01T12:00:00"));
  assert.equal(d.length, 14);
  assert.equal(d[0].label, "Today");
  assert.equal(d[1].label, "Yesterday");
  assert.equal(d[0].key, "2026-08-01");
  assert.equal(d[13].key, "2026-07-19");
  assert.equal(new Set(d.map((x) => x.key)).size, 14, "no duplicate days");
});

test("recentDays does not skip a day across a month boundary", () => {
  const d = recentDays(5, new Date("2026-03-02T12:00:00"));
  assert.deepEqual(d.map((x) => x.key), [
    "2026-03-02", "2026-03-01", "2026-02-28", "2026-02-27", "2026-02-26",
  ]);
});

// --- nutrient maths --------------------------------------------------------

test("itemTotals scales by portion and quantity", () => {
  const t = itemTotals([
    { qty: 2, food_items: food({ portion: 50, carbs: 10, protein: 4, fat: 2 }) },
  ]);
  // 50g portion x2 = 100g => exactly the per-100g values
  assert.equal(Math.round(t.carbs), 10);
  assert.equal(Math.round(t.protein), 4);
  assert.equal(Math.round(t.fat), 2);
});

test("itemTotals ignores rows whose food failed to join", () => {
  const t = itemTotals([{ qty: 1, food_items: null }]);
  assert.equal(t.carbs, 0);
});

test("macroPresence uses the documented thresholds", () => {
  assert.deepEqual(macroPresence({ carbs: 15, protein: 5, fat: 3 }), {
    carbs: true, protein: true, fat: true,
  });
  assert.equal(presenceCount(macroPresence({ carbs: 14.9, protein: 4.9, fat: 2.9 })), 0);
});

test("age band switches at 19 and defaults to adult when unknown", () => {
  const yr = new Date().getFullYear();
  assert.equal(ageBandFromBirthYear(yr - 15), "13-18");
  assert.equal(ageBandFromBirthYear(yr - 18), "13-18");
  assert.equal(ageBandFromBirthYear(yr - 19), "19plus");
  assert.equal(ageBandFromBirthYear(null), "19plus");
});

test("adolescent calcium reference is higher than adult", () => {
  assert.equal(referencesFor("13-18").calcium.floor, 1300);
  assert.equal(referencesFor("19plus").calcium.floor, 1000);
});

test("every displayed nutrient has a reference entry and a source", () => {
  for (const band of ["13-18", "19plus"] as const) {
    const refs = referencesFor(band);
    for (const k of NUTRIENT_ORDER) {
      assert.ok(refs[k], `${band}/${k} missing`);
      assert.ok(refs[k].source, `${band}/${k} has no source`);
      assert.ok(refs[k].basis.length > 10, `${band}/${k} has no basis text`);
    }
  }
});

test("fat has no invented floor", () => {
  assert.equal(referencesFor("19plus").fat.floor, null);
  assert.equal(referencesFor("13-18").fat.floor, null);
});

// --- day analysis ----------------------------------------------------------

test("computeAnalysis finds the longest gap between occasions", () => {
  const a = computeAnalysis(
    [
      entry({ mins_since_midnight: 480 }),
      entry({ mins_since_midnight: 780 }), // +5h
      entry({ mins_since_midnight: 900 }), // +2h
    ],
    1000,
    true
  );
  assert.equal(a.longestGap, 300);
  assert.equal(a.mealCount, 3);
});

test("computeAnalysis sorts unordered rows before computing gaps", () => {
  const a = computeAnalysis(
    [entry({ mins_since_midnight: 900 }), entry({ mins_since_midnight: 480 })],
    1000,
    true
  );
  assert.equal(a.firstMeal, 480);
  assert.equal(a.lastMeal, 900);
  assert.equal(a.longestGap, 420);
});

test("sinceLast is never negative when a meal is logged for later today", () => {
  // now = 10:00, meal logged at 19:00
  const a = computeAnalysis([entry({ mins_since_midnight: 1140 })], 600, true);
  assert.ok(a.sinceLast >= 0, `sinceLast was ${a.sinceLast}`);
  assert.equal(a.openGapFlag, false);
});

test("open gap only flags past the documented threshold", () => {
  const under = computeAnalysis([entry({ mins_since_midnight: 600 })], 600 + LONG_GAP_MINS, true);
  const over = computeAnalysis([entry({ mins_since_midnight: 600 })], 600 + LONG_GAP_MINS + 1, true);
  assert.equal(under.openGapFlag, false);
  assert.equal(over.openGapFlag, true);
});

test("a day with no entries produces no observations and no NaN", () => {
  const a = computeAnalysis([], 720, true);
  assert.equal(a.mealCount, 0);
  assert.equal(observations(a).length, 0);
  for (const k of NUTRIENT_ORDER) assert.ok(Number.isFinite(a.totals[k]), `${k} not finite`);
});

test("completeFuelCount counts only occasions carrying all three macros", () => {
  const full = entry({
    entry_items: [{ qty: 1, food_items: food({ carbs: 30, protein: 10, fat: 8 }) }],
  });
  const carbsOnly = entry({
    entry_items: [{ qty: 1, food_items: food({ carbs: 30 }) }],
  });
  const a = computeAnalysis([full, carbsOnly], 1200, true);
  assert.equal(a.completeFuelCount, 1);
});

test("felt-excessive episodes are counted and surfaced", () => {
  const a = computeAnalysis(
    [entry({ felt_excessive: true }), entry({ mins_since_midnight: 800 })],
    1200,
    true
  );
  assert.equal(a.excessiveCount, 1);
  assert.ok(observations(a).some((o) => o.text.includes("excessive")));
});

// --- across days -----------------------------------------------------------

test("overnight fast is computed across consecutive days only", () => {
  const shapes = computeDayShapes([
    entry({ entry_date: "2026-07-01", mins_since_midnight: 1200 }), // 20:00
    entry({ entry_date: "2026-07-02", mins_since_midnight: 480 }),  // 08:00
    entry({ entry_date: "2026-07-05", mins_since_midnight: 540 }),  // gap in the record
  ]);
  const byDate = Object.fromEntries(shapes.map((s) => [s.date, s]));
  assert.equal(byDate["2026-07-01"].overnightFast, 1440 - 1200 + 480); // 12h
  // 02 -> 05 is not consecutive, so no overnight figure is invented
  assert.equal(byDate["2026-07-02"].overnightFast, null);
  assert.equal(byDate["2026-07-05"].overnightFast, null);
});

test("computeDayShapes returns most recent first", () => {
  const shapes = computeDayShapes([
    entry({ entry_date: "2026-07-01" }),
    entry({ entry_date: "2026-07-03" }),
    entry({ entry_date: "2026-07-02" }),
  ]);
  assert.deepEqual(shapes.map((s) => s.date), ["2026-07-03", "2026-07-02", "2026-07-01"]);
});

test("computeDayShapes ignores rows with no entry_date rather than crashing", () => {
  const shapes = computeDayShapes([entry({ entry_date: undefined })]);
  assert.equal(shapes.length, 0);
});

// --- journal ---------------------------------------------------------------

test("every journal prompt id is unique across the whole bank", () => {
  const ids = [
    ...Object.values(JOURNAL_BANK).flat().map((p) => p.id),
    ...ADVANCED_FORMATS.flatMap((f) => f.prompts.map((p) => p.id)),
    OPEN_PROMPT.id,
  ];
  assert.equal(new Set(ids).size, ids.length, "duplicate prompt id would collide in stored answers");
});

test("todaysPrompts is stable for the same day and always offers free text", () => {
  const a = todaysPrompts("2026-07-01", "2026-07-05");
  const b = todaysPrompts("2026-07-01", "2026-07-05");
  assert.deepEqual(a, b);
  assert.ok(a.list.some((p) => p.id === OPEN_PROMPT.id));
  assert.equal(new Set(a.list.map((p) => p.id)).size, a.list.length, "no duplicate prompts");
});

test("todaysPrompts switches format after about a month and never throws", () => {
  const early = todaysPrompts("2026-01-01", "2026-01-10");
  const later = todaysPrompts("2026-01-01", "2026-02-15");
  assert.ok(early.title.startsWith("This week's theme"));
  assert.ok(!later.title.startsWith("This week's theme"));
  for (let d = 0; d < 400; d++) {
    const day = new Date("2026-01-01T12:00:00");
    day.setDate(day.getDate() + d);
    const p = todaysPrompts("2026-01-01", dayKey(day));
    assert.ok(p.list.length > 0, `day ${d} produced no prompts`);
    assert.ok(p.title.length > 0, `day ${d} produced no title`);
  }
});

test("todaysPrompts tolerates a signup date after today", () => {
  const p = todaysPrompts("2026-08-01", "2026-07-01");
  assert.ok(p.list.length > 0);
});

test("answeredPairs drops blanks and keeps the question as asked", () => {
  const pairs = answeredPairs({
    "hunger-1": { q: "Q one", a: "written" },
    "hunger-2": { q: "Q two", a: "   " },
  });
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].q, "Q one");
});

test("answeredPairs handles null/undefined stored answers", () => {
  assert.deepEqual(answeredPairs(null), []);
  assert.deepEqual(answeredPairs(undefined), []);
});

// --- facts -----------------------------------------------------------------

test("fact banks are non-empty and rotation is deterministic", () => {
  assert.ok(FOOD_FACTS.length > 0 && RECOVERY_INSIGHTS.length > 0);
  assert.equal(todaysFact("2026-08-01").id, todaysFact("2026-08-01").id);
  assert.equal(tonightsInsight("2026-08-01").id, tonightsInsight("2026-08-01").id);
});

test("fact ids are unique so React keys cannot collide", () => {
  const ids = [...FOOD_FACTS, ...RECOVERY_INSIGHTS].map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("responsiveFacts returns nothing for an empty day", () => {
  assert.deepEqual(responsiveFacts(computeAnalysis([], 720, true)), []);
});

test("responsiveFacts reacts to a long gap and explains itself", () => {
  const a = computeAnalysis(
    [entry({ mins_since_midnight: 480 }), entry({ mins_since_midnight: 480 + 400 })],
    1200,
    true
  );
  const facts = responsiveFacts(a);
  assert.ok(facts.length > 0);
  assert.ok(facts.every((f) => f.because.length > 0), "every fact must say why it appeared");
});

test("responsiveFacts prioritises a marked episode and is bounded", () => {
  const a = computeAnalysis(
    [entry({ felt_excessive: true }), entry({ mins_since_midnight: 480 })],
    1200,
    true
  );
  const facts = responsiveFacts(a, 3);
  assert.ok(facts.length <= 3);
  assert.equal(facts[0].id, "r-excessive");
});

// --- food search -----------------------------------------------------------

test("searchFoods ranks prefix matches first and caps results", () => {
  const foods = [
    food({ name: "Crackers, wheat" }),
    food({ name: "Chicken breast, cooked" }),
    food({ name: "Cream cheese" }),
    food({ name: "Carrot" }),
    food({ name: "Cabbage" }),
    food({ name: "Cashews" }),
    food({ name: "Cauliflower" }),
    food({ name: "Cod, cooked" }),
    food({ name: "Cucumber" }),
  ];
  const r = searchFoods(foods, "cra");
  assert.equal(r[0].name, "Crackers, wheat");
  assert.ok(searchFoods(foods, "c").length <= 7, "result list is capped");
});

test("searchFoods returns nothing for empty input", () => {
  assert.deepEqual(searchFoods([food()], "   "), []);
});
