"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Kaart, { type KaartHandle, BASISKAARTEN } from "./Kaart";
import Zoekveld from "./Zoekveld";
import GpsKnop from "./GpsKnop";
import TaalWissel from "./TaalWissel";
import OfflineDownload from "./OfflineDownload";
import { type IndexItem } from "@/lib/zoekindex";
import { useTaal } from "@/lib/taal";
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
    if (nieuw) {
      setIntroOpen(false);
      setAnimGestopt(true);
    }
    try {
      await kaartApi.current?.zetVerdwenen(nieuw);
    } catch {
      setVerdwenenAan(false); // terugdraaien als het laden mislukt
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

  // Escape sluit de bovenliggende modal (kaartlaag) of anders de intro.
  useEffect(() => {
    if (!introOpen && !kaartModal) return;
    const bijToets = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (kaartModal) setKaartModal(false);
      else sluitIntro();
    };
    window.addEventListener("keydown", bijToets);
    return () => window.removeEventListener("keydown", bijToets);
  }, [introOpen, kaartModal, sluitIntro]);

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

      <div className={stijl.taalHoek}>
        <TaalWissel />
      </div>

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

        <GpsKnop className={stijl.tab} label={t.mijnLocatie} />

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
          className={stijl.modalLaag}
          role="dialog"
          aria-modal="true"
          aria-label={t.kaartlaagKiezen}
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
