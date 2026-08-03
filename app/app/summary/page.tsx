"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, fmtTime, fmtGap, minsNow } from "@/lib/dates";
import { computeAnalysis, normalizeEntries, observations, type EntryRow } from "@/lib/analysis";
import { GROUP_LABELS, GROUP_ORDER } from "@/lib/foods";
import { tonightsInsight, sourceLabel } from "@/lib/facts";
import { loadProfileContext } from "@/lib/profile";
import { NUTRIENT_ORDER, referencesFor, FUEL_RATIONALE, type AgeBand } from "@/lib/nutrition";
import { ENTRY_SELECT } from "@/lib/queries";
import { reportSupabaseError } from "@/lib/reportError";

export default function SummaryPage() {
  const [entries, setEntries] = useState<EntryRow[] | null>(null);
  const [band, setBand] = useState<AgeBand>("19plus");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    const [{ data, error }, ctx] = await Promise.all([
      supabase
        .from("entries")
        .select(ENTRY_SELECT)
        .eq("user_id", user.id)
        .eq("entry_date", dayKey(new Date())),
      loadProfileContext(user.id),
    ]);

    if (error) {
      reportSupabaseError(error, { where: "summary.load" });
      setError("Couldn't load today's summary. Refresh to try again.");
      return;
    }
    setBand(ctx.band);
    setEntries(normalizeEntries(data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteEntry = async (id: string) => {
    setDeletingId(id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setDeletingId(null);
      return;
    }
    // Row Level Security already scopes this to the owner; the explicit
    // user_id filter is defence in depth so a future RLS mistake cannot turn
    // a delete-by-id into somebody else's data.
    const { error } = await supabase.from("entries").delete().eq("id", id).eq("user_id", user.id);
    setDeletingId(null);
    if (error) {
      setError("Couldn't delete that entry. Try again.");
      return;
    }
    load();
  };

  // Hooks must run before any early return — see the note in app/app/page.tsx.
  const a = useMemo(() => computeAnalysis(entries ?? [], minsNow(new Date()), true), [entries]);
  const obs = useMemo(() => observations(a), [a]);

  if (error) return <div className="rn-card rn-error-card" role="alert">{error}</div>;
  if (entries === null) return <div className="rn-card rn-quiet" role="status" aria-live="polite">Building today&apos;s summary…</div>;
  const repeated = [...a.names.entries()].filter(([, n]) => n > 1);
  const insight = tonightsInsight(dayKey(new Date()));
  const references = referencesFor(band);

  return (
    <>
      <div className="rn-summary-grid">
        <section className="rn-card">
          <div className="rn-label">Nutrition summary</div>
          {a.mealCount === 0 ? <p className="rn-empty">Nothing logged yet today.</p> : (
            <table className="rn-table">
              <tbody>
                {NUTRIENT_ORDER.map((k) => {
                  const r = references[k];
                  const v = a.totals[k];
                  return (
                    <tr key={k}>
                      <td>{r.label}</td>
                      <td className="rn-mono">{v >= 100 ? Math.round(v) : v.toFixed(1)} {r.unit}</td>
                      <td className="rn-fine">
                        {r.floor === null ? "no published floor" : `reference floor ${r.floor} ${r.unit}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="rn-card">
          <div className="rn-label">Meal timing</div>
          {a.mealCount === 0 ? <p className="rn-empty">No timing data yet.</p> : (
            <ul className="rn-facts">
              <li><span>First eating occasion</span><b className="rn-mono">{fmtTime(a.firstMeal ?? 0)}</b></li>
              <li><span>Most recent</span><b className="rn-mono">{fmtTime(a.lastMeal ?? 0)}</b></li>
              <li><span>Eating occasions</span><b className="rn-mono">{a.mealCount}</b></li>
              <li><span>Longest gap between meals</span><b className="rn-mono">{a.longestGap ? fmtGap(a.longestGap) : "—"}</b></li>
            </ul>
          )}
        </section>
      </div>

      <section className="rn-card">
        <div className="rn-label">Fuel consistency</div>
        {a.mealCount === 0 ? (
          <p className="rn-empty">Nothing logged yet.</p>
        ) : (
          <>
            <p className="rn-note">
              {a.completeFuelCount} of {a.mealCount} eating occasion
              {a.mealCount === 1 ? "" : "s"} today carried carbohydrate, fat and protein together.
            </p>
            <ul className="rn-fuel-rows">
              {a.occasions.map(({ entry, presence, totals }) => (
                <li key={entry.id} className="rn-fuel-row">
                  <span className="rn-mono rn-entry-time">{fmtTime(entry.mins_since_midnight)}</span>
                  <span className="rn-fuel-name">
                    {entry.meal_type}
                    {entry.felt_excessive && <span className="rn-mark" title="Felt excessive or out of control">✳</span>}
                  </span>
                  <span className="rn-fuel-pills">
                    <span className={`rn-fuel-pill ${presence.carbs ? "is-on" : ""}`}>
                      C <em className="rn-mono">{totals.carbs.toFixed(0)}</em>
                    </span>
                    <span className={`rn-fuel-pill ${presence.fat ? "is-on" : ""}`}>
                      F <em className="rn-mono">{totals.fat.toFixed(0)}</em>
                    </span>
                    <span className={`rn-fuel-pill ${presence.protein ? "is-on" : ""}`}>
                      P <em className="rn-mono">{totals.protein.toFixed(0)}</em>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="rn-fine">{FUEL_RATIONALE}</p>
          </>
        )}
      </section>

      <div className="rn-summary-grid">
        <section className="rn-card">
          <div className="rn-label">Food diversity</div>
          {a.mealCount === 0 ? <p className="rn-empty">Nothing logged yet.</p> : (
            <>
              <p className="rn-note">{a.names.size} different food{a.names.size === 1 ? "" : "s"} today, across {a.groups.length} food group{a.groups.length === 1 ? "" : "s"}.</p>
              <div className="rn-groups">
                {GROUP_ORDER.map((g) => (
                  <span key={g} className={`rn-group ${a.groups.includes(g) ? "is-on" : ""}`}>{GROUP_LABELS[g]}</span>
                ))}
              </div>
              {repeated.length > 0 && (
                <p className="rn-fine">
                  Appeared more than once today: {repeated.map(([n, c]) => `${n} (${c}×)`).join(", ")}.
                  Repetition is not a problem in itself — it only matters if it&apos;s crowding other things out.
                </p>
              )}
            </>
          )}
        </section>

        <section className="rn-card">
          <div className="rn-label">Recovery observations</div>
          {obs.length === 0 ? <p className="rn-empty">Observations appear once you&apos;ve logged something.</p> : (
            <ul className="rn-obs">
              {obs.map((o, i) => <li key={i} className={`rn-ob rn-ob--${o.tone}`}>{o.text}</li>)}
            </ul>
          )}
        </section>
      </div>

      <section className="rn-card">
        <div className="rn-label">Edit today&apos;s log</div>
        {a.entries.length === 0 ? (
          <p className="rn-empty">Nothing to edit yet.</p>
        ) : (
          <ul className="rn-list">
            {a.entries.map((e) => (
              <li key={e.id} className="rn-entry">
                <span className="rn-mono rn-entry-time">{fmtTime(e.mins_since_midnight)}</span>
                <div style={{ flex: 1 }}>
                  <div className="rn-entry-type">
                    {e.meal_type}
                    {e.felt_excessive && <span className="rn-mark">✳</span>}
                    {e.emotion && <span className="rn-emotion">{e.emotion}</span>}
                  </div>
                  <div className="rn-entry-foods">
                    {e.entry_items.map((it, i) => it.food_items && (
                      <span key={i} className="rn-chip">{it.food_items.name}</span>
                    ))}
                  </div>
                  {e.context_note && <p className="rn-context">{e.context_note}</p>}
                </div>
                <button className="rn-remove" onClick={() => deleteEntry(e.id)} disabled={deletingId === e.id} aria-label="Delete entry">
                  {deletingId === e.id ? "…" : "×"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="rn-fine">Logged the wrong thing? Delete it here — deleting removes it completely, including from every summary above.</p>
      </section>

      <section className="rn-card rn-insight">
        <div className="rn-label">Tonight&apos;s recovery insight</div>
        <p>{insight.text}</p>
        {sourceLabel(insight) && <p className="rn-cite">{sourceLabel(insight)}</p>}
      </section>
    </>
  );
}
