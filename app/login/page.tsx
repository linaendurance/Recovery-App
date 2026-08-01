"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(
        signInError.message.includes("Invalid login")
          ? "That email and password don't match an account."
          : "Something went wrong signing in. Try again."
      );
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <main className="rn-auth-shell">
      <div className="rn-auth-card">
        <div className="rn-wordmark">Recovery Nutrition Tracker</div>
        <h1 className="rn-auth-title">Welcome back</h1>
        <form onSubmit={onSubmit} className="rn-form">
          <label className="rn-label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="rn-input"
            value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="rn-label" htmlFor="password">Password</label>
          <input id="password" type="password" required autoComplete="current-password" className="rn-input"
            value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <p className="rn-error" role="alert">{error}</p>}
          <button type="submit" className="rn-btn" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="rn-auth-footer">Have an invite code? <Link href="/signup">Create an account</Link></p>
      </div>
    </main>
  );
}
