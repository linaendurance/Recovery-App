"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { pad, dayKey, fmtTime, fmtGap, minsNow, longDate } from "@/lib/dates";
import { computeAnalysis, REFERENCE, type EntryRow } from "@/lib/analysis";
import { todaysFact } from "@/lib/facts";

export default function TodayPage() {
  const [now, setNow] = useState(new Date());
  const [entries, setEntries] = useState<EntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("entries")
      .select("id, meal_type, mins_since_midnight, entry_items(qty, food_items(*))")
      .eq("user_id", user.id)
      .eq("entry_date", dayKey(new Date()));
    if (error) {
      setError("Couldn't load today's log. Refresh to try again.");
      return;
    }
    setEntries((data ?? []) as unknown as EntryRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="rn-card rn-error-card">{error}</div>;
  if (entries === null) return <div className="rn-card rn-quiet">Opening today&apos;s log…</div>;

  const nowMins = minsNow(now);
  const a = computeAnalysis(entries, nowMins, true);
  const fact = todaysFact(dayKey(now));

  return (
    <>
      <div className="rn-date-row">
        <div>
          <div className="rn-eyebrow">Today</div>
          <h1 className="rn-page-title">{longDate(now)}</h1>
        </div>
        <div className="rn-clock rn-mono">{pad(now.getHours())}:{pad(now.getMinutes())}</div>
      </div>

      <section className="rn-card rn-fact">
        <div className="rn-label">Today&apos;s food fact</div>
        <p className="rn-fact-text">{fact}</p>
      </section>

      <Ribbon a={a} nowMins={nowMins} />

      {a.openGapFlag && (
        <div className="rn-flag">
          No food logged for {fmtGap(a.sinceLast)}. Gaps beyond about three and a half hours tend
          to make the next meal harder, not easier.{" "}
          <Link className="rn-link" href="/app/log">Log something now</Link>
        </div>
      )}

      <section className="rn-card">
        <div className="rn-label">Eaten so far</div>
        {a.entries.length === 0 ? (
          <p className="rn-empty">
            Nothing logged yet today. <Link className="rn-link" href="/app/log">Add your first meal</Link>
          </p>
        ) : (
          <ul className="rn-list">
            {a.entries.map((e) => (
              <li key={e.id} className="rn-entry">
                <span className="rn-mono rn-entry-time">{fmtTime(e.mins_since_midnight)}</span>
                <div>
                  <div className="rn-entry-type">{e.meal_type}</div>
                  <div className="rn-entry-foods">
                    {e.entry_items.map((it, i) =>
                      it.food_items ? (
                        <span key={i} className="rn-chip">
                          {it.food_items.name}
                          <em>{Math.round(it.food_items.portion * it.qty)} {it.food_items.unit}</em>
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rn-card">
        <div className="rn-label">Nutrient adequacy</div>
        <p className="rn-note">
          Reference <em>floors</em> for adult women — the level below which deficiency risk rises,
          never a target to hit exactly and never a ceiling. Needs during recovery are often higher.
          No calorie figures anywhere in this app, by design.
        </p>
        <div className="rn-bars">
          {Object.entries(REFERENCE).map(([k, r]) => {
            const v = a.totals[k as keyof typeof a.totals];
            const p = Math.min(100, (v / r.floor) * 100);
            return (
              <div key={k} className="rn-bar-row">
                <div className="rn-bar-head">
                  <span>{r.label}</span>
                  <span className="rn-mono">
                    {v >= 100 ? Math.round(v) : v.toFixed(1)} {r.unit}
                    <em> / {r.floor} {r.unit} reference</em>
                  </span>
                </div>
                <div className="rn-bar"><div className={`rn-bar-fill ${p >= 100 ? "is-met" : ""}`} style={{ width: `${p}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Ribbon({ a, nowMins }: { a: ReturnType<typeof computeAnalysis>; nowMins: number }) {
  const START = 5 * 60, END = 24 * 60;
  const pct = (m: number) => Math.max(0, Math.min(100, ((m - START) / (END - START)) * 100));
  const times = a.entries.map((e) => e.mins_since_midnight);
  const gaps: [number, number][] = [];
  for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] > 210) gaps.push([times[i - 1], times[i]]);
  if (times.length && nowMins - times[times.length - 1] > 210) gaps.push([times[times.length - 1], nowMins]);

  return (
    <section className="rn-card">
      <div className="rn-label">The shape of your day</div>
      <div className="rn-ribbon">
        <div className="rn-track" />
        {gaps.map(([s, e], i) => (
          <div key={i} className="rn-gap" style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%` }} />
        ))}
        <div className="rn-nowline" style={{ left: `${pct(nowMins)}%` }} />
        {a.entries.map((e) => (
          <div key={e.id} className="rn-bead" style={{ left: `${pct(e.mins_since_midnight)}%` }} title={`${e.meal_type} · ${fmtTime(e.mins_since_midnight)}`}>
            <span className="rn-bead-time rn-mono">{fmtTime(e.mins_since_midnight)}</span>
          </div>
        ))}
      </div>
      <div className="rn-ticks">
        {[6, 9, 12, 15, 18, 21].map((h) => (
          <span key={h} className="rn-mono" style={{ left: `${pct(h * 60)}%` }}>{pad(h)}</span>
        ))}
      </div>
      <div className="rn-ribbon-legend">
        Shaded stretches are gaps over 3 h 30 min. {a.mealCount ? `Longest gap so far: ${fmtGap(a.longestGap || a.sinceLast)}.` : ""}
      </div>
    </section>
  );
}
