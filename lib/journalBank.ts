import { daysBetween } from "@/lib/dates";

/**
 * Every prompt carries a STABLE ID.
 *
 * Answers used to be stored keyed by the prompt text itself, which meant that
 * rewording a single prompt orphaned every answer previously written against
 * it. Ids are permanent: change the `text` freely, never the `id`, and never
 * reuse an id for a different question.
 */
export type Prompt = { id: string; text: string };

export const JOURNAL_BANK: Record<string, Prompt[]> = {
  hunger: [
    { id: "hunger-1", text: "Where did you notice hunger today, and how did you respond to it?" },
    { id: "hunger-2", text: "Was there a moment today when you were hungry and waited? What made waiting feel necessary?" },
    { id: "hunger-3", text: "What does hunger feel like in your body right now, before you interpret it?" },
  ],
  fullness: [
    { id: "fullness-1", text: "Did fullness feel like a problem today, or like information? What made the difference?" },
    { id: "fullness-2", text: "Was there a meal you stopped before you were satisfied? What was the reason you gave yourself?" },
    { id: "fullness-3", text: "What is the difference, for you, between full and satisfied?" },
  ],
  bodyImage: [
    { id: "body-1", text: "What did your body do for you today that had nothing to do with how it looks?" },
    { id: "body-2", text: "When body thoughts got loud today, what had just happened beforehand?" },
    { id: "body-3", text: "If you treated your body like someone you love, what would you choose tomorrow?" },
    { id: "body-4", text: "Did you check your body today? What were you hoping the check would tell you?" },
  ],
  foodFears: [
    { id: "fears-1", text: "Which food felt hardest today, and what did you predict would happen if you ate it?" },
    { id: "fears-2", text: "Name one food rule you followed today without deciding to. Where did it come from?" },
    { id: "fears-3", text: "What is one food you have not eaten in a long time that you actually used to enjoy?" },
  ],
  socialEating: [
    { id: "social-1", text: "Did eating around other people change what or how much you ate today?" },
    { id: "social-2", text: "Was there a social situation you avoided because food was involved?" },
    { id: "social-3", text: "What would you have ordered today if no one, including you, was watching?" },
  ],
  perfectionism: [
    { id: "perfect-1", text: "Did you rate today as a good day or a bad day? What did that rating rest on?" },
    { id: "perfect-2", text: "Where did 'not doing it perfectly' feel like 'not doing it at all' today?" },
    { id: "perfect-3", text: "What would 'good enough' have looked like today?" },
  ],
  control: [
    { id: "control-1", text: "What emotion were you avoiding when you wanted to control food or movement today?" },
    { id: "control-2", text: "What felt out of your control today that had nothing to do with food?" },
    { id: "control-3", text: "If food were not available as a way to feel steady, what would you have reached for instead?" },
  ],
  movement: [
    { id: "movement-1", text: "Did you move today because you wanted to, or because you felt you had to?" },
    { id: "movement-2", text: "What happened in your body when you considered resting?" },
    { id: "movement-3", text: "Was any movement today a way of settling a feeling about eating?" },
  ],
  values: [
    { id: "values-1", text: "What do you want your life to contain a year from now that restriction makes smaller?" },
    { id: "values-2", text: "Which choice today moved you towards getting your cycle back?" },
    { id: "values-3", text: "What would your recovery-focused self say about today, without flattery?" },
  ],
  selfCompassion: [
    { id: "compassion-1", text: "What would you say to a friend who had exactly the day you had?" },
    { id: "compassion-2", text: "Where were you harsher with yourself today than the situation deserved?" },
    { id: "compassion-3", text: "Name one thing you did today that took courage, even if it looked small." },
  ],
};

export const THEME_ORDER = [
  "hunger", "bodyImage", "control", "foodFears", "fullness",
  "perfectionism", "movement", "socialEating", "selfCompassion", "values",
] as const;

export const THEME_LABELS: Record<string, string> = {
  hunger: "Hunger", fullness: "Fullness", bodyImage: "Body image",
  foodFears: "Food fears", socialEating: "Social eating",
  perfectionism: "Perfectionism", control: "Control",
  movement: "Movement urges", values: "Recovery values",
  selfCompassion: "Self-compassion",
};

export const ADVANCED_FORMATS: { id: string; name: string; prompts: Prompt[] }[] = [
  {
    id: "evidence",
    name: "Evidence for and against",
    prompts: [
      { id: "evidence-1", text: "Write down the loudest thought you had about your body or food today." },
      { id: "evidence-2", text: "What is the actual evidence that this thought is true?" },
      { id: "evidence-3", text: "What is the evidence against it, including things you would count if a friend said them?" },
    ],
  },
  {
    id: "letter",
    name: "Letter to your future self",
    prompts: [
      { id: "letter-1", text: "Write to yourself one year into a recovered life. What do you want her to know about today?" },
      { id: "letter-2", text: "What is she doing that you cannot do yet?" },
    ],
  },
  {
    id: "chain",
    name: "Behavioural chain",
    prompts: [
      { id: "chain-1", text: "Describe one restrictive or compensatory urge today. What happened immediately before it?" },
      { id: "chain-2", text: "What feeling was underneath the urge?" },
      { id: "chain-3", text: "What did you do, and what happened afterwards — short term and longer term?" },
    ],
  },
  {
    id: "voices",
    name: "The two voices",
    prompts: [
      { id: "voices-1", text: "Write what the eating disorder said to you today, in its own words." },
      { id: "voices-2", text: "Now answer it as the part of you that wants a cycle, energy and a life." },
    ],
  },
  {
    id: "valuescheck",
    name: "Values check",
    prompts: [
      { id: "valuescheck-1", text: "Name one thing that matters to you that has nothing to do with food, weight or exercise." },
      { id: "valuescheck-2", text: "What did you do today that served it?" },
      { id: "valuescheck-3", text: "What got in the way?" },
    ],
  },
];

/** A free-text slot that is always offered alongside the prompts. */
export const OPEN_PROMPT: Prompt = {
  id: "open-1",
  text: "Anything else you want to put down, prompted or not.",
};

export type JournalPrompts = { title: string; list: Prompt[] };

// Rotation is anchored to the SIGNED-UP person's own start date, not a shared
// calendar date — this is a private journal, so "week one" should look like
// week one no matter when someone joined the app.
export function todaysPrompts(signupDateIso: string, todayIso: string): JournalPrompts {
  const dayNumber = Math.max(0, daysBetween(signupDateIso, todayIso));
  const advanced = dayNumber % 60 >= 30; // switch formats after ~a month, alternate monthly after
  const weekIdx = Math.floor(dayNumber / 7);

  if (advanced) {
    const fmt = ADVANCED_FORMATS[Math.abs(weekIdx) % ADVANCED_FORMATS.length];
    return { title: fmt.name, list: [...fmt.prompts, OPEN_PROMPT] };
  }

  const theme = THEME_ORDER[Math.abs(weekIdx) % THEME_ORDER.length];
  const bank = JOURNAL_BANK[theme];
  const daily = [
    bank[Math.abs(dayNumber) % bank.length],
    JOURNAL_BANK.control[Math.abs(dayNumber) % JOURNAL_BANK.control.length],
    JOURNAL_BANK.selfCompassion[Math.abs(dayNumber + 1) % JOURNAL_BANK.selfCompassion.length],
  ];
  // De-duplicate by id, since the themed pick can collide with the two fixed ones.
  const seen = new Set<string>();
  const list = daily.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  return { title: `This week's theme: ${THEME_LABELS[theme]}`, list: [...list, OPEN_PROMPT] };
}

// ---------------------------------------------------------------------------
// Stored shape
// ---------------------------------------------------------------------------

/**
 * What lives in journal_entries.answers.
 *
 * The question text is stored alongside each answer on purpose: it is how a
 * journal written in March still reads correctly in December after the prompt
 * bank has been reworked.
 */
export type StoredAnswer = { q: string; a: string };
export type StoredAnswers = Record<string, StoredAnswer>;

export function readAnswer(answers: StoredAnswers | null | undefined, id: string): string {
  return answers?.[id]?.a ?? "";
}

/** Every answered question in a saved entry, for the history view. */
export function answeredPairs(answers: StoredAnswers | null | undefined): StoredAnswer[] {
  if (!answers) return [];
  return Object.values(answers).filter((v) => v && typeof v.a === "string" && v.a.trim() !== "");
}
