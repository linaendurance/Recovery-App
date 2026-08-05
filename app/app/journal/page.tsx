"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dayKey, minsNow } from "@/lib/dates";
import { todaysPrompts, type JournalPrompts, type StoredAnswers } from "@/lib/journalBank";
import { reportError, reportSupabaseError } from "@/lib/reportError";

export default function JournalPage() {
  const [loading, setLoading] = useState(true);
  // Load and save failures are deliberately separate states. A load failure
  // has to replace the form (see the effect below); a save failure must NOT,
  // or the text someone just wrote vanishes from the very screen telling them
  // it was not lost.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<JournalPrompts | null>(null);
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // True only once today's stored entry has actually been read back. Saving
  // upserts on (user_id, entry_date), so writing without a confirmed read
  // would replace a real reflection with an empty form.
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // The retry button re-runs this effect while an earlier attempt may still
    // be in flight; without this guard the stale attempt can resolve last and
    // put the screen back into an error state it has already left.
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (cancelled) return;

      // An unreachable server and an expired session both leave `user` null,
      // and they need opposite messages: one is retryable, the other means
      // sign in again. Only the error tells them apart.
      if (userError) {
        reportError(userError, { where: "journal.load.auth" });
        setLoadError("Couldn't reach the server. Check your connection and retry before writing.");
        setLoading(false);
        return;
      }
      const user = userData?.user;
      if (!user) {
        setLoadError("Your session has ended. Sign in again to continue.");
        setLoading(false);
        return;
      }

      const today = dayKey(new Date());

      const [profileResult, existingResult] = await Promise.all([
        supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
        supabase
          .from("journal_entries")
          .select("format, answers, saved_at")
          .eq("user_id", user.id)
          .eq("entry_date", today)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      // A failed profile read costs only the prompt-rotation anchor, which
      // falls back to today. Not worth blocking the screen for.
      if (profileResult.error) {
        reportSupabaseError(profileResult.error, { where: "journal.load.profile" });
      }

      // A failed read of today's entry is different in kind. `existing` would
      // be null, the form would render empty, and the first save would upsert
      // that emptiness over a reflection already stored for today. Refuse to
      // render the form at all rather than offer a blank box that silently
      // destroys what it could not see.
      if (existingResult.error) {
        reportSupabaseError(existingResult.error, { where: "journal.load.existing" });
        setLoadError(
          "Couldn't load today's reflection. Nothing has been changed — retry before writing, so today's entry isn't overwritten."
        );
        setLoading(false);
        return;
      }

      const profile = profileResult.data;
      const existing = existingResult.data;

      const signupDate = profile?.created_at ? dayKey(new Date(profile.created_at)) : today;
      setPrompts(todaysPrompts(signupDate, today));

      if (existing) {
        setAnswers((existing.answers as StoredAnswers) ?? {});
        setSavedAt(existing.saved_at);
      }
      setExistingLoaded(true);
      setLoading(false);
    })().catch((err) => {
      if (cancelled) return;
      reportError(err, { where: "journal.load" });
      setLoadError(
        "Couldn't load today's reflection. Nothing has been changed — retry before writing, so today's entry isn't overwritten."
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retryLoad = () => {
    setLoadError(null);
    setExistingLoaded(false);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  const afterFive = useMemo(() => minsNow(new Date()) >= 17 * 60, []);

  const setAnswer = (id: string, question: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: { q: question, a: value } }));

  const save = async () => {
    // Belt and braces with the render guard below: an upsert must never run
    // from a form whose stored content was never successfully read.
    if (!prompts || !existingLoaded) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Previously returned silently, so the button simply stopped saying
      // "Saving…" and nothing was written or reported.
      setSaving(false);
      setSaveError("Your session has ended. Sign in again — what you wrote is still on this screen.");
      return;
    }

    // Drop empty answers so a blank box never occupies a slot in history.
    const cleaned: StoredAnswers = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v && v.a.trim() !== "")
    );

    const { error: upsertError } = await supabase.from("journal_entries").upsert(
      {
        user_id: user.id,
        entry_date: dayKey(new Date()),
        format: prompts.title,
        answers: cleaned,
        saved_at: new Date().toISOString(),
      },
      { onConflict: "user_id,entry_date" }
    );
    setSaving(false);
    if (upsertError) {
      reportSupabaseError(upsertError, { where: "journal.save" });
      setSaveError("Couldn't save your reflection. Try again — nothing you wrote was lost from this screen.");
      return;
    }
    setSavedAt(new Date().toISOString());
  };

  if (loadError)
    return (
      <div className="rn-card rn-error-card" role="alert">
        <p>{loadError}</p>
        <div className="rn-row">
          <button className="rn-btn" onClick={retryLoad}>Retry</button>
        </div>
      </div>
    );
  if (loading || !prompts) return <div className="rn-card rn-quiet" role="status" aria-live="polite">Opening today&apos;s reflection…</div>;

  return (
    <section className="rn-card">
      <div className="rn-label">Evening reflection · {prompts.title}</div>
      {!afterFive && <p className="rn-note">This normally opens at 17:00. You can write earlier if you want to.</p>}
      {prompts.list.map((p) => (
        <div key={p.id} className="rn-jq">
          <label htmlFor={p.id}>{p.text}</label>
          <textarea
            id={p.id}
            rows={3}
            className="rn-input"
            value={answers[p.id]?.a ?? ""}
            onChange={(e) => setAnswer(p.id, p.text, e.target.value)}
          />
        </div>
      ))}
      <div className="rn-row">
        <button className="rn-btn" onClick={save} disabled={saving || !existingLoaded}>
          {saving ? "Saving…" : "Save reflection"}
        </button>
        {savedAt && (
          <span className="rn-saved-note">
            Saved {new Date(savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <Link className="rn-link" href="/app/history">Read past reflections</Link>
      </div>
      {saveError && <p className="rn-error" role="alert">{saveError}</p>}
      <p className="rn-fine">
        Questions rotate by theme each week from your own start date, and change format after a
        month, so this doesn&apos;t become another routine to perform. Everything you write is
        stored with the question exactly as it was asked, so old entries still read correctly if
        the prompts change later.
      </p>
    </section>
  );
}
