import Link from "next/link";

// Publicly reachable without a session — someone has to be able to read the
// terms BEFORE agreeing to them, and a term nobody could read before accepting
// is a term that is hard to enforce.
//
// Written in plain English on purpose. The same reasoning as the privacy
// notice: a document nobody reads protects nobody. Clauses that matter are
// stated in the words they actually mean rather than in the words that sound
// most legal.
export const metadata = {
  title: "Terms of service — Recovery Nutrition Tracker",
};

// Bump this whenever the substance below changes, and bump CONSENT_VERSION in
// the signup Edge Function alongside it so it stays possible to tell which
// version each account accepted.
const VERSION = "2026-08-05";

const OPERATOR = "Lina Nikolovska";
const CONTACT = "nikolovskalina4@gmail.com";
const COUNTRY = "the Republic of Serbia";

export default function TermsPage() {
  return (
    <main className="rn-shell">
      <header className="rn-app-header">
        <div className="rn-wordmark rn-wordmark--small">Recovery Nutrition Tracker</div>
        <Link className="rn-link" href="/login">Sign in</Link>
      </header>

      <section className="rn-card">
        <div className="rn-label">Terms of service · version {VERSION}</div>
        <h1 className="rn-page-title">The agreement between you and this app</h1>
        <p className="rn-note">
          These terms apply when you use Recovery Nutrition Tracker. By creating an account you
          accept them. If you do not accept them, please do not create an account — and if you
          already have one, you can delete it and everything in it at any time from the Data tab.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">1 · Who operates this app</div>
        <p className="rn-note">
          Recovery Nutrition Tracker is operated by <b>{OPERATOR}</b>, resident in {COUNTRY},
          acting as an individual and not as a company. Contact for anything relating to these
          terms, your data, or a problem with the app:{" "}
          <a className="rn-link" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p className="rn-fine">
          The same address is the contact for data protection requests. There is no separate
          support desk — messages are read by one person, so please allow a few days.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">2 · What this app is, and what it is not</div>
        <p className="rn-note">
          This app is a <b>private self-monitoring record</b>. It lets you write down what you ate,
          when you ate it, how the occasion felt, and a reflection at the end of the day. It shows
          you your own entries back, alongside published nutrient reference figures and general
          educational information about nutrition and recovery.
        </p>
        <p className="rn-note">
          <b>It is not a medical device, and it is not treatment.</b> It does not diagnose,
          treat, cure, prevent or monitor any disease or condition. It cannot assess you. It does
          not know your medical history, your blood results, your weight, or anything a clinician
          would need in order to advise you, and it does not ask.
        </p>
        <p className="rn-note">
          It is intended to be used <b>alongside</b> professional care, not instead of it — and it
          is designed so that what you record can be shown to a clinician who is treating you.
          Nothing in it is personal medical advice.
        </p>
        <p className="rn-fine">
          If you are looking for diagnosis, a treatment plan, or an individual nutrition
          prescription, you need a doctor or a registered dietitian. This app is not a substitute
          for either, and using it does not create any clinical or professional relationship
          between you and the operator.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">3 · Health and safety — please read this one</div>
        <ul className="rn-obs">
          <li className="rn-ob rn-ob--note">
            <b>Changing how you eat can be medically risky.</b> If your intake has been very low
            for a long time, increasing it can cause serious complications and needs medical
            supervision. Do not use this app as a reason to make changes on your own.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>Physical symptoms belong with a doctor.</b> Fainting, collapse, chest pain, an
            inability to keep fluids down, or a racing or very slow heartbeat are medical
            situations. Contact your local emergency number, not this app.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>The nutrient figures are floors, not targets.</b> They are the levels below which
            deficiency risk rises. They are not goals to hit, and they are not limits to stay
            under. Needs during recovery are routinely and substantially higher than them.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>The reference values are for women.</b> If that is not you, several of the figures —
            iron and calcium in particular — do not apply to you.
          </li>
          <li className="rn-ob rn-ob--note">
            <b>Crisis support is not part of this app.</b> The crisis numbers shown are signposts
            to other organisations. This app does not monitor what you write, nobody is watching it,
            and no one will be alerted if you record something concerning. If you need help, please
            contact one of the listed services or your local emergency number.
          </li>
        </ul>
      </section>

      <section className="rn-card">
        <div className="rn-label">4 · Who can use it</div>
        <p className="rn-note">
          You must be <b>16 or over</b> to create an account. This is checked at sign-up from the
          year of birth you give. If you are younger, please work through a parent or carer, your
          GP, or your care team — support is available to you at any age, but not through this app.
        </p>
        <p className="rn-note">
          You need an invite code to create an account. Codes are single-use. Sharing one does not
          transfer any right to use the app, and an account created with someone else&apos;s code
          may be removed.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">5 · Your account and your password</div>
        <p className="rn-note">
          You are responsible for keeping your password to yourself and for what happens under your
          account. Please use a password you do not use anywhere else. Passwords are checked against
          known breach lists at sign-up and rejected if they appear in one.
        </p>
        <p className="rn-note">
          You can <b>change</b> your password at any time from the Data tab, using your current one.
          That works without email.
        </p>
        <p className="rn-note rn-note--warn">
          <b>But you cannot yet recover a forgotten password.</b> Reset by email is not working at
          present, so if you forget your password entirely there is no self-service way back in —
          you would need to contact{" "}
          <a className="rn-link" href={`mailto:${CONTACT}`}>{CONTACT}</a>. Please keep your
          password somewhere safe. This is stated plainly because you should know it before you
          rely on the app, not after.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">6 · What you write stays yours</div>
        <p className="rn-note">
          Everything you record — your food log, your notes, your journal answers — remains yours.
          You are not granting any licence to use, publish, analyse or share it. It is stored under
          your account, protected at the database level so that no other user can read it, and it
          is not used to train anything, sold to anyone, or shown to anyone else.
        </p>
        <p className="rn-note">
          You can export all of it as a file, and delete all of it, at any time, from the Data tab.
          What is stored and for how long is set out in the{" "}
          <Link className="rn-link" href="/privacy">privacy notice</Link>, which forms part of these
          terms.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">7 · What belongs to the app</div>
        <p className="rn-note">
          The app itself — its design, its text, its food database and the way it presents
          information — belongs to the operator. You may use it for your own personal recovery. You
          may not copy it, resell it, present it as your own, or use it to build a competing
          service.
        </p>
        <p className="rn-fine">
          The nutrient reference values are taken from published sources, which are cited in full on
          the Sources screen. Those sources belong to their authors, not to this app.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">8 · How accurate this is, honestly</div>
        <p className="rn-note">
          Nutrient values for foods come from published food composition tables. They are averages.
          Real foods vary by variety, season, ripeness, brand and how they were cooked, so the
          totals this app shows are estimates and should be read as such.
        </p>
        <p className="rn-note">
          Three figures in the app are its own working assumptions rather than published values: the
          3 h 30 min &ldquo;long gap&rdquo; threshold, and the per-meal gram amounts at which
          carbohydrate, fat and protein are counted as &ldquo;present&rdquo;. All three are listed
          as such on the Sources screen. They are there to notice patterns, not to grade you.
        </p>
        <p className="rn-note">
          You are responsible for what you enter. If a portion or a food is recorded wrongly, the
          totals will be wrong, and the app has no way to know.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">9 · Availability, and the fact this is early software</div>
        <p className="rn-note">
          This app is provided free of charge and is <b>early software under active development</b>.
          It may be unavailable, may change, may lose features, and may stop entirely. There is no
          uptime commitment and no service level agreement.
        </p>
        <p className="rn-note rn-note--warn">
          <b>Automated backups are not yet in place.</b> Please do not keep anything here that you
          could not bear to lose, and use the export function in the Data tab if you want your own
          copy. If data is lost, it may not be recoverable.
        </p>
        <p className="rn-fine">
          Reasonable notice will be given before the app is shut down deliberately, so that you can
          export your data first. Notice cannot be given for an outage nobody planned.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">10 · Acceptable use</div>
        <p className="rn-note">Please do not:</p>
        <ul className="rn-facts">
          <li><span>Try to access another person&apos;s account or data</span></li>
          <li><span>Attempt to break, overload or probe the app or its database</span></li>
          <li><span>Use automated tools to create accounts or submit entries</span></li>
          <li><span>Record other people&apos;s personal or health details in your notes</span></li>
          <li><span>Use the app to give anybody else medical or nutritional advice</span></li>
        </ul>
        <p className="rn-fine">
          Accounts that do any of these may be suspended or removed without notice.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">11 · Ending your use of the app</div>
        <p className="rn-note">
          You can stop at any time, and you can delete your account and all of its contents
          yourself from the Data tab. Deletion is immediate and cannot be undone.
        </p>
        <p className="rn-note">
          Your account may be suspended or removed if these terms are broken, if the app is being
          used in a way that endangers you or another user, or if the app is discontinued. Where
          possible you will be given the chance to export your data first.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">12 · Liability</div>
        <p className="rn-note">
          This app is provided as it is, without warranties of any kind, including any implied
          warranty that it is fit for a particular purpose. It is free, it is early, and it is not a
          medical service.
        </p>
        <p className="rn-note">
          To the fullest extent the law allows, the operator is not liable for any indirect or
          consequential loss, for lost data, or for any decision you make about your eating,
          exercise or treatment on the basis of what this app shows you. The app does not tell you
          what to do, and it is not a substitute for a clinician who can.
        </p>
        <p className="rn-note rn-note--warn">
          <b>Nothing in these terms limits liability where the law does not allow it to be
          limited.</b> That includes liability for death or personal injury caused by negligence,
          for fraud, and for anything else that cannot lawfully be excluded. Your statutory rights
          as a consumer are not affected by anything written here.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">13 · Law, and your rights where you live</div>
        <p className="rn-note">
          These terms are governed by the law of <b>{COUNTRY}</b>, where the operator is resident,
          and its courts have jurisdiction.
        </p>
        <p className="rn-note">
          That does not take anything away from you. If you are a consumer in the United Kingdom,
          the European Economic Area, or anywhere else with mandatory consumer protection,{" "}
          <b>you keep the benefit of the consumer law of the country you live in, and the right to
          bring proceedings in your own local courts</b>. Where that law conflicts with anything
          written here, your local law wins.
        </p>
        <p className="rn-fine">
          Data protection is separate from this clause and is not affected by it: because the app is
          offered to people in the UK and the EEA, UK and EU data protection law applies to your
          data regardless of where the operator lives. The{" "}
          <Link className="rn-link" href="/privacy">privacy notice</Link> sets out what that means
          and who to complain to.
        </p>
        <p className="rn-fine">
          If any part of these terms turns out to be unenforceable, the rest of them still apply.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">14 · Changes to these terms</div>
        <p className="rn-note">
          These terms are versioned, and the version you accepted is recorded against your account.
          If they change in a way that matters, you will be asked to read and accept the new version
          — not shown a silent update. The version at the top of this page is the current one.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Related</div>
        <p className="rn-note">
          <Link className="rn-link" href="/privacy">Privacy notice</Link> — what is stored, who can
          see it, how long it is kept, and how to get rid of it. It forms part of these terms.
        </p>
      </section>
    </main>
  );
}
