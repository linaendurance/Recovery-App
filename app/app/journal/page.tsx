"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, minsNow } from "@/lib/dates";
import { todaysPrompts } from "@/lib/journalBank";

export default function JournalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<{ title: string; list: string[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
        supabase.from("journal_entries").select("format, answers, saved_at").eq("user_id", user.id).eq("entry_date", today).maybeSingle(),
      ]);

      const signupDate = profile?.created_at ? dayKey(new Date(profile.created_at)) : today;
      const p = todaysPrompts(signupDate, today);
      setPrompts(p);

      if (existing) {
        setAnswers((existing.answers as Record<string, string>) ?? {});
        setSavedAt(existing.saved_at);
      }
      setLoading(false);
    })().catch(() => {
      setError("Couldn't load today's reflection. Refresh to try again.");
      setLoading(false);
    });
  }, []);

  const afterFive = useMemo(() => minsNow(new Date()) >= 17 * 60, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !prompts) return;

    const { error: upsertError } = await supabase
      .from("journal_entries")
      .upsert(
        {
          user_id: user.id,
          entry_date: dayKey(new Date()),
          format: prompts.title,
          answers,
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
      {prompts.list.map((p, i) => (
        <div key={i} className="rn-jq">
          <label htmlFor={`jq${i}`}>{p}</label>
          <textarea
            id={`jq${i}`}
            rows={3}
            className="rn-input"
            value={answers[p] || ""}
            onChange={(e) => setAnswers({ ...answers, [p]: e.target.value })}
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
      </div>
      <p className="rn-fine">
        Questions rotate by theme each week from your own start date, and change format after a
        month, so this doesn&apos;t become another routine to perform.
      </p>
    </section>
  );
}
