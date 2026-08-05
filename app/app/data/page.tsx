"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dayKey } from "@/lib/dates";
import { reportError, reportSupabaseError } from "@/lib/reportError";

type DaySummary = { date: string; meals: number; hasJournal: boolean };

export default function DataPage() {
  const router = useRouter();
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingAccount, setConfirmingAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      reportError(userError, { where: "data.refresh.auth" });
      setBusy(false);
      setLoadError("Couldn't reach the server. Refresh to try again.");
      return;
    }
    const user = userData?.user;
    if (!user) {
      setBusy(false);
      setLoadError("Your session has ended. Sign in again to continue.");
      return;
    }

    const [entriesResult, journalsResult] = await Promise.all([
      supabase.from("entries").select("entry_date").eq("user_id", user.id),
      supabase.from("journal_entries").select("entry_date").eq("user_id", user.id),
    ]);

    // A failed count and a genuinely empty account rendered identically as
    // "Nothing saved yet." One of those is a reasonable thing to see and the
    // other is alarming, so they must not share a state.
    if (entriesResult.error || journalsResult.error) {
      reportSupabaseError(entriesResult.error ?? journalsResult.error, { where: "data.refresh" });
      setLoadError("Couldn't load your saved days. Refresh to try again.");
      return;
    }

    setLoadError(null);
    const entries = entriesResult.data ?? [];
    const journals = journalsResult.data ?? [];

    const journalDates = new Set(journals.map((j) => j.entry_date));
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.entry_date, (counts.get(e.entry_date) ?? 0) + 1);

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
    setMsg(null);
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      if (userError) reportError(userError, { where: "data.export.auth" });
      setBusy(false); // otherwise the button stays stuck in its busy state forever
      setMsg(
        userError
          ? "Couldn't reach the server, so no file was created. Check your connection and try again."
          : "Your session has ended. Sign in again to export your data."
      );
      return;
    }
    const user = userData.user;

    const [entriesResult, journalsResult] = await Promise.all([
      supabase
        .from("entries")
        .select(
          "entry_date, meal_type, mins_since_midnight, logged_at, felt_excessive, emotion, context_note, entry_items(qty, food_items(name, food_group, portion, unit, carbs, fat, protein, fibre, iron, calcium))"
        )
        .eq("user_id", user.id)
        // Ordered so the exported file is stable and diffable between runs,
        // and so any cap the API applies takes a known slice rather than an
        // arbitrary one.
        .order("entry_date", { ascending: true }),
      supabase
        .from("journal_entries")
        .select("entry_date, format, answers, saved_at")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: true }),
    ]);

    // The blob used to be written unconditionally, so a failed query
    // downloaded {"entries": null, "journals": null} under a correct-looking
    // filename. That is the worst available outcome for an export: the person
    // believes they are holding their data. No data, no file.
    if (entriesResult.error || journalsResult.error || !entriesResult.data || !journalsResult.data) {
      reportSupabaseError(entriesResult.error ?? journalsResult.error, { where: "data.export" });
      setBusy(false);
      setMsg("Couldn't export your data, so no file was created. Check your connection and try again.");
      return;
    }

    const entries = entriesResult.data;
    const journals = journalsResult.data;

    const blob = new Blob([JSON.stringify({ entries, journals }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recovery-nutrition-export-${dayKey(new Date())}.json`;
    // Safari, and iOS Safari especially, will not act on a click against an
    // anchor that was never in the document — and revoking the object URL on
    // the very next line can pull the blob away before the download starts.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    setBusy(false);
    // Stated counts so the file can be checked against this screen rather
    // than trusted.
    setMsg(
      `Exported ${entries.length} eating occasion${entries.length === 1 ? "" : "s"} and ` +
        `${journals.length} reflection${journals.length === 1 ? "" : "s"}.`
    );
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

  // Deleting the rows left the account itself behind, so "delete everything"
  // did not actually erase the person. This removes the auth user, which
  // cascades to the profile, every entry, every entry item and every journal
  // answer in one transaction.
  const deleteAccount = async () => {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setBusy(false);
      setConfirmingAccount(false);
      setMsg("Couldn't delete the account. Nothing was removed — try again.");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
        <div className="rn-label">Saved days ({loadError ? "—" : days ? days.length : "…"})</div>
        {/* Four states, all distinguishable: failed, still loading, genuinely
            empty, and loaded. They used to collapse into two. */}
        {loadError ? (
          <p className="rn-error" role="alert">{loadError}</p>
        ) : !days ? (
          <p className="rn-quiet" role="status" aria-live="polite">Counting your saved days…</p>
        ) : days.length === 0 ? (
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

      <section className="rn-card">
        <div className="rn-label">Delete your account</div>
        <p className="rn-note">
          Removes the account itself along with every entry, every journal answer and your profile.
          Immediate, and it cannot be undone. Export first if you want to keep anything.
        </p>
        <div className="rn-row">
          {!confirmingAccount ? (
            <button className="rn-link" onClick={() => setConfirmingAccount(true)}>
              Delete my account permanently
            </button>
          ) : (
            <span className="rn-confirm">
              Delete your account and everything in it?
              <button className="rn-link" onClick={deleteAccount} disabled={busy}>
                {busy ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button className="rn-link" onClick={() => setConfirmingAccount(false)}>Cancel</button>
            </span>
          )}
        </div>
        <p className="rn-fine">
          What is stored and how it is handled is set out in the{" "}
          <Link className="rn-link" href="/privacy">privacy notice</Link>.
        </p>
      </section>
    </>
  );
}
