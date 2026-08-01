import { stableIndex } from "@/lib/dates";

// Evidence-based facts on hormone health, bone health, and food variety —
// rotates once per calendar day, same fact for everyone on the same day
// (unlike journal prompts, there's no reason this needs to be per-user).
export const MORNING_FACTS: string[] = [
  "Iron from plant foods is absorbed better alongside vitamin C. Lentils with peppers or tomato is a practical pairing.",
  "Bone is living tissue that remodels continuously. Adequate calcium matters, but so does the oestrogen that low energy availability suppresses.",
  "Oily fish such as salmon, mackerel and sardines provide long-chain omega-3 fatty acids that the body cannot make efficiently from plant sources alone.",
  "Dietary fat is required to absorb vitamins A, D, E and K. A fat-free meal limits how much of those vitamins you take up.",
  "Cholesterol is the raw material your body uses to build oestrogen, progesterone and testosterone.",
  "Sardines eaten with their bones are one of the most concentrated food sources of calcium available.",
  "Calcium-set tofu can contain as much calcium per portion as dairy. Check the label for calcium sulphate.",
  "Blueberries, raspberries and other berries are high in polyphenols, plant compounds studied for their role in reducing oxidative stress.",
  "Vitamin D behaves more like a hormone than a vitamin. It regulates calcium absorption in the gut.",
  "Wholegrains supply B vitamins, magnesium and fibre that are largely stripped out during refining.",
  "Legumes deliver protein, iron, folate and fibre in the same portion — one of the most nutrient-dense combinations in the food supply.",
  "Fermented dairy such as yogurt and kefir provides calcium plus live cultures studied for gut microbial diversity.",
  "Nuts and seeds are the most reliable everyday source of vitamin E, magnesium and unsaturated fats.",
  "Leafy greens contain vitamin K, which is required for the proteins that bind calcium into bone.",
  "Zinc, found in meat, seeds, legumes and wholegrains, is involved in taste perception. Low zinc can blunt appetite.",
  "Carbohydrate is the brain's preferred fuel. The brain uses roughly a fifth of your daily energy at rest.",
  "Tea and coffee contain compounds that reduce non-haem iron absorption. Drinking them between meals rather than with them helps.",
  "Eggs supply choline, which is required for cell membranes and neurotransmitter production and is not abundant in many other foods.",
  "Soy foods contain isoflavones. Current evidence in humans does not support the idea that ordinary dietary intakes disrupt hormones.",
  "Fibre feeds gut bacteria that produce short-chain fatty acids used as fuel by the cells lining your colon.",
  "Dried fruit concentrates iron and potassium into a small volume, which makes it a practical option when appetite is limited.",
  "Vitamin B12 occurs naturally only in animal foods and fortified products. Deficiency develops slowly and affects nerves and blood cells.",
  "Magnesium, found in nuts, seeds, wholegrains and greens, is a cofactor in hundreds of enzyme reactions including energy production.",
  "Selenium, concentrated in brazil nuts and fish, is required to convert thyroid hormone T4 into its active form T3.",
  "Iodine is required to make thyroid hormone at all. Dairy, fish and iodised salt are the main dietary sources.",
  "Colour variety in plants generally tracks with variety in phytochemicals. Eating a wider range covers more ground than eating more of one thing.",
  "Protein needs are met more effectively when protein is spread across meals rather than concentrated in one.",
  "Full-fat dairy contains fat-soluble vitamins that are removed with the fat in skimmed versions.",
  "Vitamin C is water-soluble and not stored, so it needs to come in regularly rather than in occasional large amounts.",
  "Potatoes with skin provide potassium, vitamin C and fibre — they are a vegetable as well as a starch.",
  "Haem iron from meat and fish is absorbed several times more efficiently than non-haem iron from plants.",
  "Olive oil is a source of monounsaturated fat and polyphenols, and is a well-studied component of Mediterranean dietary patterns.",
  "Oats contain beta-glucan, a soluble fibre studied for its effects on cholesterol and on slowing gastric emptying.",
  "Folate, abundant in legumes and leafy greens, is required for making DNA and new red blood cells.",
  "Phosphorus works with calcium in bone mineral. It is widespread in protein foods, so intake usually follows protein intake.",
  "Fat contributes to the flavour, aroma and mouthfeel that signal satisfaction, not just fullness.",
  "Nuts are calorie-dense and nutrient-dense at once, which makes them useful when appetite is smaller than need.",
  "Vitamin A exists as retinol in animal foods and as carotenoids in orange and green plants. Both contribute to your intake.",
  "Sodium is an essential electrolyte. Very low intakes alongside low energy availability can worsen dizziness on standing.",
  "Whole fruit delivers fibre alongside its sugars, which changes how quickly the sugars reach your bloodstream.",
];

export const EVENING_INSIGHTS: string[] = [
  "Hypothalamic amenorrhoea reflects the brain reducing reproductive signalling when energy availability is low. It is a functional adaptation, not permanent damage.",
  "Energy availability is the energy left for basic physiology after exercise is accounted for. Menstrual function is sensitive to it independently of body weight.",
  "GnRH is released in pulses from the hypothalamus. Low energy availability disrupts the frequency of those pulses, which is what interrupts the cycle downstream.",
  "Body weight restoration and menstrual recovery often happen on different timelines. Cycles frequently return months after weight has stabilised.",
  "Low oestrogen accelerates bone loss. Bone mineral density gained during recovery is one of the strongest arguments for continued consistent nourishment.",
  "Leptin, produced by fat tissue, signals energy availability to the hypothalamus. It falls quickly during restriction and rises again with consistent intake.",
  "T3, the active thyroid hormone, drops during energy restriction. Cold hands and low body temperature often reflect this rather than a thyroid disease.",
  "The IOC consensus on Relative Energy Deficiency in Sport describes effects across bone, immunity, cardiovascular function, metabolism and mood — not the menstrual cycle alone.",
  "Resting metabolic rate can rise during refeeding. Some people need noticeably more food during recovery than they expect, and this is a normal adaptation.",
  "Bloating and delayed gastric emptying are common early in refeeding. Gut motility typically adapts over weeks as regular eating continues.",
  "Extreme hunger during recovery is a physiological signal of energy debt, not a loss of control.",
  "Bone stress injuries are more frequent in athletes with menstrual disruption. Cycle status is a useful clinical signal, not a cosmetic one.",
  "Exercise does not have to stop for recovery in every case, but reducing energy expenditure is one of the levers that raises energy availability.",
  "Fluid shifts and glycogen storage change scale weight substantially in the early phase of refeeding. Short-term weight movement is not fat gain.",
  "Cortisol tends to be elevated during energy restriction and typically normalises with consistent intake and reduced training stress.",
  "The Female Athlete Triad describes the relationship between low energy availability, menstrual dysfunction and low bone density.",
  "Oestrogen influences the gut, mood, sleep, skin, libido and cognition. Restoring a cycle affects more than fertility.",
  "Hormonal contraception can produce a withdrawal bleed but does not indicate that hypothalamic function has recovered.",
  "Under-fuelling suppresses immune function and slows tissue repair, which shows up as frequent illness and slow healing.",
  "Recovery of menstrual function generally requires consistency over weeks and months rather than a single high-intake day.",
  "Sleep quality often improves as energy availability rises. Nighttime waking and early waking are common features of undernutrition.",
  "Insufficient carbohydrate specifically, not just insufficient total energy, has been associated with menstrual disruption in athletes.",
  "Bone remodelling is slow. Meaningful change in bone density is measured over 12 months or more.",
  "Anxiety around meals often intensifies before it improves, because the behaviour that reduced anxiety short-term is being interrupted.",
  "Heart rate that is low during restriction and rises during refeeding is generally an expected physiological shift, but new symptoms should be reviewed medically.",
  "Body composition changes during recovery are typically not evenly distributed. Central redistribution early in refeeding usually redistributes over time.",
  "Appetite signalling — ghrelin and satiety hormones — can be unreliable early in recovery. Structured eating substitutes for cues until they return.",
  "Amenorrhoea lasting three months or more warrants medical assessment to exclude other causes such as thyroid disease or PCOS.",
  "Vitamin D and calcium support bone but do not replace oestrogen. Nutritional supplements alone do not restore hypothalamic function.",
  "Reduced training load, increased intake, or both can raise energy availability. Adding food is generally the better-tolerated route in recovery.",
  "The psychological recovery — reduced food preoccupation, more flexibility — often lags behind physical restoration by months.",
  "Constipation during recovery frequently reflects slowed transit and low intake rather than a need for fibre supplements.",
];

export function todaysFact(dateKey: string): string {
  return MORNING_FACTS[stableIndex(dateKey) % MORNING_FACTS.length];
}

export function tonightsInsight(dateKey: string): string {
  return EVENING_INSIGHTS[stableIndex(dateKey + "e") % EVENING_INSIGHTS.length];
}
