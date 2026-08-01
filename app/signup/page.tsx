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

          <label className="rn-label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="rn-input"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="rn-label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" className="rn-input"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="rn-hint">At least 8 characters.</p>

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
