import { daysBetween, stableIndex } from "@/lib/dates";

export const JOURNAL_BANK: Record<string, string[]> = {
  hunger: [
    "Where did you notice hunger today, and how did you respond to it?",
    "Was there a moment today when you were hungry and waited? What made waiting feel necessary?",
    "What does hunger feel like in your body right now, before you interpret it?",
  ],
  fullness: [
    "Did fullness feel like a problem today, or like information? What made the difference?",
    "Was there a meal you stopped before you were satisfied? What was the reason you gave yourself?",
    "What is the difference, for you, between full and satisfied?",
  ],
  bodyImage: [
    "What did your body do for you today that had nothing to do with how it looks?",
    "When body thoughts got loud today, what had just happened beforehand?",
    "If you treated your body like someone you love, what would you choose tomorrow?",
    "Did you check your body today? What were you hoping the check would tell you?",
  ],
  foodFears: [
    "Which food felt hardest today, and what did you predict would happen if you ate it?",
    "Name one food rule you followed today without deciding to. Where did it come from?",
    "What is one food you have not eaten in a long time that you actually used to enjoy?",
  ],
  socialEating: [
    "Did eating around other people change what or how much you ate today?",
    "Was there a social situation you avoided because food was involved?",
    "What would you have ordered today if no one, including you, was watching?",
  ],
  perfectionism: [
    "Did you rate today as a good day or a bad day? What did that rating rest on?",
    "Where did 'not doing it perfectly' feel like 'not doing it at all' today?",
    "What would 'good enough' have looked like today?",
  ],
  control: [
    "What emotion were you avoiding when you wanted to control food or movement today?",
    "What felt out of your control today that had nothing to do with food?",
    "If food were not available as a way to feel steady, what would you have reached for instead?",
  ],
  movement: [
    "Did you move today because you wanted to, or because you felt you had to?",
    "What happened in your body when you considered resting?",
    "Was any movement today a way of settling a feeling about eating?",
  ],
  values: [
    "What do you want your life to contain a year from now that restriction makes smaller?",
    "Which choice today moved you towards getting your cycle back?",
    "What would your recovery-focused self say about today, without flattery?",
  ],
  selfCompassion: [
    "What would you say to a friend who had exactly the day you had?",
    "Where were you harsher with yourself today than the situation deserved?",
    "Name one thing you did today that took courage, even if it looked small.",
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

export const ADVANCED_FORMATS = [
  { name: "Evidence for and against", prompts: [
    "Write down the loudest thought you had about your body or food today.",
    "What is the actual evidence that this thought is true?",
    "What is the evidence against it, including things you would count if a friend said them?",
  ]},
  { name: "Letter to your future self", prompts: [
    "Write to yourself one year into a recovered life. What do you want her to know about today?",
    "What is she doing that you cannot do yet?",
  ]},
  { name: "Behavioural chain", prompts: [
    "Describe one restrictive or compensatory urge today. What happened immediately before it?",
    "What feeling was underneath the urge?",
    "What did you do, and what happened afterwards — short term and longer term?",
  ]},
  { name: "The two voices", prompts: [
    "Write what the eating disorder said to you today, in its own words.",
    "Now answer it as the part of you that wants a cycle, energy and a life.",
  ]},
  { name: "Values check", prompts: [
    "Name one thing that matters to you that has nothing to do with food, weight or exercise.",
    "What did you do today that served it?",
    "What got in the way?",
  ]},
];

export type JournalPrompts = { title: string; list: string[] };

// Rotation is anchored to the SIGNED-UP person's own start date, not a
// shared calendar date — this is a private journal, so "week one" should
// look like week one no matter when someone joined the app.
export function todaysPrompts(signupDateIso: string, todayIso: string): JournalPrompts {
  const dayNumber = Math.max(0, daysBetween(signupDateIso, todayIso));
  const advanced = dayNumber % 60 >= 30; // switch formats after ~a month of use, alternate monthly after
  const weekIdx = Math.floor(dayNumber / 7);

  if (advanced) {
    const fmt = ADVANCED_FORMATS[Math.abs(weekIdx) % ADVANCED_FORMATS.length];
    return { title: fmt.name, list: fmt.prompts };
  }

  const theme = THEME_ORDER[Math.abs(weekIdx) % THEME_ORDER.length];
  const bank = JOURNAL_BANK[theme];
  const daily = [
    bank[Math.abs(dayNumber) % bank.length],
    JOURNAL_BANK.control[Math.abs(dayNumber) % JOURNAL_BANK.control.length],
    JOURNAL_BANK.selfCompassion[Math.abs(dayNumber + 1) % JOURNAL_BANK.selfCompassion.length],
  ];
  return { title: `This week's theme: ${THEME_LABELS[theme]}`, list: [...new Set(daily)] };
}
