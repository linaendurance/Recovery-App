"use client";

import { useEffect } from "react";

/**
 * Root error boundary.
 *
 * Without one, an unhandled render error in any client component leaves a
 * blank white page with the failure only visible in the console — which for
 * this app could mean somebody opening it in a bad moment and finding nothing.
 *
 * The digest is Next's own hashed identifier for the error. It is safe to show
 * and safe to log: it contains no message text, so no journal content or food
 * entry can leak into it.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Deliberately logs the digest and nothing else. Wiring a real error
    // tracker here is the correct next step; sending it user content is not.
    console.error("app_error", { digest: error.digest });
  }, [error]);

  return (
    <main className="rn-auth-shell">
      <div className="rn-auth-card">
        <div className="rn-wordmark">Recovery Nutrition Tracker</div>
        <h1 className="rn-auth-title">Something went wrong</h1>
        <p className="rn-auth-sub">
          This is a fault in the app, not in anything you did. Nothing you had already saved has
          been lost.
        </p>
        <div className="rn-row">
          <button className="rn-btn" onClick={reset}>Try again</button>
          <a className="rn-link" href="/app">Back to today</a>
        </div>
        {error.digest && <p className="rn-fine rn-mono">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
