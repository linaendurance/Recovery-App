"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtTime, fmtGap, longDate, dayKey } from "@/lib/dates";
import { computeDayShapes, normalizeEntries, LONG_GAP_MINS, type DayShape, type EntryRow } from "@/lib/analysis";
import { answeredPairs, type StoredAnswers } from "@/lib/journalBank";
import { ENTRY_SELECT } from "@/lib/queries";
import { reportSupabaseError } from "@/lib/reportError";

type JournalRow = {
  entry_date: string;
  format: string;
  answers: StoredAnswers;
  saved_at: string;
};

type Tab = "timing" | "journal";

// This screen previously fetched EVERY entry the account had ever written, and
// every entry_item carries a full food_items row. Measured on the demo
// account that is ~50 kB for 14 days — about 1.3 MB after a year and ~4 MB
// after three, re-downloaded on every visit. Windowing it keeps the common
// case small; "all time" is still available, just not the default.
const WINDOWS = [
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last year" },
  { days: 0, label: "All time" },
];

function windowStart(days: number): string | null {
  if (days === 0) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dayKey(d);
}

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("timing");
  const [windowDays, setWindowDays] = useState(90);
  const [shapes, setShapes] = useState<DayShape[] | null>(null);
  const [journals, setJournals] = useState<JournalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Was `if (!user) return;`, which left the screen on its loading
    // state forever when a session expired mid-use.
    if (!user) {
      setError("Your session has ended. Sign in again to continue.");
      return;
    }

    const from = windowStart(windowDays);
    // Ordered so that "All time" is deterministic. Without it the row order is
    // whatever Postgres returns, and any cap the API applies would silently
    // keep an arbitrary subset rather than a known one.
    let entryQuery = supabase
      .from("entries")
      .select(ENTRY_SELECT)
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });
    let journalQuery = supabase
      .from("journal_entries")
      .select("entry_date, format, answers, saved_at")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });

    if (from) {
      entryQuery = entryQuery.gte("entry_date", from);
      journalQuery = journalQuery.gte("entry_date", from);
    }

    const [{ data: entries, error: entryError }, { data: journalRows, error: journalError }] =
      await Promise.all([entryQuery, journalQuery]);

    if (entryError || journalError) {
      reportSupabaseError(entryError ?? journalError, { where: "history.load" });
      setError("Couldn't load your history. Refresh to try again.");
      return;
    }
    setShapes(computeDayShapes(normalizeEntries(entries)));
    setJournals((journalRows ?? []) as JournalRow[]);
  }, [windowDays]);

  useEffect(() => {
    setShapes(null);
    setJournals(null);
    load();
  }, [load]);

  if (error) return <div className="rn-card rn-error-card" role="alert">{error}</div>;
  if (shapes === null || journals === null) {
    return <div className="rn-card rn-quiet" role="status" aria-live="polite">Opening your history…</div>;
  }

  return (
    <>
      <div className="rn-subtabs">
        <button className={`rn-choice ${tab === "timing" ? "is-on" : ""}`} onClick={() => setTab("timing")}>
          Meal timing over time
        </button>
        <button className={`rn-choice ${tab === "journal" ? "is-on" : ""}`} onClick={() => setTab("journal")}>
          Past reflections
        </button>
      </div>

      <div className="rn-subtabs">
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            className={`rn-choice ${windowDays === w.days ? "is-on" : ""}`}
            onClick={() => setWindowDays(w.days)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {tab === "timing" ? <TimingHistory shapes={shapes} /> : <JournalHistory rows={journals} />}
    </>
  );
}

function TimingHistory({ shapes }: { shapes: DayShape[] }) {
  if (shapes.length === 0) {
    return <div className="rn-card"><p className="rn-empty">No days logged yet.</p></div>;
  }

  const withGaps = shapes.filter((s) => s.mealCount > 1);
  const avgLongest = withGaps.length
    ? withGaps.reduce((sum, s) => sum + s.longestGap, 0) / withGaps.length
    : 0;
  const withOvernight = shapes.filter((s) => s.overnightFast !== null);
  const avgOvernight = withOvernight.length
    ? withOvernight.reduce((sum, s) => sum + (s.overnightFast ?? 0), 0) / withOvernight.length
    : 0;

  return (
    <>
      <section className="rn-card">
        <div className="rn-label">Across {shapes.length} logged day{shapes.length === 1 ? "" : "s"}</div>
        <ul className="rn-facts">
          <li>
            <span>Average longest daytime gap</span>
            <b className="rn-mono">{withGaps.length ? fmtGap(avgLongest) : "—"}</b>
          </li>
          <li>
            <span>Average overnight fast</span>
            <b className="rn-mono">{withOvernight.length ? fmtGap(avgOvernight) : "—"}</b>
          </li>
          <li>
            <span>Average eating occasions per day</span>
            <b className="rn-mono">
              {(shapes.reduce((s, d) => s + d.mealCount, 0) / shapes.length).toFixed(1)}
            </b>
          </li>
        </ul>
        <p className="rn-fine">
          The overnight fast is the stretch from your last eating occasion one day to your first
          the next. It cannot be seen on a single-day screen at all, because it crosses midnight
          into a different date — which is why it lives here.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Day by day</div>
        <ul className="rn-daylist">
          {shapes.map((s) => (
            <li key={s.date} className="rn-day">
              <div className="rn-day-head">
                <b>{longDate(new Date(s.date + "T12:00:00"))}</b>
                <span className="rn-mono rn-day-count">
                  {s.mealCount} occasion{s.mealCount === 1 ? "" : "s"}
                </span>
              </div>
              <DayBar shape={s} />
              <div className="rn-day-stats">
                <span>
                  First <b className="rn-mono">{s.firstMeal !== null ? fmtTime(s.firstMeal) : "—"}</b>
                </span>
                <span>
                  Last <b className="rn-mono">{s.lastMeal !== null ? fmtTime(s.lastMeal) : "—"}</b>
                </span>
                <span className={s.longestGap > LONG_GAP_MINS ? "is-flagged" : ""}>
                  Longest gap <b className="rn-mono">{s.longestGap ? fmtGap(s.longestGap) : "—"}</b>
                </span>
                <span>
                  Overnight{" "}
                  <b className="rn-mono">{s.overnightFast !== null ? fmtGap(s.overnightFast) : "—"}</b>
                </span>
                <span>
                  All three macros <b className="rn-mono">{s.completeFuelCount}/{s.mealCount}</b>
                </span>
                {s.excessiveCount > 0 && (
                  <span className="is-marked">
                    Marked ✳ <b className="rn-mono">{s.excessiveCount}</b>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** A compact 05:00-24:00 strip per day, so the shape of a week is visible at a glance. */
function DayBar({ shape }: { shape: DayShape }) {
  const START = 5 * 60, END = 24 * 60;
  const pct = (m: number) => Math.max(0, Math.min(100, ((m - START) / (END - START)) * 100));
  return (
    <div className="rn-daybar">
      <div className="rn-daybar-track" />
      {shape.firstMeal !== null && shape.lastMeal !== null && (
        <div
          className="rn-daybar-span"
          style={{ left: `${pct(shape.firstMeal)}%`, width: `${pct(shape.lastMeal) - pct(shape.firstMeal)}%` }}
        />
      )}
    </div>
  );
}

function JournalHistory({ rows }: { rows: JournalRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rn-card">
        <p className="rn-empty">Nothing written yet. Reflections you save will collect here.</p>
      </div>
    );
  }

  return (
    <>
      {rows.map((r) => {
        const pairs = answeredPairs(r.answers);
        if (pairs.length === 0) return null;
        return (
          <section key={r.entry_date} className="rn-card">
            <div className="rn-label">
              {longDate(new Date(r.entry_date + "T12:00:00"))} · {r.format}
            </div>
            {pairs.map((p, i) => (
              <div key={i} className="rn-journal-past">
                <p className="rn-journal-q">{p.q}</p>
                <p className="rn-journal-a">{p.a}</p>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
