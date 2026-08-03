"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const FUNCTION_URL = "https://gzhujyagleysqqmhsdyg.supabase.co/functions/v1/signup-with-invite";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
          consent,
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
            Only used to show the right nutrient reference values — they differ before and after
            about age 19. Not shown to anyone, and the year alone is stored, never a full date.
          </p>

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

          <label className="rn-check rn-check--compact">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span>
              I&apos;ve read how my data is handled.
              <em>
                Your food log and journal are stored under your account and no one else can read
                them, including whoever invited you.{" "}
                <Link href="/privacy" target="_blank">Read the privacy notice</Link>.
              </em>
            </span>
          </label>

          {error && <p className="rn-error" role="alert">{error}</p>}
          <button type="submit" className="rn-btn" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="rn-auth-footer">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
