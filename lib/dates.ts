export const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const minsNow = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const fmtTime = (mins: number) =>
  `${pad(Math.floor(mins / 60) % 24)}:${pad(Math.round(mins) % 60)}`;

export const fmtGap = (mins: number) => {
  // Clamped because a duration is never negative to a reader. Without this a
  // meal logged for later today rendered as "-9 h 00 min" in the ribbon legend.
  const total = Math.max(0, mins);
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
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

/**
 * The last `count` days, most recent first, for the log screen's day picker.
 *
 * Logging was previously locked to the current date, so anyone who forgot to
 * log until Tuesday could not record Monday at all — despite step 1 inviting
 * them to "catch up on something you ate earlier". The window is bounded
 * because retrospective logging gets less accurate the further back it goes,
 * and log_entry rejects future dates outright.
 */
export function recentDays(count: number, today = new Date()): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      key: dayKey(d),
      label:
        i === 0
          ? "Today"
          : i === 1
          ? "Yesterday"
          : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }),
    });
  }
  return out;
}

// Whole days between two YYYY-MM-DD strings, compared at local noon so
// daylight-saving shifts near midnight can't knock the count off by one.
export function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso + "T12:00:00");
  const to = new Date(toIso + "T12:00:00");
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}
