"use client";

import { useEffect, useRef, useState } from "react";
import type OpenSeadragon from "openseadragon";
import { laadFotos, type Foto } from "@/lib/fotos";
import stijl from "./FotoViewer.module.css";

/**
 * Fotopagina (RFP §4.4): deep-zoom via OpenSeadragon rechtstreeks op de IIIF
 * Image API van het Streekarchief (geen eigen beeldopslag), met +/− knoppen,
 * pinch-gestures en bronvermelding uit de API. De eerste foto staat in de
 * HTML; de volledige lijst wordt client-side geladen (lichte pagina's, ook
 * bij 1400+ foto's).
 */
export default function FotoViewer({
  eerste,
  totaal,
  straatNaam,
  slug,
}: {
  eerste: Foto | null;
  totaal: number;
  straatNaam: string;
  slug: string;
}) {
  const [fotos, setFotos] = useState<Foto[]>(eerste ? [eerste] : []);
  const [geladen, setGeladen] = useState(totaal <= 1);
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const foto = fotos[index] ?? null;

  // Volledige fotolijst laden en de startfoto uit ?foto=<id> kiezen
  useEffect(() => {
    if (totaal <= 1) return;
    let gestopt = false;
    laadFotos(slug)
      .then((alle) => {
        if (gestopt) return;
        setFotos(alle);
        setGeladen(true);
        const id = new URLSearchParams(window.location.search).get("foto");
        if (id) {
          const gevonden = alle.findIndex((f) => f.id === id);
          if (gevonden >= 0) setIndex(gevonden);
        }
      })
      .catch(() => setGeladen(true));
    return () => {
      gestopt = true;
    };
  }, [slug, totaal]);

  const tileSource = foto?.iiif ?? foto?.image ?? null;

  useEffect(() => {
    let gestopt = false;
    (async () => {
      const OSD = (await import("openseadragon")).default;
      if (gestopt || !containerRef.current) return;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      if (!tileSource) return;
      viewerRef.current = OSD({
        element: containerRef.current,
        tileSources: tileSource.endsWith("info.json")
          ? tileSource
          : { type: "image", url: tileSource },
        showNavigationControl: false,
        gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true },
        maxZoomPixelRatio: 2.5,
        visibilityRatio: 0.6,
      });
    })();
    return () => {
      gestopt = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [tileSource]);

  const zoom = (factor: number) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.viewport.zoomBy(factor);
    viewer.viewport.applyConstraints();
  };

  const gaNaar = (nieuweIndex: number) => {
    if (!fotos.length) return;
    const i = (nieuweIndex + fotos.length) % fotos.length;
    setIndex(i);
    const url = new URL(window.location.href);
    url.searchParams.set("foto", fotos[i].id);
    history.replaceState(null, "", url);
  };

  if (!foto) {
    return (
      <p className="pagina">
        Voor deze straat is nog geen beeldmateriaal beschikbaar.
      </p>
    );
  }

  const bron = [foto.vervaardiger, foto.datering, foto.bron]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={stijl.scherm}>
      <header className={stijl.kop}>
        <a href={`/straat/${slug}/`} className={stijl.terug}>
          ← {straatNaam}
        </a>
        <span className={stijl.teller} aria-live="polite">
          {index + 1} / {totaal}
        </span>
      </header>

      <div
        ref={containerRef}
        className={stijl.viewer}
        role="img"
        aria-label={foto.titel ?? `Historische afbeelding van ${straatNaam}`}
      />

      <div className={stijl.knoppen}>
        {totaal > 1 && (
          <button
            type="button"
            className={stijl.knop}
            onClick={() => gaNaar(index - 1)}
            disabled={!geladen}
            aria-label="Vorige afbeelding"
          >
            ‹
          </button>
        )}
        <button type="button" className={stijl.knop} onClick={() => zoom(1.4)} aria-label="Inzoomen">
          +
        </button>
        <button type="button" className={stijl.knop} onClick={() => zoom(1 / 1.4)} aria-label="Uitzoomen">
          −
        </button>
        {totaal > 1 && (
          <button
            type="button"
            className={stijl.knop}
            onClick={() => gaNaar(index + 1)}
            disabled={!geladen}
            aria-label="Volgende afbeelding"
          >
            ›
          </button>
        )}
      </div>

      <footer className={stijl.bron}>
        {foto.titel && <p className={stijl.bronTitel}>{foto.titel}</p>}
        {bron && <p className={stijl.bronRegel}>{bron}</p>}
        {foto.rechten && <p className={stijl.bronRegel}>{foto.rechten}</p>}
      </footer>
    </div>
  );
}
