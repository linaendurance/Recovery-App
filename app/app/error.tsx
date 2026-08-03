"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";
import Link from "next/link";

/**
 * Error boundary for the signed-in area. Separate from the root one so a
 * failure inside a single tab keeps the navigation and the safety footer on
 * screen rather than dropping the person out of the app entirely.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { where: "boundary.app", extra: { digest: error.digest ?? null } });
  }, [error]);

  return (
    <section className="rn-card rn-error-card">
      <div className="rn-label">This screen didn&apos;t load</div>
      <p className="rn-note">
        Something failed while building this view. Your log and your reflections are stored in the
        database and are unaffected — this is only the display.
      </p>
      <div className="rn-row">
        <button className="rn-btn" onClick={reset}>Try again</button>
        <Link className="rn-link" href="/app">Back to today</Link>
      </div>
      {error.digest && <p className="rn-fine rn-mono">Reference: {error.digest}</p>}
    </section>
  );
}
