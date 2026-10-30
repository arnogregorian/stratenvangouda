"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Kaart, { type KaartHandle, BASISKAARTEN } from "./Kaart";
import Zoekveld from "./Zoekveld";
import GpsKnop from "./GpsKnop";
// import TaalWissel from "./TaalWissel"; // Taalkiezer voorlopig verborgen
import OfflineDownload from "./OfflineDownload";
import { type IndexItem } from "@/lib/zoekindex";
import {
  laatstBezocht,
  wisLaatstBezocht,
  verdwenenVoorkeur,
  zetVerdwenenVoorkeur,
} from "@/lib/bezocht";
import { useTaal } from "@/lib/taal";
import { useModaal } from "@/lib/useModaal";
import stijl from "./StartScherm.module.css";

/**
 * App-achtige startpagina: een schermvullende kaart met een gecentreerde
 * introkaart ("modal") die bij het laden verschijnt terwijl de kaart subtiel
 * driftt. De drift stopt zodra de intro sluit of de bezoeker met de kaart
 * interacteert. Onderin een vaste balk (Zoek · Buurt · Hulp · Colofon); "Zoek"
 * heropent de introkaart.
 */
export default function StartScherm() {
  const { t } = useTaal();
  const [introOpen, setIntroOpen] = useState(true);
  // Zodra de intro één keer gesloten is (of de bezoeker de kaart aanraakt),
  // keert de drift niet meer terug — ook niet als "Zoek" de kaart heropent.
  const [animGestopt, setAnimGestopt] = useState(false);
  const [verdwenenAan, setVerdwenenAan] = useState(false);
  const [kaartModal, setKaartModal] = useState(false);
  const [basiskaart, setBasiskaart] = useState("pdok");
  const [offlineModal, setOfflineModal] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const eersteRender = useRef(true);
  const kaartApi = useRef<KaartHandle>(null);
  const kaartModalRef = useRef<HTMLDivElement>(null);
  // Straat waarop ingezoomd moet worden zodra de kaart klaar is (terugkeer
  // vanaf een straatpagina, zie lib/bezocht.ts).
  const wachtendeStraat = useRef<string | null>(null);
  const [locatieMelding, setLocatieMelding] = useState<string | null>(null);

  // Alleen in de geïnstalleerde app (standalone) de offline-download tonen.
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setIsPWA(standalone);
  }, []);

  const sluitIntro = useCallback(() => {
    setIntroOpen(false);
    setAnimGestopt(true);
  }, []);

  const openZoek = useCallback(() => setIntroOpen(true), []);

  // Bij terugkeer vanaf een straatpagina: sla de intro over en onthoud de straat
  // om er op in te zoomen zodra de kaart geladen is. Ook de verdwenen-voorkeur
  // wordt hersteld (zie lib/bezocht.ts).
  useEffect(() => {
    const slug = laatstBezocht();
    if (slug) {
      wisLaatstBezocht();
      wachtendeStraat.current = slug;
      setIntroOpen(false);
      setAnimGestopt(true);
    }
    if (verdwenenVoorkeur()) {
      setVerdwenenAan(true);
      setIntroOpen(false);
      setAnimGestopt(true);
    }
  }, []);

  // Aangeroepen door de kaart zodra de straten geladen zijn: eerst de verdwenen-
  // laag herstellen (indien voorkeur), daarna inzoomen op de laatst bekeken straat.
  const kaartGereed = useCallback(async () => {
    if (verdwenenVoorkeur()) {
      try {
        await kaartApi.current?.zetVerdwenen(true);
      } catch {
        /* verdwenen-laag kon niet laden; huidige straten blijven staan */
      }
    }
    const slug = wachtendeStraat.current;
    if (slug) {
      wachtendeStraat.current = null;
      // Alleen markeren; de exacte viewport komt uit de URL-hash (terug-navigatie).
      kaartApi.current?.markeerStraat(slug);
    }
  }, []);

  // Intro-optie "Start op mijn locatie": zoom de kaart naar de live locatie.
  const startLocatie = useCallback(() => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocatieMelding(t.locatieHttps);
      return;
    }
    setLocatieMelding(null);
    setIntroOpen(false);
    setAnimGestopt(true);
    kaartApi.current?.startLiveLocatie();
  }, [t]);

  // Locator-knopje in de zoeksuggesties: niet navigeren, maar op de kaart tonen.
  const toonOpKaart = useCallback((item: IndexItem) => {
    setIntroOpen(false);
    setAnimGestopt(true);
    kaartApi.current?.zoomNaarStraat(item.s, item.c);
  }, []);

  // Verdwenen straten aan/uit. Bij inschakelen ook de intro sluiten.
  const wisselVerdwenen = useCallback(async () => {
    const nieuw = !verdwenenAan;
    setVerdwenenAan(nieuw);
    zetVerdwenenVoorkeur(nieuw); // sessiegebonden onthouden (blijft na terugkeer)
    if (nieuw) {
      setIntroOpen(false);
      setAnimGestopt(true);
    }
    try {
      await kaartApi.current?.zetVerdwenen(nieuw);
    } catch {
      setVerdwenenAan(false); // terugdraaien als het laden mislukt
      zetVerdwenenVoorkeur(false);
    }
  }, [verdwenenAan]);

  // Kaartlaag-modal openen (achterliggende intro sluiten voor zicht op de kaart).
  const openKaartModal = useCallback(() => {
    setIntroOpen(false);
    setAnimGestopt(true);
    setKaartModal(true);
  }, []);

  const kiesKaart = useCallback(async (id: string) => {
    setBasiskaart(id);
    setKaartModal(false);
    try {
      await kaartApi.current?.zetBasiskaart(id);
    } catch {
      /* stil falen: de vorige kaart blijft staan */
    }
  }, []);

  // Escape sluit de intro-dialog (bewust niet-modaal; de kaart erachter blijft
  // bruikbaar). De kaartlaag-modal regelt zijn eigen Escape, focus-trap en
  // focus-herstel via useModaal hieronder.
  useEffect(() => {
    if (!introOpen) return;
    const bijToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") sluitIntro();
    };
    window.addEventListener("keydown", bijToets);
    return () => window.removeEventListener("keydown", bijToets);
  }, [introOpen, sluitIntro]);

  useModaal(kaartModal, kaartModalRef, () => setKaartModal(false));

  // Zoekveld focussen bij héropenen — niet bij de eerste weergave, om geen
  // ongevraagd toetsenbord op mobiel te openen.
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    if (introOpen) {
      // Dubbele rAF: pas focussen nádat de commit is geverfd en `inert` echt
      // weg is, anders wint het net-heropende paneel de focus-race niet.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => document.getElementById("zoek")?.focus())
      );
    }
  }, [introOpen]);

  return (
    <main id="inhoud" className={stijl.scherm}>
      <Kaart
        ref={kaartApi}
        anim={introOpen && !animGestopt}
        onInteractie={sluitIntro}
        onGereed={kaartGereed}
      />

      <button
        type="button"
        className={stijl.kaartKnop}
        onClick={openKaartModal}
        aria-haspopup="dialog"
        aria-label={t.kaartlaagKiezen}
      >
        <svg
          aria-hidden="true"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 4 3 6.2v13.8l6-2.2 6 2.2 6-2.2V4l-6 2.2z" />
          <path d="M9 4v13.8M15 6.2V20" />
        </svg>
      </button>

      {/* Taalkiezer voorlopig verborgen.
      <div className={stijl.taalHoek}>
        <TaalWissel />
      </div>
      */}

      <div
        className={`${stijl.scrim} ${introOpen ? stijl.scrimOpen : ""}`}
        aria-hidden="true"
      />

      <section
        id="intro-dialog"
        role="dialog"
        aria-label={t.welkom}
        inert={!introOpen}
        className={`${stijl.intro} ${introOpen ? stijl.introOpen : ""}`}
      >
        <button
          type="button"
          className={stijl.sluit}
          onClick={sluitIntro}
          aria-label={t.sluiten}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h1 className={stijl.titel}>Straten van Gouda</h1>
        <p className={stijl.ondertitel}>{t.introTekst}</p>
        <button
          type="button"
          className={stijl.locatieKnop}
          onClick={startLocatie}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21c-4-4.5-7-8-7-11.5a7 7 0 1 1 14 0C19 13 16 16.5 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {t.startOpLocatie}
        </button>
        {/* Persistente live-regio (bestaat vóór de melding); verborgen zolang er
            geen melding is, zodat er geen lege ruimte in de intro ontstaat. */}
        <p
          className={locatieMelding ? stijl.locatieMelding : "alleen-screenreader"}
          aria-live="polite"
        >
          {locatieMelding}
        </p>
        <div className={stijl.ofScheiding}>
          <span>{t.ofScheiding}</span>
        </div>
        <Zoekveld onLocate={toonOpKaart} />
        <p className={stijl.hint}>{t.introHint}</p>
        {isPWA && (
          <button
            type="button"
            className={stijl.offlineKnop}
            onClick={() => setOfflineModal(true)}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
              <path d="M5 21h14" />
            </svg>
            {t.offlineOpslaan}
          </button>
        )}
      </section>

      <nav className={stijl.balk} aria-label={t.hoofdnavigatie}>
        <button
          type="button"
          className={stijl.tab}
          onClick={openZoek}
          aria-expanded={introOpen}
          aria-controls="intro-dialog"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          {t.zoek}
        </button>

        <GpsKnop
          className={stijl.tab}
          label={t.mijnLocatie}
          onStart={() => kaartApi.current?.startLiveLocatie()}
        />

        <button
          type="button"
          className={verdwenenAan ? `${stijl.tab} ${stijl.tabActief}` : stijl.tab}
          onClick={wisselVerdwenen}
          aria-pressed={verdwenenAan}
          aria-label={t.verdwenenStraten}
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.1 8.5a3 3 0 1 1 4.3 2.9c-.9.5-1.4 1-1.4 2.1" />
            <path d="M12 17.5h.01" />
          </svg>
          {t.verdwenen}
        </button>

        <a href="/hulp/" className={stijl.tab}>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.34c-.72.28-.9.9-.9 1.66M12 16.5h.01" />
          </svg>
          {t.hulp}
        </a>

        <a href="/colofon/" className={stijl.tab}>
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          {t.colofon}
        </a>
      </nav>

      {kaartModal && (
        <div
          ref={kaartModalRef}
          className={stijl.modalLaag}
          role="dialog"
          aria-modal="true"
          aria-label={t.kaartlaagKiezen}
          tabIndex={-1}
        >
          <button
            type="button"
            className={stijl.modalScrim}
            aria-label={t.sluiten}
            onClick={() => setKaartModal(false)}
          />
          <div className={stijl.modalPaneel}>
            <div className={stijl.modalKop}>
              <h2 className={stijl.modalTitel}>{t.kaartlaag}</h2>
              <button
                type="button"
                className={stijl.sluit}
                onClick={() => setKaartModal(false)}
                aria-label={t.sluiten}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className={stijl.kaartLijst}>
              {BASISKAARTEN.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    className={k.id === basiskaart ? stijl.kaartKeuzeActief : stijl.kaartKeuze}
                    aria-pressed={k.id === basiskaart}
                    onClick={() => kiesKaart(k.id)}
                  >
                    <span className={stijl.kaartNaam}>
                      {t.kaartNaam(k.id, k.naam)}
                    </span>
                    <span className={stijl.kaartJaar}>
                      {k.id === "pdok" ? t.kaartNu : k.jaar}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <OfflineDownload
        open={offlineModal}
        onClose={() => setOfflineModal(false)}
      />
    </main>
  );
}
