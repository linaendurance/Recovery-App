"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REGIONS, FALLBACK, guessRegion, type Region } from "@/lib/crisis";

/**
 * Crisis signposting and the "this is not treatment" boundary.
 *
 * Region-aware rather than a hardcoded UK/US block, and honest about which
 * numbers have actually been checked. An unverified number is shown with a
 * caveat instead of being presented as reliable.
 */
export default function SafetyFooter() {
  const [region, setRegion] = useState<Region | null>(null);
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    // Locale only — this app never asks for location permission.
    setRegion(guessRegion(typeof navigator !== "undefined" ? navigator.language : undefined));
  }, []);

  const shown = region;

  return (
    <footer className="rn-safety">
      <p className="rn-safety-lead">
        This app is a self-help tool. It is not treatment, and it cannot assess you. Eating
        disorders are treatable, and outcomes are markedly better with professional support — if
        you have not spoken to a doctor or a registered dietitian about this, that is the single
        most useful thing on this page.
      </p>

      <div className="rn-region-row">
        <span className="rn-fine">Showing support services for:</span>
        <select
          className="rn-region-select"
          value={shown?.code ?? ""}
          onChange={(e) => {
            setPicked(true);
            setRegion(REGIONS.find((r) => r.code === e.target.value) ?? null);
          }}
          aria-label="Choose your region"
        >
          <option value="">{FALLBACK.label}</option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>{r.label}</option>
          ))}
        </select>
      </div>

      {shown ? (
        <>
          <ul className="rn-safety-list">
            {shown.resources.map((r) => (
              <li key={r.name}>
                <b>{r.name}</b>
                {r.contact && <> — <span className="rn-mono">{r.contact}</span></>}
                {r.url && (
                  <>
                    {" "}
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.url.replace(/^https?:\/\//, "")}
                    </a>
                  </>
                )}
                <em className="rn-safety-detail">{r.detail}</em>
                {!r.verified && (
                  <em className="rn-safety-unverified">
                    Not yet independently checked — please confirm before relying on it.
                  </em>
                )}
              </li>
            ))}
          </ul>
          <p className="rn-safety-fine">
            If you are in immediate danger, or you have collapsed, fainted or cannot keep fluids
            down, call <b>{shown.emergency}</b>.
          </p>
        </>
      ) : (
        <p className="rn-safety-fine">
          {FALLBACK.text}
          {!picked && " If one of the listed regions is yours, choose it above."}
        </p>
      )}

      <p className="rn-safety-fine">
        Sudden changes in eating can be medically risky in their own right — refeeding needs
        supervision when intake has been very low for a long time. Physical symptoms belong with a
        doctor, not with an app.{" "}
        <Link className="rn-link" href="/app/sources">Where the figures come from</Link>
        {" · "}
        <Link className="rn-link" href="/privacy">Privacy notice</Link>
      </p>
    </footer>
  );
}
