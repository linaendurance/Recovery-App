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
        verified: false,
      },
      {
        name: "Samaritans",
        detail: "Any kind of distress, 24 hours a day, every day.",
        contact: "116 123",
        url: "https://www.samaritans.org",
        verified: false,
      },
      {
        name: "NHS 111",
        detail: "Urgent medical advice when it is not an emergency.",
        contact: "111",
        url: "https://111.nhs.uk",
        verified: false,
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
        verified: false,
      },
      {
        name: "ANAD Helpline",
        detail: "Eating disorder support and treatment referrals.",
        url: "https://anad.org/eating-disorders-helpline",
        verified: false,
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
        verified: false,
      },
      {
        name: "Samaritans",
        detail: "Any kind of distress, 24 hours a day.",
        contact: "116 123",
        url: "https://www.samaritans.org",
        verified: false,
      },
    ],
  },
];

/** Shown when we have nothing verified for someone's region — which is honest, and safe. */
export const FALLBACK = {
  label: "Elsewhere",
  text: "This app does not yet carry verified crisis numbers for your region. Please search for your national eating disorder association or crisis line, or contact your local emergency number. Your GP or family doctor is also a route in.",
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
