import Link from "next/link";

/**
 * The legal and safety floor for every screen reachable WITHOUT an account.
 *
 * SafetyFooter covers the signed-in app. The auth screens had nothing at all —
 * no statement of what the app is, no link to the terms somebody is about to
 * accept, and no route to help for a person who arrived here in a bad state and
 * cannot get in. Those are the screens a stranger sees first, so they are the
 * worst place for that to be missing.
 *
 * Deliberately compact. A wall of text above a password field gets scrolled
 * past; the full version lives on /terms and on the sign-up screen, which is
 * where a decision is actually being made.
 */
export default function AuthFooter() {
  return (
    <footer className="rn-auth-legal">
      <p>
        A private self-monitoring journal. <b>Not treatment</b> — it cannot assess, diagnose or
        treat you, and it is not a substitute for a doctor or a registered dietitian. For ages 16
        and over.
      </p>
      <p>
        If you need help right now, you do not need an account: contact your local emergency number,
        or find a service at{" "}
        <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
          findahelpline.com
        </a>
        .
      </p>
      <p>
        <Link href="/terms">Terms of service</Link>
        {" · "}
        <Link href="/privacy">Privacy notice</Link>
      </p>
    </footer>
  );
}
