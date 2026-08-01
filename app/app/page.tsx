"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { pad, dayKey, fmtTime, fmtGap, minsNow, longDate } from "@/lib/dates";
import { computeAnalysis, LONG_GAP_MINS, type Analysis, type EntryRow } from "@/lib/analysis";
import { todaysFact, responsiveFacts, sourceLabel } from "@/lib/facts";
import { loadProfileContext } from "@/lib/profile";
import { NUTRIENT_ORDER, referencesFor, type AgeBand } from "@/lib/nutrition";
import { ENTRY_SELECT } from "@/lib/queries";

export default function TodayPage() {
  const [now, setNow] = useState(new Date());
  const [entries, setEntries] = useState<EntryRow[] | null>(null);
  const [band, setBand] = useState<AgeBand>("19plus");
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

    const [{ data, error }, ctx] = await Promise.all([
      supabase
        .from("entries")
        .select(ENTRY_SELECT)
        .eq("user_id", user.id)
        .eq("entry_date", dayKey(new Date())),
      loadProfileContext(user.id),
    ]);

    if (error) {
      setError("Couldn't load today's log. Refresh to try again.");
      return;
    }
    setBand(ctx.band);
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
  const responsive = responsiveFacts(a);
  const references = referencesFor(band);

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
        <p className="rn-fact-text">{fact.text}</p>
        {sourceLabel(fact) && <p className="rn-cite">{sourceLabel(fact)}</p>}
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
            {a.occasions.map(({ entry: e, presence }) => (
              <li key={e.id} className="rn-entry">
                <span className="rn-mono rn-entry-time">{fmtTime(e.mins_since_midnight)}</span>
                <div style={{ flex: 1 }}>
                  <div className="rn-entry-type">
                    {e.meal_type}
                    {e.felt_excessive && (
                      <span className="rn-mark" title="You marked this as feeling excessive or out of control">
                        ✳
                      </span>
                    )}
                    {e.emotion && <span className="rn-emotion">{e.emotion}</span>}
                  </div>
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
                  <div className="rn-macro-mini">
                    <span className={presence.carbs ? "is-on" : ""}>C</span>
                    <span className={presence.fat ? "is-on" : ""}>F</span>
                    <span className={presence.protein ? "is-on" : ""}>P</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {responsive.length > 0 && (
        <section className="rn-card">
          <div className="rn-label">Because of what you logged today</div>
          <ul className="rn-obs">
            {responsive.map((f) => (
              <li key={f.id} className="rn-ob rn-ob--note">
                <span className="rn-because">{f.because}</span>
                {f.text}
                {sourceLabel(f) && <span className="rn-cite-inline">{sourceLabel(f)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rn-card">
        <div className="rn-label">Nutrient adequacy</div>
        <p className="rn-note">
          Reference <em>floors</em> for {band === "13-18" ? "females aged 14-18" : "adult women"} —
          the level below which deficiency risk rises. Never a target to hit exactly, never a
          ceiling. Needs during recovery are often higher. No calorie figures anywhere in this app,
          by design. <Link className="rn-link" href="/app/sources">Where these come from</Link>
        </p>
        <div className="rn-bars">
          {NUTRIENT_ORDER.map((k) => {
            const r = references[k];
            const v = a.totals[k];
            if (r.floor === null) {
              return (
                <div key={k} className="rn-bar-row">
                  <div className="rn-bar-head">
                    <span>{r.label}</span>
                    <span className="rn-mono">
                      {v >= 100 ? Math.round(v) : v.toFixed(1)} {r.unit}
                      <em> / no published floor</em>
                    </span>
                  </div>
                  <div className="rn-bar rn-bar--nofloor" />
                </div>
              );
            }
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
                <div className="rn-bar">
                  <div className={`rn-bar-fill ${p >= 100 ? "is-met" : ""}`} style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Ribbon({ a, nowMins }: { a: Analysis; nowMins: number }) {
  const START = 5 * 60, END = 24 * 60;
  const pct = (m: number) => Math.max(0, Math.min(100, ((m - START) / (END - START)) * 100));
  const times = a.entries.map((e) => e.mins_since_midnight);
  const gaps: [number, number][] = [];
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > LONG_GAP_MINS) gaps.push([times[i - 1], times[i]]);
  }
  if (times.length && nowMins - times[times.length - 1] > LONG_GAP_MINS) {
    gaps.push([times[times.length - 1], nowMins]);
  }

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
          <div
            key={e.id}
            className={`rn-bead ${e.felt_excessive ? "is-marked" : ""}`}
            style={{ left: `${pct(e.mins_since_midnight)}%` }}
            title={`${e.meal_type} · ${fmtTime(e.mins_since_midnight)}`}
          >
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
