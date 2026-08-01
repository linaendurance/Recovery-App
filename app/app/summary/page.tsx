"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, fmtTime, fmtGap, minsNow } from "@/lib/dates";
import { computeAnalysis, observations, REFERENCE, type EntryRow } from "@/lib/analysis";
import { GROUP_LABELS, GROUP_ORDER } from "@/lib/foods";
import { tonightsInsight } from "@/lib/facts";

export default function SummaryPage() {
  const [entries, setEntries] = useState<EntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setError("Couldn't load today's summary. Refresh to try again.");
      return;
    }
    setEntries((data ?? []) as unknown as EntryRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteEntry = async (id: string) => {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("entries").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      setError("Couldn't delete that entry. Try again.");
      return;
    }
    load();
  };

  if (error) return <div className="rn-card rn-error-card">{error}</div>;
  if (entries === null) return <div className="rn-card rn-quiet">Building today&apos;s summary…</div>;

  const a = computeAnalysis(entries, minsNow(new Date()), true);
  const obs = observations(a);
  const repeated = [...a.names.entries()].filter(([, n]) => n > 1);
  const insight = tonightsInsight(dayKey(new Date()));

  return (
    <>
      <div className="rn-summary-grid">
        <section className="rn-card">
          <div className="rn-label">Nutrition summary</div>
          {a.mealCount === 0 ? <p className="rn-empty">Nothing logged yet today.</p> : (
            <table className="rn-table">
              <tbody>
                {Object.entries(REFERENCE).map(([k, r]) => {
                  const v = a.totals[k as keyof typeof a.totals];
                  return (
                    <tr key={k}>
                      <td>{r.label}</td>
                      <td className="rn-mono">{v >= 100 ? Math.round(v) : v.toFixed(1)} {r.unit}</td>
                      <td className="rn-fine">reference floor {r.floor} {r.unit}</td>
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
                  <div className="rn-entry-type">{e.meal_type}</div>
                  <div className="rn-entry-foods">
                    {e.entry_items.map((it, i) => it.food_items && (
                      <span key={i} className="rn-chip">{it.food_items.name}</span>
                    ))}
                  </div>
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
        <p>{insight}</p>
      </section>
    </>
  );
}
