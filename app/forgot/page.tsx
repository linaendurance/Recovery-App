"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Password reset, step 1.
 *
 * The app previously had no reset flow at all: forgetting your password meant
 * permanent, unrecoverable lockout from your own food log and journal. For a
 * tool meant to be used daily for months, that is the single worst user-facing
 * failure it could have.
 */
export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    const supabase = createClient();
    // Result deliberately ignored. Telling the visitor whether this address has
    // an account would let anyone test whether a given person uses an
    // eating-disorder recovery app — the same enumeration leak the sign-up
    // endpoint was hardened against. Success and failure look identical.
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset`,
    });

    setBusy(false);
    setSent(true);
  };

  return (
    <main className="rn-auth-shell">
      <div className="rn-auth-card">
        <div className="rn-wordmark">Recovery Nutrition Tracker</div>

        {sent ? (
          <>
            <h1 className="rn-auth-title">Check your email</h1>
            <p className="rn-auth-sub">
              If an account exists for that address, a reset link is on its way. The link is valid
              for one hour and can only be used once.
            </p>
            <p className="rn-fine">
              Nothing arrived? Check spam, and make sure you typed the address you signed up with.
              You can request another link in a few minutes.
            </p>
            <p className="rn-auth-footer"><Link href="/login">Back to sign in</Link></p>
          </>
        ) : (
          <>
            <h1 className="rn-auth-title">Reset your password</h1>
            <p className="rn-auth-sub">
              We&apos;ll email you a link to choose a new one. Your log and your reflections are
              untouched by this.
            </p>
            <form onSubmit={onSubmit} className="rn-form">
              <label className="rn-label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className="rn-input"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="rn-btn" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="rn-auth-footer">
              Remembered it? <Link href="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
