import { stableIndex } from "@/lib/dates";
import type { Analysis } from "@/lib/analysis";
import { LONG_GAP_MINS } from "@/lib/analysis";
import { SOURCES, type SourceId } from "@/lib/nutrition";

export type Fact = {
  id: string;
  text: string;
  /** Where the claim comes from. Undefined = general nutrition science, see PROVENANCE. */
  source?: SourceId;
};

// Honest provenance note, shown on the Sources screen.
//
// Two different kinds of statement live in this file and they are NOT equally
// sourced:
//
//   FOOD_FACTS are textbook nutritional-science statements — which nutrient is
//   in which food, and what the body uses it for. They are not individually
//   referenced to a paper because they are not contested claims.
//
//   RECOVERY_INSIGHTS are clinical claims about eating disorders, energy
//   availability and menstrual function. Every one of those carries a specific
//   citation, because they ARE contested, consequential, and the reason
//   somebody would trust this app at all.
export const PROVENANCE =
  "Reference nutrient values come from the Institute of Medicine Dietary Reference Intakes. Clinical statements about energy availability, menstrual function and eating-disorder treatment are individually referenced to the IOC REDs consensus statement, NICE guideline NG69, or Fairburn's CBT-E manual. General statements about which nutrients occur in which foods are standard nutritional science and are not individually referenced. Nothing here is personal medical advice, and none of it is a substitute for assessment by a doctor or a registered dietitian.";

export const FOOD_FACTS: Fact[] = [
  { id: "iron-vitc", text: "Iron from plant foods is absorbed better alongside vitamin C. Lentils with peppers or tomato is a practical pairing." },
  { id: "bone-remodel", text: "Bone is living tissue that remodels continuously. Adequate calcium matters, but so does the oestrogen that low energy availability suppresses.", source: "reds" },
  { id: "omega3", text: "Oily fish such as salmon, mackerel and sardines provide long-chain omega-3 fatty acids that the body cannot make efficiently from plant sources alone." },
  { id: "fat-soluble", text: "Dietary fat is required to absorb vitamins A, D, E and K. A fat-free meal limits how much of those vitamins you take up.", source: "dri-macro" },
  { id: "cholesterol-hormones", text: "Cholesterol is the raw material your body uses to build oestrogen, progesterone and testosterone." },
  { id: "sardines-bones", text: "Sardines eaten with their bones are one of the most concentrated food sources of calcium available." },
  { id: "tofu-calcium", text: "Calcium-set tofu can contain as much calcium per portion as dairy. Check the label for calcium sulphate." },
  { id: "berries", text: "Blueberries, raspberries and other berries are high in polyphenols, plant compounds studied for their role in reducing oxidative stress." },
  { id: "vit-d", text: "Vitamin D behaves more like a hormone than a vitamin. It regulates calcium absorption in the gut.", source: "dri-calcium" },
  { id: "wholegrains", text: "Wholegrains supply B vitamins, magnesium and fibre that are largely stripped out during refining." },
  { id: "legumes", text: "Legumes deliver protein, iron, folate and fibre in the same portion — one of the most nutrient-dense combinations in the food supply." },
  { id: "fermented-dairy", text: "Fermented dairy such as yogurt and kefir provides calcium plus live cultures studied for gut microbial diversity." },
  { id: "nuts-vite", text: "Nuts and seeds are the most reliable everyday source of vitamin E, magnesium and unsaturated fats." },
  { id: "vit-k", text: "Leafy greens contain vitamin K, which is required for the proteins that bind calcium into bone." },
  { id: "zinc-appetite", text: "Zinc, found in meat, seeds, legumes and wholegrains, is involved in taste perception. Low zinc can blunt appetite." },
  { id: "brain-glucose", text: "Carbohydrate is the brain's preferred fuel. The brain uses roughly a fifth of your daily energy at rest, and the carbohydrate reference value is set from that requirement alone.", source: "dri-macro" },
  { id: "tea-iron", text: "Tea and coffee contain compounds that reduce non-haem iron absorption. Drinking them between meals rather than with them helps.", source: "dri-iron" },
  { id: "eggs-choline", text: "Eggs supply choline, which is required for cell membranes and neurotransmitter production and is not abundant in many other foods." },
  { id: "soy", text: "Soy foods contain isoflavones. Current evidence in humans does not support the idea that ordinary dietary intakes disrupt hormones." },
  { id: "fibre-scfa", text: "Fibre feeds gut bacteria that produce short-chain fatty acids used as fuel by the cells lining your colon." },
  { id: "dried-fruit", text: "Dried fruit concentrates iron and potassium into a small volume, which makes it a practical option when appetite is limited." },
  { id: "b12", text: "Vitamin B12 occurs naturally only in animal foods and fortified products. Deficiency develops slowly and affects nerves and blood cells." },
  { id: "magnesium", text: "Magnesium, found in nuts, seeds, wholegrains and greens, is a cofactor in hundreds of enzyme reactions including energy production." },
  { id: "selenium", text: "Selenium, concentrated in brazil nuts and fish, is required to convert thyroid hormone T4 into its active form T3." },
  { id: "iodine", text: "Iodine is required to make thyroid hormone at all. Dairy, fish and iodised salt are the main dietary sources." },
  { id: "colour-variety", text: "Colour variety in plants generally tracks with variety in phytochemicals. Eating a wider range covers more ground than eating more of one thing." },
  { id: "protein-spread", text: "Protein needs are met more effectively when protein is spread across meals rather than concentrated in one." },
  { id: "full-fat-dairy", text: "Full-fat dairy contains fat-soluble vitamins that are removed with the fat in skimmed versions." },
  { id: "vit-c", text: "Vitamin C is water-soluble and not stored, so it needs to come in regularly rather than in occasional large amounts." },
  { id: "potatoes", text: "Potatoes with skin provide potassium, vitamin C and fibre — they are a vegetable as well as a starch." },
  { id: "haem-iron", text: "Haem iron from meat and fish is absorbed several times more efficiently than non-haem iron from plants.", source: "dri-iron" },
  { id: "olive-oil", text: "Olive oil is a source of monounsaturated fat and polyphenols, and is a well-studied component of Mediterranean dietary patterns." },
  { id: "oats-betaglucan", text: "Oats contain beta-glucan, a soluble fibre studied for its effects on cholesterol and on slowing gastric emptying." },
  { id: "folate", text: "Folate, abundant in legumes and leafy greens, is required for making DNA and new red blood cells." },
  { id: "phosphorus", text: "Phosphorus works with calcium in bone mineral. It is widespread in protein foods, so intake usually follows protein intake." },
  { id: "fat-flavour", text: "Fat contributes to the flavour, aroma and mouthfeel that signal satisfaction, not just fullness." },
  { id: "nuts-dense", text: "Nuts are energy-dense and nutrient-dense at once, which makes them useful when appetite is smaller than need." },
  { id: "vit-a", text: "Vitamin A exists as retinol in animal foods and as carotenoids in orange and green plants. Both contribute to your intake." },
  { id: "sodium", text: "Sodium is an essential electrolyte. Very low intakes alongside low energy availability can worsen dizziness on standing." },
  { id: "whole-fruit", text: "Whole fruit delivers fibre alongside its sugars, which changes how quickly the sugars reach your bloodstream." },
];

export const RECOVERY_INSIGHTS: Fact[] = [
  { id: "ha-functional", text: "Hypothalamic amenorrhoea reflects the brain reducing reproductive signalling when energy availability is low. It is a functional adaptation, not permanent damage.", source: "reds" },
  { id: "ea-definition", text: "Energy availability is the energy left for basic physiology after exercise is accounted for. Menstrual function is sensitive to it independently of body weight.", source: "reds" },
  { id: "gnrh", text: "GnRH is released in pulses from the hypothalamus. Low energy availability disrupts the frequency of those pulses, which is what interrupts the cycle downstream.", source: "reds" },
  { id: "timelines", text: "Body weight restoration and menstrual recovery often happen on different timelines. Cycles frequently return months after weight has stabilised.", source: "reds" },
  { id: "bone-loss", text: "Low oestrogen accelerates bone loss. Bone mineral density gained during recovery is one of the strongest arguments for continued consistent nourishment.", source: "reds" },
  { id: "leptin", text: "Leptin, produced by fat tissue, signals energy availability to the hypothalamus. It falls quickly during restriction and rises again with consistent intake.", source: "reds" },
  { id: "t3", text: "T3, the active thyroid hormone, drops during energy restriction. Cold hands and low body temperature often reflect this rather than a thyroid disease.", source: "reds" },
  { id: "reds-scope", text: "The IOC consensus on Relative Energy Deficiency in Sport describes effects across bone, immunity, cardiovascular function, metabolism and mood — not the menstrual cycle alone.", source: "reds" },
  { id: "rmr-rise", text: "Resting metabolic rate can rise during refeeding. Some people need noticeably more food during recovery than they expect, and this is a normal adaptation.", source: "nice-ng69" },
  { id: "gastric", text: "Bloating and delayed gastric emptying are common early in refeeding. Gut motility typically adapts over weeks as regular eating continues.", source: "nice-ng69" },
  { id: "extreme-hunger", text: "Extreme hunger during recovery is a physiological signal of energy debt, not a loss of control.", source: "nice-ng69" },
  { id: "bone-stress", text: "Bone stress injuries are more frequent in athletes with menstrual disruption. Cycle status is a useful clinical signal, not a cosmetic one.", source: "reds" },
  { id: "exercise-lever", text: "Exercise does not have to stop for recovery in every case, but reducing energy expenditure is one of the levers that raises energy availability.", source: "reds" },
  { id: "fluid-shifts", text: "Fluid shifts and glycogen storage change scale weight substantially in the early phase of refeeding. Short-term weight movement is not fat gain.", source: "nice-ng69" },
  { id: "cortisol", text: "Cortisol tends to be elevated during energy restriction and typically normalises with consistent intake and reduced training stress.", source: "reds" },
  { id: "triad", text: "The Female Athlete Triad describes the relationship between low energy availability, menstrual dysfunction and low bone density.", source: "reds" },
  { id: "oestrogen-scope", text: "Oestrogen influences the gut, mood, sleep, skin, libido and cognition. Restoring a cycle affects more than fertility.", source: "reds" },
  { id: "contraception", text: "Hormonal contraception can produce a withdrawal bleed but does not indicate that hypothalamic function has recovered.", source: "reds" },
  { id: "immune", text: "Under-fuelling suppresses immune function and slows tissue repair, which shows up as frequent illness and slow healing.", source: "reds" },
  { id: "consistency", text: "Recovery of menstrual function generally requires consistency over weeks and months rather than a single high-intake day.", source: "reds" },
  { id: "sleep", text: "Sleep quality often improves as energy availability rises. Nighttime waking and early waking are common features of undernutrition.", source: "nice-ng69" },
  { id: "carb-specific", text: "Insufficient carbohydrate specifically, not just insufficient total energy, has been associated with menstrual disruption in athletes.", source: "reds" },
  { id: "bone-slow", text: "Bone remodelling is slow. Meaningful change in bone density is measured over 12 months or more.", source: "reds" },
  { id: "anxiety-first", text: "Anxiety around meals often intensifies before it improves, because the behaviour that reduced anxiety short-term is being interrupted.", source: "cbte" },
  { id: "heart-rate", text: "Heart rate that is low during restriction and rises during refeeding is generally an expected physiological shift, but new symptoms should be reviewed medically.", source: "nice-ng69" },
  { id: "redistribution", text: "Body composition changes during recovery are typically not evenly distributed. Central redistribution early in refeeding usually redistributes over time.", source: "nice-ng69" },
  { id: "appetite-cues", text: "Appetite signalling — ghrelin and satiety hormones — can be unreliable early in recovery. Structured eating substitutes for cues until they return.", source: "cbte" },
  { id: "amenorrhoea-assess", text: "Amenorrhoea lasting three months or more warrants medical assessment to exclude other causes such as thyroid disease or PCOS.", source: "nice-ng69" },
  { id: "supplements", text: "Vitamin D and calcium support bone but do not replace oestrogen. Nutritional supplements alone do not restore hypothalamic function.", source: "reds" },
  { id: "raise-ea", text: "Reduced training load, increased intake, or both can raise energy availability. Adding food is generally the better-tolerated route in recovery.", source: "reds" },
  { id: "psych-lag", text: "The psychological recovery — reduced food preoccupation, more flexibility — often lags behind physical restoration by months.", source: "cbte" },
  { id: "constipation", text: "Constipation during recovery frequently reflects slowed transit and low intake rather than a need for fibre supplements.", source: "nice-ng69" },
  { id: "regular-eating", text: "Regular eating — roughly every three to four hours, planned in advance rather than decided by appetite — is the first behavioural change made in CBT-E, and the one most consistently associated with fewer episodes of loss of control.", source: "cbte" },
  { id: "restraint-binge", text: "Dietary restraint is a maintaining mechanism for binge eating, not a treatment for it. Episodes of loss of control are usually preceded by undereating rather than caused by a lack of willpower.", source: "cbte" },
];

export function todaysFact(dateKey: string): Fact {
  return FOOD_FACTS[stableIndex(dateKey) % FOOD_FACTS.length];
}

export function tonightsInsight(dateKey: string): Fact {
  return RECOVERY_INSIGHTS[stableIndex(dateKey + "e") % RECOVERY_INSIGHTS.length];
}

export function sourceLabel(fact: Fact): string | null {
  return fact.source ? SOURCES[fact.source].short : null;
}

// ---------------------------------------------------------------------------
// Facts that respond to what was actually logged
// ---------------------------------------------------------------------------

/**
 * The app used to pick its fact from a hash of the date, so the same fact
 * appeared for everyone regardless of what they ate. These are selected from
 * the day's own log instead, and each one states why it appeared.
 */
export type ResponsiveFact = Fact & { because: string };

type Rule = { fact: Fact; because: string; when: (a: Analysis) => boolean };

const has = (a: Analysis, group: string) => a.groups.includes(group);
const ate = (a: Analysis, name: string) => a.names.has(name);

const RULES: Rule[] = [
  {
    fact: {
      id: "r-excessive",
      text: "Episodes that feel excessive or out of control are, far more often than not, downstream of undereating earlier in the day rather than a separate failure of will. Restraint maintains them; regular adequate eating is what reduces them.",
      source: "cbte",
    },
    because: "you marked an eating occasion as feeling excessive today",
    when: (a) => a.excessiveCount > 0,
  },
  {
    fact: {
      id: "r-long-gap",
      text: "Long gaps between eating occasions are one of the strongest predictors of a later episode of loss of control. Regular eating every three to four hours, planned rather than decided by appetite, is the first change made in CBT-E for exactly this reason.",
      source: "cbte",
    },
    because: "there was a gap over 3 h 30 min in today's log",
    when: (a) => a.longestGap > LONG_GAP_MINS,
  },
  {
    fact: {
      id: "r-no-carbs",
      text: "The carbohydrate reference value is set from the amount of glucose the brain alone consumes, before any physical activity is counted. Days built without carbohydrate ask the body to make glucose from other tissue instead.",
      source: "dri-macro",
    },
    because: "carbohydrate was absent from most of what you logged",
    when: (a) => a.mealCount >= 2 && a.occasions.filter((o) => !o.presence.carbs).length >= a.mealCount - 1,
  },
  {
    fact: {
      id: "r-no-fat",
      text: "Vitamins A, D, E and K are fat-soluble: without dietary fat in the meal they largely pass through rather than being absorbed. A low-fat day therefore limits several nutrients at once, including the vitamin D that governs how much calcium you take up.",
      source: "dri-macro",
    },
    because: "fat was absent from most of what you logged",
    when: (a) => a.mealCount >= 2 && a.occasions.filter((o) => !o.presence.fat).length >= a.mealCount - 1,
  },
  {
    fact: {
      id: "r-volume",
      text: "Low-energy-density foods fill the stomach without closing an energy deficit. Fullness and adequacy are different things, and it is the deficit rather than the fullness that keeps a cycle suppressed.",
      source: "reds",
    },
    because: "today leaned towards high-volume, low-density foods",
    when: (a) => {
      const total = a.densities.low + a.densities.medium + a.densities.high;
      return total >= 4 && a.densities.high / total < 0.2;
    },
  },
  {
    fact: {
      id: "r-calcium-bone",
      text: "Calcium is the mineral bone is built from, but oestrogen is what keeps it there. During amenorrhoea, calcium intake matters more than usual precisely because the hormonal protection is missing.",
      source: "reds",
    },
    because: "calcium came in well under the reference floor today",
    when: (a) => a.mealCount > 0 && a.totals.calcium < 600,
  },
  {
    fact: {
      id: "r-iron-vitc",
      text: "Iron from legumes, greens and wholegrains is non-haem iron, absorbed several times less efficiently than the iron in meat and fish. Vitamin C in the same meal measurably increases uptake — peppers, tomato, citrus or kiwi alongside the legumes does the job.",
      source: "dri-iron",
    },
    because: "your iron today came mainly from plant sources",
    when: (a) => has(a, "legumes") && !has(a, "protein"),
  },
  {
    fact: {
      id: "r-tea-iron",
      text: "Tea and coffee contain polyphenols that bind non-haem iron in the gut and reduce how much of it you absorb. Moving them to between meals rather than alongside them keeps the iron in your food available to you.",
      source: "dri-iron",
    },
    because: "you logged tea or coffee today",
    when: (a) => ate(a, "Tea") || ate(a, "Coffee with milk"),
  },
  {
    fact: {
      id: "r-oily-fish",
      text: "Oily fish provides long-chain omega-3 fatty acids (EPA and DHA) that the body converts only inefficiently from plant sources. It is also one of the few foods that supplies vitamin D directly.",
    },
    because: "you logged oily fish today",
    when: (a) =>
      ate(a, "Salmon, cooked") || ate(a, "Mackerel, cooked") || ate(a, "Sardines, canned in oil"),
  },
  {
    fact: {
      id: "r-complete-fuel",
      text: "Meals carrying carbohydrate, fat and protein together empty from the stomach more slowly and hold blood glucose steadier than meals built from one of the three. That steadiness is what makes the next planned meal feel manageable rather than urgent.",
      source: "dri-macro",
    },
    because: "every eating occasion today carried all three macronutrients",
    when: (a) => a.mealCount >= 3 && a.completeFuelCount === a.mealCount,
  },
  {
    fact: {
      id: "r-dense",
      text: "Nuts, seeds, oils and dried fruit deliver energy and micronutrients in a small volume. When appetite is smaller than physiological need — which is usual early in recovery — density does work that volume cannot.",
      source: "nice-ng69",
    },
    because: "energy-dense foods appeared in today's log",
    when: (a) => {
      const total = a.densities.low + a.densities.medium + a.densities.high;
      return total > 0 && a.densities.high / total >= 0.25;
    },
  },
  {
    fact: {
      id: "r-variety",
      text: "Micronutrient coverage is achieved through variety rather than by tracking individual nutrients. Each additional food group widens the range of vitamins and minerals reaching you without requiring you to eat more overall.",
    },
    because: "you covered five or more food groups today",
    when: (a) => a.groups.length >= 5,
  },
];

/** Facts drawn from today's own log. Returns at most `limit`, most specific first. */
export function responsiveFacts(a: Analysis, limit = 3): ResponsiveFact[] {
  if (a.mealCount === 0) return [];
  return RULES.filter((r) => r.when(a))
    .slice(0, limit)
    .map((r) => ({ ...r.fact, because: r.because }));
}
