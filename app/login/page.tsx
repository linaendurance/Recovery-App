"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { reportError } from "@/lib/reportError";

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
      // The real cause used to be discarded here. Every failure that was not
      // literally "Invalid login" collapsed into one generic sentence, so a
      // wrong password and an unreachable database looked identical — to the
      // person signing in AND to anyone trying to debug it. Sign-in is the one
      // screen where a silent failure locks someone out of their own record,
      // so it is the last place that should swallow the reason.
      reportError(signInError, {
        where: "login.signin",
        extra: { status: signInError.status ?? 0, name: signInError.name },
      });

      const wrongCredentials = signInError.message.toLowerCase().includes("invalid login");
      // The bracketed part is a technical code, not user content: an error
      // class name and an HTTP status. It carries nothing about the account,
      // and it turns "it doesn't work" into a reportable fact.
      // The message is the most diagnostic part — "Invalid API key" and
      // "Failed to fetch" mean completely different things and only the text
      // tells them apart. Auth error messages describe the request, never the
      // account, so showing one leaks nothing.
      const code = [
        signInError.name,
        signInError.status ? String(signInError.status) : null,
        signInError.message?.slice(0, 80),
      ]
        .filter(Boolean)
        .join(" · ");
      setError(
        wrongCredentials
          ? "That email and password don't match an account."
          : `Couldn't complete sign-in. Try again, and quote this if it keeps happening: [${code}]`
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
        <p className="rn-auth-footer">
          <Link href="/forgot">Forgotten your password?</Link>
        </p>
        <p className="rn-auth-footer">Have an invite code? <Link href="/signup">Create an account</Link></p>
      </div>
    </main>
  );
}
