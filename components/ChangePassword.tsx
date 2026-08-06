"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL } from "@/lib/env";
import { reportError } from "@/lib/reportError";

/**
 * Change your password while signed in.
 *
 * This did not exist, and its absence was worse than it sounds: the ONLY way to
 * change a password was the emailed reset link, so while email delivery is
 * broken there was no way at all — not for somebody who simply wanted a better
 * password, and not for somebody who thought theirs had been seen. This route
 * needs no email, because an authenticated session is already proof enough of
 * who is asking.
 *
 * The current password is required even though Supabase does not demand it.
 * Without that check, anyone who found a signed-in phone could set a new
 * password and lock the owner out of their own journal. One extra field is a
 * cheap price for closing that.
 */
export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (next !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    if (next.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (next === current) {
      setError("That's the password you're already using. Choose a different one.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    if (userError || !email) {
      setBusy(false);
      setError("Your session has ended. Sign in again to change your password.");
      return;
    }

    // Re-authenticate. Supabase will happily change a password from any live
    // session; requiring the old one is what stops a borrowed phone becoming a
    // permanent lockout.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauthError) {
      setBusy(false);
      const wrong = reauthError.message.toLowerCase().includes("invalid login");
      if (!wrong) reportError(reauthError, { where: "changePassword.reauth" });
      setError(
        wrong
          ? "That isn't your current password."
          : "Couldn't verify your current password. Check your connection and try again."
      );
      return;
    }

    // Same breach screening as sign-up and reset, so the three paths that can
    // set a password all apply the same standard. Runs server-side, which is
    // why the CSP can stay restricted to Supabase.
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
        body: JSON.stringify({ password: next }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.ok === false && result.reason === "breached") {
          setBusy(false);
          setError(
            "That password has appeared in a known data breach, so it isn't safe to use here. Please choose a different one."
          );
          return;
        }
      }
    } catch (err) {
      // Never block somebody from improving their password because a screening
      // call failed. Logged, then continue.
      reportError(err, { where: "changePassword.passwordCheck" });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setBusy(false);

    if (updateError) {
      reportError(updateError, { where: "changePassword.updateUser" });
      setError("Couldn't save the new password. Try again.");
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  };

  return (
    <section className="rn-card">
      <div className="rn-label">Change your password</div>
      <p className="rn-note">
        You can change your password here without needing an email. Password reset by email is not
        working yet, so this is currently the only way to change it — and if you forget it entirely
        there is no self-service recovery, so please keep it somewhere safe.
      </p>

      {!open ? (
        <div className="rn-row">
          <button className="rn-btn" onClick={() => setOpen(true)}>Change password</button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rn-form">
          <label className="rn-label" htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="rn-input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />

          <label className="rn-label" htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rn-input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />

          <label className="rn-label" htmlFor="confirmPassword">Repeat the new password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rn-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <p className="rn-hint">
            At least 8 characters. Checked against known data breaches and rejected if it appears in
            one.
          </p>

          {error && <p className="rn-error" role="alert">{error}</p>}
          {done && (
            <p className="rn-saved-note" role="status" aria-live="polite">
              Password changed. Use the new one next time you sign in.
            </p>
          )}

          <div className="rn-row">
            <button type="submit" className="rn-btn" disabled={busy}>
              {busy ? "Saving…" : "Save new password"}
            </button>
            <button
              type="button"
              className="rn-link"
              onClick={() => {
                setOpen(false);
                setError(null);
                setDone(false);
                setCurrent("");
                setNext("");
                setConfirm("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
