import Link from "next/link";

/**
 * Crisis signposting and the "this is not treatment" boundary.
 *
 * The app previously had neither, anywhere. For a self-help tool aimed at
 * people with eating disorders that is a genuine safety gap, not a polish
 * item: a food log can surface a very bad evening, and there was nothing on
 * screen telling anyone where to go with it.
 *
 * The numbers below are UK and US. VERIFY AND LOCALISE THESE before the app
 * reaches anyone — an out-of-date crisis number is worse than none.
 */
export default function SafetyFooter() {
  return (
    <footer className="rn-safety">
      <p className="rn-safety-lead">
        This app is a self-help tool. It is not treatment, and it cannot assess you. Eating
        disorders are treatable, and the outcomes are markedly better with professional support —
        if you have not spoken to a doctor or a registered dietitian about this, that is the single
        most useful thing on this page.
      </p>
      <ul className="rn-safety-list">
        <li>
          <b>Beat</b> (UK eating disorder charity) — <span className="rn-mono">0808 801 0677</span>,{" "}
          <a href="https://www.beateatingdisorders.org.uk" target="_blank" rel="noopener noreferrer">
            beateatingdisorders.org.uk
          </a>
        </li>
        <li>
          <b>Samaritans</b> (UK &amp; Ireland, 24/7, any kind of distress) —{" "}
          <span className="rn-mono">116 123</span>
        </li>
        <li>
          <b>988 Suicide &amp; Crisis Lifeline</b> (US, 24/7) — call or text{" "}
          <span className="rn-mono">988</span>
        </li>
        <li>
          If you are in immediate danger, or you have collapsed, fainted or cannot keep fluids
          down: <b>999</b> (UK) or <b>911</b> (US).
        </li>
      </ul>
      <p className="rn-safety-fine">
        Sudden changes in eating can be medically risky in their own right — refeeding needs
        supervision when intake has been very low for a long time. Physical symptoms belong with a
        doctor, not with an app.{" "}
        <Link className="rn-link" href="/app/sources">
          Where the figures in this app come from
        </Link>
      </p>
    </footer>
  );
}
