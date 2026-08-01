// Reference nutrient values, the sources they come from, and the rules the
// app uses to talk about them.
//
// Two principles hold everywhere in this file:
//
//   1. Every figure is a FLOOR — the level below which deficiency risk rises.
//      Never a target to hit exactly, never a ceiling. Needs during recovery
//      from low energy availability are routinely higher than these.
//   2. Nothing is stated without a source. Anything that is an app heuristic
//      rather than a published reference value says so in as many words.

export type AgeBand = "13-18" | "19plus";

export type SourceId = "dri-macro" | "dri-iron" | "dri-calcium" | "reds" | "nice-ng69" | "cbte";

export type Source = {
  id: SourceId;
  short: string;
  full: string;
};

// Full citations for everything quoted in the app. `short` is what appears
// inline next to a figure; `full` is shown on the Sources screen.
export const SOURCES: Record<SourceId, Source> = {
  "dri-macro": {
    id: "dri-macro",
    short: "IOM DRI 2005",
    full:
      "Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. Washington DC: National Academies Press, 2005.",
  },
  "dri-iron": {
    id: "dri-iron",
    short: "IOM DRI 2001",
    full:
      "Institute of Medicine. Dietary Reference Intakes for Vitamin A, Vitamin K, Arsenic, Boron, Chromium, Copper, Iodine, Iron, Manganese, Molybdenum, Nickel, Silicon, Vanadium and Zinc. Washington DC: National Academies Press, 2001.",
  },
  "dri-calcium": {
    id: "dri-calcium",
    short: "IOM DRI 2011",
    full:
      "Institute of Medicine. Dietary Reference Intakes for Calcium and Vitamin D. Washington DC: National Academies Press, 2011.",
  },
  reds: {
    id: "reds",
    short: "IOC REDs 2023",
    full:
      "Mountjoy M, Ackerman KE, Bailey DM, et al. 2023 International Olympic Committee's (IOC) consensus statement on Relative Energy Deficiency in Sport (REDs). British Journal of Sports Medicine, 2023;57:1073-1098.",
  },
  "nice-ng69": {
    id: "nice-ng69",
    short: "NICE NG69",
    full:
      "National Institute for Health and Care Excellence. Eating disorders: recognition and treatment. NICE guideline NG69, 2017 (updated 2020).",
  },
  cbte: {
    id: "cbte",
    short: "Fairburn 2008",
    full:
      "Fairburn CG. Cognitive Behavior Therapy and Eating Disorders. New York: Guilford Press, 2008. (Source of the real-time monitoring record this app's meal log is modelled on.)",
  },
};

export type NutrientKey = "protein" | "carbs" | "fat" | "fibre" | "iron" | "calcium";

export type NutrientReference = {
  label: string;
  unit: string;
  /** Daily reference floor. null means no published floor exists for this nutrient. */
  floor: number | null;
  source: SourceId;
  /** What the reference actually is, in plain words. */
  basis: string;
};

// Female reference values by age band. Adolescent figures are genuinely
// different — calcium is 1300 mg/d rather than 1000, because peak bone mass
// is being laid down — which is why the app asks for a year of birth.
const REFERENCE_BY_BAND: Record<AgeBand, Record<NutrientKey, NutrientReference>> = {
  "13-18": {
    protein: {
      label: "Protein",
      unit: "g",
      floor: 46,
      source: "dri-macro",
      basis: "RDA, females 14-18 years.",
    },
    carbs: {
      label: "Carbohydrate",
      unit: "g",
      floor: 130,
      source: "dri-macro",
      basis:
        "RDA, all ages over 1 year. Set from the amount of glucose the brain uses, so it is a minimum for brain function alone — not an activity allowance.",
    },
    fat: {
      label: "Fat",
      unit: "g",
      floor: null,
      source: "dri-macro",
      basis:
        "No gram floor is published for total fat. The reference is 25-35% of energy intake (females 14-18), which this app cannot compute because it deliberately holds no calorie figures. Shown as an amount so it stays visible.",
    },
    fibre: {
      label: "Fibre",
      unit: "g",
      floor: 26,
      source: "dri-macro",
      basis: "Adequate Intake, females 14-18 years.",
    },
    iron: {
      label: "Iron",
      unit: "mg",
      floor: 15,
      source: "dri-iron",
      basis: "RDA, females 14-18 years.",
    },
    calcium: {
      label: "Calcium",
      unit: "mg",
      floor: 1300,
      source: "dri-calcium",
      basis:
        "RDA, females 9-18 years. Higher than the adult figure because most adult bone mass is laid down before about age 20.",
    },
  },
  "19plus": {
    protein: {
      label: "Protein",
      unit: "g",
      floor: 46,
      source: "dri-macro",
      basis: "RDA, females 19-50 years.",
    },
    carbs: {
      label: "Carbohydrate",
      unit: "g",
      floor: 130,
      source: "dri-macro",
      basis:
        "RDA, all ages over 1 year. Set from the amount of glucose the brain uses, so it is a minimum for brain function alone — not an activity allowance.",
    },
    fat: {
      label: "Fat",
      unit: "g",
      floor: null,
      source: "dri-macro",
      basis:
        "No gram floor is published for total fat. The reference is 20-35% of energy intake, which this app cannot compute because it deliberately holds no calorie figures. Shown as an amount so it stays visible.",
    },
    fibre: {
      label: "Fibre",
      unit: "g",
      floor: 25,
      source: "dri-macro",
      basis: "Adequate Intake, females 19-50 years.",
    },
    iron: {
      label: "Iron",
      unit: "mg",
      floor: 18,
      source: "dri-iron",
      basis:
        "RDA, menstruating females 19-50 years. If periods have stopped, iron losses are lower — but the figure is kept here because restoring a cycle is the goal.",
    },
    calcium: {
      label: "Calcium",
      unit: "mg",
      floor: 1000,
      source: "dri-calcium",
      basis: "RDA, females 19-50 years.",
    },
  },
};

/** Order nutrients are displayed in. Macros first — they are the ones the day is built from. */
export const NUTRIENT_ORDER: NutrientKey[] = ["carbs", "protein", "fat", "fibre", "iron", "calcium"];

export function ageBandFromBirthYear(birthYear: number | null | undefined): AgeBand {
  if (!birthYear) return "19plus"; // adult references are the safer default when unknown
  const age = new Date().getFullYear() - birthYear;
  return age < 19 ? "13-18" : "19plus";
}

export function referencesFor(band: AgeBand) {
  return REFERENCE_BY_BAND[band];
}

// ---------------------------------------------------------------------------
// Fuel consistency
// ---------------------------------------------------------------------------

// Thresholds for calling a macro "present" in a single eating occasion.
//
// THESE ARE APP HEURISTICS, NOT PUBLISHED CUTOFFS. No guideline defines the
// gram amount at which a meal "contains protein". They are set low on purpose:
// the aim is to notice a meal built from one macro alone, not to grade meals.
export const PRESENCE_THRESHOLD = { carbs: 15, protein: 5, fat: 3 } as const;

export type MacroPresence = { carbs: boolean; protein: boolean; fat: boolean };

export function macroPresence(totals: { carbs: number; protein: number; fat: number }): MacroPresence {
  return {
    carbs: totals.carbs >= PRESENCE_THRESHOLD.carbs,
    protein: totals.protein >= PRESENCE_THRESHOLD.protein,
    fat: totals.fat >= PRESENCE_THRESHOLD.fat,
  };
}

export function presenceCount(p: MacroPresence): number {
  return Number(p.carbs) + Number(p.protein) + Number(p.fat);
}

// Why all three together matters, in the app's own words. Grounded in the
// REDs consensus: it is total energy availability across the day, not any one
// nutrient, that governs whether reproductive and bone function recover.
export const FUEL_RATIONALE =
  "Carbohydrate, fat and protein do different jobs, and a meal missing one of them tends to be a meal that runs out early. Carbohydrate is the fuel your brain uses directly; fat carries vitamins A, D, E and K and is the raw material for hormone production; protein is what tissue repair is built from. Meals that carry all three are what make a steady day possible.";
