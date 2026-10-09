"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { afstandMeters, laadIndex, type IndexItem } from "@/lib/zoekindex";
import { useTaal } from "@/lib/taal";
import stijl from "./GpsKnop.module.css";

type Resultaat = { item: IndexItem; afstand: number };

type Props = {
  /** Overschrijft de standaard pill-knop, bijv. om als onderbalk-tab te tonen. */
  className?: string;
  /** Label naast het icoon (kort in de onderbalk). */
  label?: string;
  /** Aangeroepen bij een klik: laat bijv. de kaart naar de live locatie inzoomen. */
  onStart?: () => void;
};

/**
 * "Straten in mijn buurt": locatie wordt pas opgevraagd ná een klik
 * (expliciete toestemming via de browserprompt, RFP §4.2). De berekening
 * gebeurt volledig client-side; er wordt geen locatie verstuurd.
 */
export default function GpsKnop({
  className,
  label = "Straten in mijn buurt",
  onStart,
}: Props) {
  const { t } = useTaal();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaten, setResultaten] = useState<Resultaat[]>([]);

  const zoekInBuurt = () => {
    setOpen(true);
    setBezig(true);
    setFout(null);
    if (!navigator.geolocation) {
      setFout(t.locatieNietOndersteund);
      setBezig(false);
      return;
    }
    if (!window.isSecureContext) {
      // Buiten een beveiligde context (https/localhost) geeft geolocatie geen
      // prompt maar een stille weigering — toon een duidelijke melding.
      setFout(t.locatieHttps);
      setBezig(false);
      return;
    }
    // Laat ook de kaart eronder naar de live locatie inzoomen.
    onStart?.();
    navigator.geolocation.getCurrentPosition(
      async (positie) => {
        try {
          const index = await laadIndex();
          const hier: [number, number] = [
            positie.coords.longitude,
            positie.coords.latitude,
          ];
          const dichtbij = index
            .filter((i) => i.c)
            .map((item) => ({
              item,
              afstand: afstandMeters(hier, item.c as [number, number]),
            }))
            .sort((a, b) => a.afstand - b.afstand)
            .slice(0, 8);
          setResultaten(dichtbij);
        } catch {
          setFout(t.stratenlijstFout);
        }
        setBezig(false);
      },
      (err) => {
        setFout(
          err.code === err.PERMISSION_DENIED
            ? t.locatieGeweigerd
            : t.locatieOnbekend
        );
        setBezig(false);
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  };

  const toonAfstand = (m: number) => t.afstand(m);

  return (
    <>
      <button
        type="button"
        className={className ?? stijl.knop}
        onClick={zoekInBuurt}
        aria-haspopup="dialog"
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21c-4-4.5-7-8-7-11.5a7 7 0 1 1 14 0C19 13 16 16.5 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        {label}
      </button>

      {/* Via een portal naar <body> zodat de gecentreerde modal niet gevangen
          raakt in de containing block van de onderbalk (die `backdrop-filter`
          gebruikt en zo een fixed-descendant aan zich bindt). */}
      {open &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.stratenInBuurt}
          className={stijl.laag}
        >
          <button
            type="button"
            className={stijl.scrim}
            aria-label={t.sluiten}
            onClick={() => setOpen(false)}
          />
          <div className={stijl.paneel}>
            <div className={stijl.paneelKop}>
              <h2 className={stijl.titel}>{t.stratenInBuurt}</h2>
              <button
                type="button"
                className={stijl.sluit}
                onClick={() => setOpen(false)}
                aria-label={t.sluiten}
              >
                ✕
              </button>
            </div>
            {bezig && <p aria-live="polite">{t.locatieBepalen}</p>}
            {fout && <p aria-live="polite">{fout}</p>}
            {!bezig && !fout && (
              <ul className={stijl.lijst}>
                {resultaten.map(({ item, afstand }) => (
                  <li key={item.s}>
                    <a href={`/straat/${item.s}/`} className={stijl.link}>
                      <span>
                        {item.n}
                        {item.v && <span className={stijl.tag}>{t.verdwenen}</span>}
                      </span>
                      <span className={stijl.afstand}>{toonAfstand(afstand)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
