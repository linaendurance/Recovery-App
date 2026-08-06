import Link from "next/link";

// Publicly reachable without a session, because someone has to be able to read
// it BEFORE deciding to create an account. Kept deliberately short and in
// plain words: a notice nobody reads protects nobody.
export const metadata = {
  title: "Privacy notice — Recovery Nutrition Tracker",
};

// Bump this, and CONSENT_VERSION in the signup edge function, together whenever
// the substance below changes. profiles.consent_version records which text a
// person actually agreed to.
const VERSION = "2026-08-05";

// The named controller and the address data requests go to. GDPR Art 13(1)(a)
// and (b) make both mandatory, and neither can be invented — they have to be a
// real person or entity and an inbox somebody reads.
const CONTROLLER = "Lina Nikolovska";
const CONTACT = "nikolovskalina4@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="rn-shell">
      <header className="rn-app-header">
        <div className="rn-wordmark rn-wordmark--small">Recovery Nutrition Tracker</div>
        <Link className="rn-link" href="/login">Sign in</Link>
      </header>

      <section className="rn-card">
        <div className="rn-label">Privacy notice · version {VERSION}</div>
        <h1 className="rn-page-title">What this app stores, and who can see it</h1>
      </section>

      <section className="rn-card">
        <div className="rn-label">What is stored</div>
        <ul className="rn-obs">
          <li className="rn-ob rn-ob--note">
            <b>Your food log</b> — what you recorded eating, when, whether an occasion felt
            excessive or out of control, an optional feeling, and an optional note about what was
            happening.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>Your journal answers</b> — the text you write, stored with the question exactly as
            it was asked.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>Your account</b> — email address, display name, and year of birth. The year alone,
            never a full date, and only so the app can show the right nutrient reference values.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>Sign-up attempts</b> — a salted one-way hash of the IP address, kept 24 hours, used
            only to stop automated abuse. The raw address is never written down.
          </li>
        </ul>
        <p className="rn-fine">
          This is health data about eating behaviour, which is treated as a special category under
          UK and EU data protection law. It is handled accordingly.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Who can see it</div>
        <p className="rn-note">
          Only you. Every table is protected by row-level security in the database, which means the
          restriction is enforced by the database itself rather than by the app remembering to ask
          politely. Nobody else using this app can read your entries or your journal — including
          whoever gave you an invite code.
        </p>
        <p className="rn-note">
          Nothing is sent to any third party. There is no analytics, no advertising, no tracking,
          and no external fonts or scripts — the app makes no requests to anyone but its own
          database. The one exception is sign-up: your password is checked against the Have I Been
          Pwned breach list using k-anonymity, which means only the first five characters of a
          one-way hash are sent. Your password itself never leaves the server.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">How long it is kept</div>
        <p className="rn-note">
          Your log and journal are kept until you delete them. There is no automatic expiry,
          because a recovery record is more useful the longer it runs. Sign-up attempt hashes are
          deleted after 24 hours.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Your control over it</div>
        <ul className="rn-facts">
          <li><span>Export everything as a file</span><b>Data tab</b></li>
          <li><span>Delete individual entries</span><b>Summary tab</b></li>
          <li><span>Delete all logs and reflections</span><b>Data tab</b></li>
          <li><span>Delete your entire account</span><b>Data tab</b></li>
        </ul>
        <p className="rn-fine">
          Deleting your account removes the account itself along with every entry, every journal
          answer and your profile. It is immediate and cannot be undone.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">What this app is not</div>
        <p className="rn-note">
          It is not treatment, it cannot assess you, and it is not a substitute for a doctor or a
          registered dietitian. If you are unwell, please speak to someone qualified.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Who is responsible for this data</div>
        <p className="rn-note">
          The data controller is <b>{CONTROLLER}</b>, acting as an individual and resident in
          Serbia. That means one named person is accountable for how your food log and journal are
          handled — not a company, and not nobody.
        </p>
        <p className="rn-note">
          For anything about your data — a copy of it, a correction, deletion, a complaint, or a
          question about any of the above — write to{" "}
          <a className="rn-link" href={`mailto:${CONTACT}`}>{CONTACT}</a>. Messages are read by one
          person, so please allow a few days.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Which law applies, and where to complain</div>
        <p className="rn-note">
          The controller is in Serbia, so Serbia&apos;s <i>Law on Personal Data Protection</i>{" "}
          applies. <b>It is not the only law that applies to you.</b> Because this app is offered to
          people in the UK and the EEA, UK and EU data protection law applies to their data as well,
          regardless of where the controller lives. Whichever gives you more protection is the one
          that counts.
        </p>
        <p className="rn-note">
          Your database is hosted in <b>Frankfurt, Germany</b>. Some parts of the app run on servers
          in the <b>United States</b>, and the controller accesses the system from{" "}
          <b>Serbia</b> — neither of which the EU treats as automatically equivalent to its own
          protection. The practical effect is that your food log and journal are stored in the EU,
          but the person responsible for them, and some of the infrastructure serving the app, are
          outside it.
        </p>
        <p className="rn-fine">
          If you are unhappy with how a request was handled you can complain to a regulator. In the
          EEA or the UK that is your own national data protection authority. In Serbia it is the
          Commissioner for Information of Public Importance and Personal Data Protection. You can
          complain to your own authority wherever you live.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Related</div>
        <p className="rn-note">
          <Link className="rn-link" href="/terms">Terms of service</Link> — what this app is, what
          it is not, and the agreement you accept by creating an account. This notice forms part of
          it.
        </p>
      </section>
    </main>
  );
}
