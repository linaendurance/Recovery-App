/**
 * Crisis and support resources.
 *
 * Previously hardcoded into the footer as a UK/US block. That is fine for an
 * invite-only app among people in one place, and wrong the moment strangers
 * from anywhere can sign up: an out-of-date or out-of-region crisis number is
 * worse than none, because it costs someone the attempt.
 *
 * VERIFICATION STATUS IS PART OF THE DATA. Nothing here is presented to a user
 * as authoritative unless `verified` is true. Anything still false is shown
 * with a "check this number" caveat rather than silently trusted, and the app
 * always falls back to "search for your local service" rather than guessing.
 *
 * TO ADD A REGION: append an entry, set verified only after someone has
 * actually called or checked the number against the provider's own site, and
 * record the date in `checkedOn`.
 */
export type Resource = {
  name: string;
  detail: string;
  /** Freephone/短 number, shown in monospace. Optional — some are web-only. */
  contact?: string;
  url?: string;
  /** True only when a human has confirmed this against the provider's own site. */
  verified: boolean;
  checkedOn?: string;
};

export type Region = {
  code: string;
  label: string;
  emergency: string;
  resources: Resource[];
};

export const REGIONS: Region[] = [
  {
    code: "GB",
    label: "United Kingdom",
    emergency: "999",
    resources: [
      {
        name: "Beat",
        detail: "The UK's eating disorder charity. Helpline, webchat and support groups.",
        contact: "0808 801 0677",
        url: "https://www.beateatingdisorders.org.uk",
        verified: true, checkedOn: "2026-08-03",
      },
      {
        name: "Samaritans",
        detail: "Any kind of distress, 24 hours a day, every day.",
        contact: "116 123",
        url: "https://www.samaritans.org",
        verified: true, checkedOn: "2026-08-03",
      },
      {
        name: "NHS 111",
        detail: "Urgent medical advice when it is not an emergency.",
        contact: "111",
        url: "https://111.nhs.uk",
        verified: true, checkedOn: "2026-08-03",
      },
    ],
  },
  {
    code: "US",
    label: "United States",
    emergency: "911",
    resources: [
      {
        name: "988 Suicide & Crisis Lifeline",
        detail: "Call or text, 24 hours a day.",
        contact: "988",
        url: "https://988lifeline.org",
        verified: true, checkedOn: "2026-08-03",
      },
      {
        name: "ANAD Helpline",
        detail: "Eating disorder support and treatment referrals.",
        url: "https://anad.org/eating-disorders-helpline",
        verified: true, checkedOn: "2026-08-03",
      },
    ],
  },
  {
    code: "IE",
    label: "Ireland",
    emergency: "112",
    resources: [
      {
        name: "Bodywhys",
        detail: "The Irish eating disorder association.",
        url: "https://www.bodywhys.ie",
        verified: true, checkedOn: "2026-08-03",
      },
      {
        name: "Samaritans",
        detail: "Any kind of distress, 24 hours a day.",
        contact: "116 123",
        url: "https://www.samaritans.org",
        verified: true, checkedOn: "2026-08-03",
      },
    ],
  },

  // ---------------------------------------------------------------------
  // EUROPE AND THE BALKANS
  //
  // EVERY ENTRY BELOW IS verified: false, ON PURPOSE. They were compiled
  // from general knowledge, not checked against each provider's own site,
  // so the app shows them with the "not yet independently checked" caveat.
  // Do not flip any of them to true without opening that provider's page —
  // or calling the number — and recording the date.
  //
  // Two things are worth knowing while checking them:
  //
  //   1. 112 is the emergency number across the whole EU and every country
  //      listed here. It is the one figure in this block that is safe to
  //      rely on today.
  //   2. Most of these countries have NO dedicated eating-disorder
  //      helpline. Saying so in `detail` is more useful than implying one
  //      exists — somebody who calls a general crisis line knowing that is
  //      better served than somebody who expects specialist help.
  // ---------------------------------------------------------------------
  {
    code: "EU",
    label: "Elsewhere in Europe",
    emergency: "112",
    resources: [
      {
        name: "116 123 — emotional support",
        detail:
          "An EU-harmonised number for emotional distress, run by a different organisation in each country. Availability and hours vary; in some countries it is not yet active.",
        contact: "116 123",
        verified: false,
      },
      {
        name: "116 111 — children and young people",
        detail: "The EU-harmonised helpline for under-18s, again run nationally.",
        contact: "116 111",
        verified: false,
      },
      {
        name: "Find a Helpline",
        detail:
          "A maintained directory of verified crisis lines by country. More reliable than any single number in this app, because it is kept up to date by people whose job that is.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
  {
    code: "RS",
    label: "Serbia / Србија",
    emergency: "112",
    resources: [
      {
        name: "Centar Srce",
        detail: "Free, confidential support for people in emotional distress or despair.",
        contact: "0800 300 303",
        url: "https://www.centarsrce.rs",
        verified: false,
      },
      {
        name: "Find a Helpline — Serbia",
        detail: "Directory of checked services. There is no dedicated eating-disorder helpline.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
  {
    code: "HR",
    label: "Croatia / Hrvatska",
    emergency: "112",
    resources: [
      {
        name: "Plavi telefon",
        detail: "Psychological support and crisis counselling.",
        contact: "01 4833 888",
        url: "https://plavi-telefon.hr",
        verified: false,
      },
      {
        name: "Hrabri telefon",
        detail: "For children and young people.",
        contact: "116 111",
        url: "https://hrabritelefon.hr",
        verified: false,
      },
    ],
  },
  {
    code: "BA",
    label: "Bosnia and Herzegovina / Bosna i Hercegovina",
    emergency: "112",
    resources: [
      {
        name: "Plavi telefon",
        detail: "Emotional support and crisis counselling.",
        contact: "080 05 03 05",
        verified: false,
      },
      {
        name: "Find a Helpline",
        detail: "Directory of checked services. There is no dedicated eating-disorder helpline.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
  {
    code: "MK",
    label: "North Macedonia / Северна Македонија",
    emergency: "112",
    resources: [
      {
        name: "Ало Бушавко",
        detail: "Helpline for children and young people, run by Прва Детска Амбасада Меѓаши.",
        contact: "0800 1 2222",
        url: "https://www.childrensembassy.org.mk",
        verified: false,
      },
      {
        name: "Find a Helpline",
        detail: "Directory of checked services. There is no dedicated eating-disorder helpline.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
  {
    code: "ME",
    label: "Montenegro / Crna Gora",
    emergency: "112",
    resources: [
      {
        name: "116 111 — children and young people",
        detail: "The national helpline for under-18s.",
        contact: "116 111",
        verified: false,
      },
      {
        name: "Find a Helpline",
        detail: "Directory of checked services. There is no dedicated eating-disorder helpline.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
  {
    code: "SI",
    label: "Slovenia / Slovenija",
    emergency: "112",
    resources: [
      {
        name: "Zaupni telefon Samarijan in Sopotnik",
        detail: "Confidential emotional support, 24 hours a day.",
        contact: "116 123",
        verified: false,
      },
      {
        name: "Klic v duševni stiski",
        detail: "Psychological crisis line, evenings.",
        contact: "01 520 99 00",
        verified: false,
      },
    ],
  },
  {
    code: "AL",
    label: "Albania / Shqipëri",
    emergency: "112",
    resources: [
      {
        name: "ALO 116 111",
        detail: "National helpline for children and young people, run by Nisma ARSIS.",
        contact: "116 111",
        url: "https://www.alo116.al",
        verified: false,
      },
      {
        name: "Find a Helpline",
        detail: "Directory of checked services. There is no dedicated eating-disorder helpline.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
  {
    code: "BG",
    label: "Bulgaria / България",
    emergency: "112",
    resources: [
      {
        name: "Национална телефонна линия за деца",
        detail: "National helpline for children and young people.",
        contact: "116 111",
        verified: false,
      },
      {
        name: "Find a Helpline",
        detail: "Directory of checked services. There is no dedicated eating-disorder helpline.",
        url: "https://findahelpline.com",
        verified: false,
      },
    ],
  },
];

/** Shown when we have nothing verified for someone's region — which is honest, and safe. */
export const FALLBACK = {
  label: "Elsewhere",
  text: "This app does not yet carry verified crisis numbers for your region. findahelpline.com lists checked crisis lines by country and is kept current by people whose job that is — it is a better starting point than anything this app could hardcode. Your local emergency number, and your GP or family doctor, are also routes in.",
};

/**
 * Best-effort region guess from the browser locale. Deliberately NOT
 * geolocation: this app should never ask for location permission, and a wrong
 * guess is corrected by the region picker rather than being load-bearing.
 */
export function guessRegion(locale?: string): Region | null {
  if (!locale) return null;
  const region = locale.split("-")[1]?.toUpperCase();
  return REGIONS.find((r) => r.code === region) ?? null;
}

export const ANY_UNVERIFIED = REGIONS.some((r) => r.resources.some((x) => !x.verified));
