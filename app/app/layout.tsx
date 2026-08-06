import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import Nav from "@/components/Nav";
import SafetyFooter from "@/components/SafetyFooter";

/**
 * Must match MIN_AGE in app/signup/page.tsx and the Edge Function.
 *
 * Checking it HERE as well as at sign-up is the point. The sign-up gate only
 * applies to accounts created after it existed — every account made while the
 * limit was 13 still had a working session afterwards. A gate that only guards
 * the door leaves everybody already inside untouched, so this re-checks on
 * every entry to the signed-in app.
 */
const MIN_AGE = 16;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // profiles is the authoritative record — user_metadata can be stale, and an
  // age gate is not the place to trust the less reliable of two sources. One
  // indexed primary-key lookup.
  const { data: profile } = await supabase
    .from("profiles")
    .select("birth_year")
    .eq("id", user.id)
    .maybeSingle();

  const birthYear = profile?.birth_year ?? null;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;

  // Unknown year is allowed through deliberately. Some accounts predate the
  // field, and locking somebody out of their own journal on a missing value —
  // rather than on evidence they are under 16 — would be the worse error.
  if (age !== null && age < MIN_AGE) {
    return (
      <main className="rn-shell">
        <header className="rn-app-header">
          <div className="rn-wordmark rn-wordmark--small">Recovery Nutrition Tracker</div>
          <SignOutButton />
        </header>
        <section className="rn-card rn-error-card" role="alert">
          <div className="rn-label">This account can&apos;t be used</div>
          <p className="rn-note">
            This app is for ages {MIN_AGE} and over, and the year of birth on this account is below
            that. That isn&apos;t a judgement about you — monitoring eating without a clinician
            involved carries real risks at your age, and this app has no way to involve one.
          </p>
          <p className="rn-note">
            Please speak to a parent or carer, your GP, or your care team. If you need someone now,
            your national eating disorder association or crisis line can help whatever your age —{" "}
            <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
              findahelpline.com
            </a>{" "}
            lists services by country.
          </p>
          <p className="rn-fine">
            If the year of birth is wrong, write to nikolovskalina4@gmail.com and it can be
            corrected. You can also delete this account and everything in it —{" "}
            <Link className="rn-link" href="/privacy">see the privacy notice</Link>.
          </p>
        </section>
        <SafetyFooter />
      </main>
    );
  }

  return (
    <main className="rn-shell">
      <header className="rn-app-header">
        <div className="rn-wordmark rn-wordmark--small">Recovery Nutrition Tracker</div>
        <SignOutButton />
      </header>
      <Nav />
      {children}
      <SafetyFooter />
    </main>
  );
}
