"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL } from "@/lib/env";

const FUNCTION_URL = `${FUNCTIONS_URL}/signup-with-invite`;

/**
 * Minimum age. Raised from 13 because several EU states require parental
 * consent below 16 for an information-society service (GDPR Art 8), and
 * because an eating-disorder tool used by a minor with no clinician and no
 * parental involvement is the highest-risk configuration this app has.
 *
 * The gate is computed from the birth year that is collected anyway, rather
 * than from a self-declaration checkbox: a checkbox asks somebody to lie in
 * one click, a date asks them to do arithmetic first. Neither is proof, but
 * one of them is a deterrent.
 *
 * This check is a COURTESY, not the enforcement. The Edge Function re-checks
 * server-side, because anything in this file can be bypassed with devtools.
 */
const MIN_AGE = 16;

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [birthYear, setBirthYear] = useState("");
  // Two separate consents. GDPR Art 7(2) requires consent to be
  // distinguishable from other matters, so agreeing to health-data storage
  // cannot be bundled into the same tick as understanding what the app is.
  const [dataConsent, setDataConsent] = useState(false);
  const [understandsLimits, setUnderstandsLimits] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearNum = birthYear.length === 4 ? Number(birthYear) : null;
  const age = yearNum === null ? null : new Date().getFullYear() - yearNum;
  const tooYoung = age !== null && age < MIN_AGE;
  const implausibleYear = age !== null && (age > 120 || age < 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (tooYoung || implausibleYear) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          invite_code: inviteCode.trim(),
          display_name: displayName.trim(),
          birth_year: birthYear.trim(),
          consent: dataConsent && understandsLimits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the account. Try again.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      router.push("/login");
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <main className="rn-auth-shell">
      <div className="rn-auth-card">
        <div className="rn-wordmark">Recovery Nutrition Tracker</div>
        <h1 className="rn-auth-title">You&apos;ve been invited</h1>
        <p className="rn-auth-sub">This app is private — an invite code is required once, to create your account.</p>

        {/*
          Shown BEFORE the form, not buried under it. The intended purpose of a
          health app is what determines how it is regulated and what it can be
          held to have promised, so it is stated first, in the app's own words,
          where somebody deciding whether to sign up will actually read it.
        */}
        <section className="rn-hint rn-signup-scope">
          <b>Before you start — what this is, and what it isn&apos;t.</b>
          <p>
            This is a private journal for recording what you ate, when you ate, and how it felt.
            It is <b>not treatment</b>. It cannot assess you, diagnose you, or tell you what or how
            much to eat, and it is not a substitute for a doctor or a registered dietitian.
          </p>
          <p>
            There are no calories in it anywhere, by design. The nutrient figures it shows are
            published <b>floors</b> — the level below which deficiency risk rises — never targets to
            hit or limits to stay under. During recovery, real needs are routinely higher than them.
          </p>
          <p>
            The reference values are <b>for women</b>. If that is not you, the iron and calcium
            figures in particular will not apply to you.
          </p>
          <p>
            <b>Eating changes can be medically risky.</b> If your intake has been very low for a
            long time, increasing it needs medical supervision. Physical symptoms belong with a
            doctor, not with an app.
          </p>
          <p>
            If you are struggling right now, you do not need an account to get help —{" "}
            <Link href="/privacy" target="_blank">read what this app stores</Link>, and please
            contact your local emergency number or your national eating disorder association.
          </p>
        </section>

        <form onSubmit={onSubmit} className="rn-form">
          <label className="rn-label" htmlFor="inviteCode">Invite code</label>
          <input id="inviteCode" required autoComplete="off" className="rn-input rn-mono"
            value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />

          <label className="rn-label" htmlFor="displayName">Your name</label>
          <input id="displayName" required autoComplete="name" className="rn-input"
            value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

          <label className="rn-label" htmlFor="birthYear">Year of birth</label>
          <input id="birthYear" required inputMode="numeric" pattern="[0-9]{4}" placeholder="e.g. 1998"
            className="rn-input rn-mono" value={birthYear}
            onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <p className="rn-hint">
            Used to show the right nutrient reference values — they differ before and after about
            age 19 — and to check you are {MIN_AGE} or over. Not shown to anyone, and the year
            alone is stored, never a full date.
          </p>

          {implausibleYear && (
            <p className="rn-error" role="alert">Please check your year of birth.</p>
          )}

          {tooYoung && (
            <div className="rn-error" role="alert">
              <b>This app is for ages {MIN_AGE} and over, so you can&apos;t create an account here.</b>
              <p>
                That isn&apos;t a judgement about you. Monitoring eating without a clinician
                involved carries real risks at your age, and this app has no way to involve one.
              </p>
              <p>
                Please speak to a parent or carer, your GP, or your care team — and if you need
                someone now, your national eating disorder association or crisis line can help
                whatever your age. Beat (UK) runs a youth helpline; findahelpline.com lists
                services by country.
              </p>
            </div>
          )}

          <label className="rn-label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="rn-input"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="rn-label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" className="rn-input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="rn-hint">
            At least 8 characters. Passwords are checked against known data breaches and rejected
            if they appear in one.
          </p>

          {/*
            Two ticks, not one. The first is explicit consent to process health
            data under GDPR Art 9(2)(a); the second is acknowledgement of what
            the app is. Bundling them would make the health-data consent
            non-specific, which is the most common way an otherwise valid
            consent flow fails.
          */}
          <label className="rn-check rn-check--compact">
            <input
              type="checkbox"
              checked={dataConsent}
              onChange={(e) => setDataConsent(e.target.checked)}
              required
            />
            <span>
              I consent to this app storing my food log and journal.
              <em>
                This is health data, and it is treated as a special category under UK and EU data
                protection law. It is stored under your account and nobody else can read it,
                including whoever invited you. You can export or delete all of it at any time.{" "}
                <Link href="/privacy" target="_blank">Read the privacy notice</Link>.
              </em>
            </span>
          </label>

          <label className="rn-check rn-check--compact">
            <input
              type="checkbox"
              checked={understandsLimits}
              onChange={(e) => setUnderstandsLimits(e.target.checked)}
              required
            />
            <span>
              I understand this app is not treatment and cannot assess me.
              <em>
                It is a self-monitoring record. It does not diagnose, treat or monitor any
                condition, and it is not a substitute for professional care. I am {MIN_AGE} or
                over.
              </em>
            </span>
          </label>

          {error && <p className="rn-error" role="alert">{error}</p>}
          <button
            type="submit"
            className="rn-btn"
            disabled={busy || tooYoung || implausibleYear}
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="rn-auth-footer">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
