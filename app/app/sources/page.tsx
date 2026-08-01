"use client";

import { useEffect, useState } from "react";
import { SOURCES, NUTRIENT_ORDER, referencesFor, PRESENCE_THRESHOLD, type AgeBand } from "@/lib/nutrition";
import { PROVENANCE } from "@/lib/facts";
import { LONG_GAP_MINS } from "@/lib/analysis";
import { loadProfileContext } from "@/lib/profile";
import { fmtGap } from "@/lib/dates";

export default function SourcesPage() {
  const [band, setBand] = useState<AgeBand>("19plus");

  useEffect(() => {
    loadProfileContext().then((ctx) => setBand(ctx.band));
  }, []);

  const references = referencesFor(band);

  return (
    <>
      <section className="rn-card">
        <div className="rn-label">Where these figures come from</div>
        <p className="rn-note">{PROVENANCE}</p>
      </section>

      <section className="rn-card">
        <div className="rn-label">
          Your reference values · {band === "13-18" ? "ages 13-18" : "ages 19 and over"}
        </div>
        <p className="rn-note">
          These change with age. Calcium in particular is higher before about 19, because most
          adult bone mass is laid down by then — which is the only reason this app asks for a year
          of birth.
        </p>
        <ul className="rn-sourcelist">
          {NUTRIENT_ORDER.map((k) => {
            const r = references[k];
            return (
              <li key={k}>
                <div className="rn-source-head">
                  <b>{r.label}</b>
                  <span className="rn-mono">
                    {r.floor === null ? "no gram floor" : `${r.floor} ${r.unit}/day`}
                  </span>
                </div>
                <p className="rn-fine">{r.basis}</p>
                <p className="rn-cite">{SOURCES[r.source].short}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rn-card">
        <div className="rn-label">Numbers this app made up itself</div>
        <p className="rn-note">
          Not everything on screen is a published reference value. These are the app&apos;s own
          thresholds, chosen to notice a pattern rather than to grade anything. They are listed
          here because a number that looks clinical but isn&apos;t is worse than no number at all.
        </p>
        <ul className="rn-facts">
          <li>
            <span>&ldquo;Long gap&rdquo; between eating occasions</span>
            <b className="rn-mono">{fmtGap(LONG_GAP_MINS)}</b>
          </li>
          <li>
            <span>Carbohydrate counts as &ldquo;present&rdquo; in a meal above</span>
            <b className="rn-mono">{PRESENCE_THRESHOLD.carbs} g</b>
          </li>
          <li>
            <span>Fat counts as &ldquo;present&rdquo; in a meal above</span>
            <b className="rn-mono">{PRESENCE_THRESHOLD.fat} g</b>
          </li>
          <li>
            <span>Protein counts as &ldquo;present&rdquo; in a meal above</span>
            <b className="rn-mono">{PRESENCE_THRESHOLD.protein} g</b>
          </li>
        </ul>
        <p className="rn-fine">
          The gap threshold is set just above the three-hour spacing used in standard recovery meal
          structures. The presence thresholds are deliberately low: the aim is to notice a meal
          built from one macronutrient alone, not to judge a meal that has less of something.
        </p>
      </section>

      <section className="rn-card">
        <div className="rn-label">Full references</div>
        <ul className="rn-sourcelist">
          {Object.values(SOURCES).map((s) => (
            <li key={s.id}>
              <div className="rn-source-head">
                <b>{s.short}</b>
              </div>
              <p className="rn-fine">{s.full}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rn-card">
        <div className="rn-label">Food composition values</div>
        <p className="rn-note">
          Per-100 g nutrient values for the {115} foods in the picker are standard food-composition
          values. Carbohydrate is recorded as <em>available</em> carbohydrate — carbohydrate by
          difference minus fibre — so it does not double-count the fibre shown separately. Portion
          sizes are typical-serving estimates so that nothing has to be weighed; the multiplier on
          the log screen is there because a rough answer is the intended level of precision.
        </p>
        <p className="rn-fine">
          These values are estimates. They are good enough to show the shape of a day and to notice
          a nutrient that is consistently missing. They are not accurate enough to manage a
          diagnosed deficiency, which is a job for a blood test and a dietitian.
        </p>
      </section>
    </>
  );
}
