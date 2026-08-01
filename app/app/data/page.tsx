"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey } from "@/lib/dates";

type DaySummary = { date: string; meals: number; hasJournal: boolean };

export default function DataPage() {
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false); // otherwise the button stays stuck in its busy state forever
      return;
    }

    const [{ data: entries }, { data: journals }] = await Promise.all([
      supabase.from("entries").select("entry_date").eq("user_id", user.id),
      supabase.from("journal_entries").select("entry_date").eq("user_id", user.id),
    ]);

    const journalDates = new Set((journals ?? []).map((j) => j.entry_date));
    const counts = new Map<string, number>();
    for (const e of entries ?? []) counts.set(e.entry_date, (counts.get(e.entry_date) ?? 0) + 1);

    const allDates = new Set([...counts.keys(), ...journalDates]);
    const list = [...allDates]
      .map((date) => ({ date, meals: counts.get(date) ?? 0, hasJournal: journalDates.has(date) }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    setDays(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const exportAll = async () => {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false); // otherwise the button stays stuck in its busy state forever
      return;
    }

    const [{ data: entries }, { data: journals }] = await Promise.all([
      supabase
        .from("entries")
        .select(
          "entry_date, meal_type, mins_since_midnight, logged_at, felt_excessive, emotion, context_note, entry_items(qty, food_items(name, food_group, portion, unit, carbs, fat, protein, fibre, iron, calcium))"
        )
        .eq("user_id", user.id),
      supabase.from("journal_entries").select("entry_date, format, answers, saved_at").eq("user_id", user.id),
    ]);

    const blob = new Blob([JSON.stringify({ entries, journals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recovery-nutrition-export-${dayKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  };

  const doDelete = async () => {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    // journal_entries and entry_items aren't deleted explicitly — entries
    // cascades to entry_items at the database level, and journal_entries
    // is removed in the same pass so nothing is left orphaned.
    const [entriesResult, journalResult] = await Promise.all([
      supabase.from("entries").delete().eq("user_id", user.id),
      supabase.from("journal_entries").delete().eq("user_id", user.id),
    ]);

    setBusy(false);
    setConfirming(false);
    setMsg(entriesResult.error || journalResult.error ? "Deletion didn't fully complete — check your connection and try again." : "All your logs and reflections have been deleted.");
    refresh();
  };

  return (
    <>
      <section className="rn-card">
        <div className="rn-label">Where this data lives</div>
        <p className="rn-note">
          Everything you log is stored under your own account in this app&apos;s private database.
          Row-level security means no other person using this app — including the friend who
          invited you — can ever query your entries or journal answers.
        </p>
        <p className="rn-note">
          Nothing you write leaves that database today. No third party receives your food log or
          your journal, and no analytics run on this app. If a Coach feature is ever added, it
          would send messages to a model provider — that is not built, not switched on, and this
          text will say so plainly on the day it changes.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Saved days ({days ? days.length : "…"})</div>
        {!days || days.length === 0 ? (
          <p className="rn-empty">Nothing saved yet.</p>
        ) : (
          <ul className="rn-facts">
            {days.map((d) => (
              <li key={d.date}>
                <span>{d.date}</span>
                <b className="rn-mono">{d.meals} meal{d.meals === 1 ? "" : "s"}{d.hasJournal ? " · journal" : ""}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rn-card">
        <div className="rn-label">Export &amp; delete</div>
        <p className="rn-note">Download everything as a plain file, or remove it all permanently. Deletion cannot be undone.</p>
        <div className="rn-row">
          <button className="rn-btn" onClick={exportAll} disabled={busy}>Export all data (.json)</button>
          {!confirming ? (
            <button className="rn-link" onClick={() => setConfirming(true)}>Delete all data</button>
          ) : (
            <span className="rn-confirm">
              Delete everything, permanently?
              <button className="rn-link" onClick={doDelete} disabled={busy}>Yes, delete</button>
              <button className="rn-link" onClick={() => setConfirming(false)}>Cancel</button>
            </span>
          )}
        </div>
        {msg && <p className="rn-fine">{msg}</p>}
      </section>
    </>
  );
}
