"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dayKey, minsNow } from "@/lib/dates";
import { todaysPrompts, type JournalPrompts, type StoredAnswers } from "@/lib/journalBank";

export default function JournalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<JournalPrompts | null>(null);
  const [answers, setAnswers] = useState<StoredAnswers>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = dayKey(new Date());

      const [{ data: profile }, { data: existing }] = await Promise.all([
        supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
        supabase
          .from("journal_entries")
          .select("format, answers, saved_at")
          .eq("user_id", user.id)
          .eq("entry_date", today)
          .maybeSingle(),
      ]);

      const signupDate = profile?.created_at ? dayKey(new Date(profile.created_at)) : today;
      setPrompts(todaysPrompts(signupDate, today));

      if (existing) {
        setAnswers((existing.answers as StoredAnswers) ?? {});
        setSavedAt(existing.saved_at);
      }
      setLoading(false);
    })().catch(() => {
      setError("Couldn't load today's reflection. Refresh to try again.");
      setLoading(false);
    });
  }, []);

  const afterFive = useMemo(() => minsNow(new Date()) >= 17 * 60, []);

  const setAnswer = (id: string, question: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: { q: question, a: value } }));

  const save = async () => {
    if (!prompts) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
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
      setError("Couldn't save your reflection. Try again — nothing you wrote was lost from this screen.");
      return;
    }
    setSavedAt(new Date().toISOString());
  };

  if (error) return <div className="rn-card rn-error-card">{error}</div>;
  if (loading || !prompts) return <div className="rn-card rn-quiet">Opening today&apos;s reflection…</div>;

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
        <button className="rn-btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save reflection"}
        </button>
        {savedAt && (
          <span className="rn-saved-note">
            Saved {new Date(savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        <Link className="rn-link" href="/app/history">Read past reflections</Link>
      </div>
      <p className="rn-fine">
        Questions rotate by theme each week from your own start date, and change format after a
        month, so this doesn&apos;t become another routine to perform. Everything you write is
        stored with the question exactly as it was asked, so old entries still read correctly if
        the prompts change later.
      </p>
    </section>
  );
}
