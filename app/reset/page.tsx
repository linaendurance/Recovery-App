"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL } from "@/lib/env";
import { reportError } from "@/lib/reportError";

/**
 * Password reset, step 2.
 *
 * Arriving from the emailed link establishes a temporary recovery session, so
 * by the time this renders the visitor is signed in well enough to change
 * their own password — and nothing else useful. If that session is absent the
 * link was stale, already used, or opened in a different browser, and this
 * says so rather than failing silently.
 */
export default function ResetPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Supabase parses the recovery token out of the URL fragment on load, so
    // the session may not exist on the very first tick.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setChecking(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // Screen the new password the same way sign-up does. Without this, a reset
    // could set a breached password that could never have been registered.
    // Runs server-side so the app's CSP stays restricted to Supabase.
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTIONS_URL}/password-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.ok === false && result.reason === "breached") {
          setError(
            "That password has appeared in a known data breach, so it isn't safe to use here. Please choose a different one."
          );
          setBusy(false);
          return;
        }
      }
    } catch (err) {
      // Never block someone from regaining access because a screening call
      // failed. Logged, then continue.
      reportError(err, { where: "reset.passwordCheck" });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      reportError(updateError, { where: "reset.updateUser" });
      setError("Couldn't set that password. The link may have expired — request a new one.");
      return;
    }

    router.push("/app");
    router.refresh();
  };

  if (checking) {
    return (
      <main className="rn-auth-shell">
        <div className="rn-auth-card" role="status" aria-live="polite">
          <div className="rn-wordmark">Recovery Nutrition Tracker</div>
          <p className="rn-quiet">Checking your link…</p>
        </div>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="rn-auth-shell">
        <div className="rn-auth-card">
          <div className="rn-wordmark">Recovery Nutrition Tracker</div>
          <h1 className="rn-auth-title">That link didn&apos;t work</h1>
          <p className="rn-auth-sub">
            Reset links expire after an hour and can only be used once. They also have to be opened
            in the same browser you requested them from.
          </p>
          <p className="rn-auth-footer">
            <Link href="/forgot">Request a new link</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="rn-auth-shell">
      <div className="rn-auth-card">
        <div className="rn-wordmark">Recovery Nutrition Tracker</div>
        <h1 className="rn-auth-title">Choose a new password</h1>
        <form onSubmit={onSubmit} className="rn-form">
          <label className="rn-label" htmlFor="password">New password</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password"
            className="rn-input" value={password} onChange={(e) => setPassword(e.target.value)} />

          <label className="rn-label" htmlFor="confirm">Repeat it</label>
          <input id="confirm" type="password" required minLength={8} autoComplete="new-password"
            className="rn-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <p className="rn-hint">
            At least 8 characters. Checked against known data breaches and rejected if it appears
            in one.
          </p>

          {error && <p className="rn-error" role="alert">{error}</p>}
          <button type="submit" className="rn-btn" disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </main>
  );
}
