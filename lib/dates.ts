export const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const minsNow = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const fmtTime = (mins: number) =>
  `${pad(Math.floor(mins / 60) % 24)}:${pad(Math.round(mins) % 60)}`;

export const fmtGap = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h} h ${pad(m)} min` : `${m} min`;
};

export const longDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// Deterministic per-key index — same key always produces the same number,
// so rotating content (facts, journal prompts) never changes on refresh
// and needs no server-side state to stay stable.
export function stableIndex(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

// Whole days between two YYYY-MM-DD strings, compared at local noon so
// daylight-saving shifts near midnight can't knock the count off by one.
export function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso + "T12:00:00");
  const to = new Date(toIso + "T12:00:00");
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}
