"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Map as LeafletMap, Polyline, GeoJSON, TileLayer } from "leaflet";

// PDOK BRT-Achtergrondkaart (RFP §6.2): open data van het Kadaster, geen
// Google Maps. Attributie verplicht.
const PDOK_TILES =
  "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";
const ATTRIBUTIE =
  'Kaart: <a href="https://www.pdok.nl">Kadaster / PDOK</a>';
const GOUDA_CENTRUM: [number, number] = [52.0115, 4.7105];
const START_ZOOM = 16;

// Historische kaartondergronden (WMS, Gemeente Gouda) als alternatief voor PDOK.
const WMS_URL = "https://gis.gouda.nl/geoserver/CHRASTER/wms?";
const WMS_ATTRIB = "<a href='https://gis.gouda.nl'>Gemeente Gouda</a>";
const WMS_LAGEN: Record<string, string> = {
  deventer: "Jacob_van_Deventer",
  braun: "braun_hogenberg",
  kad1613: "Kadastrale_kaart_1613",
  blaeu: "StadsplattegrondBlaeu1649",
  kad1832: "Kadastrale_kaart_1832",
};

/** Keuzelijst voor de kaartlaag-modal (volgorde = weergavevolgorde). */
export const BASISKAARTEN: { id: string; naam: string; jaar: string }[] = [
  { id: "pdok", naam: "Actuele kaart", jaar: "nu" },
  { id: "deventer", naam: "Jacob van Deventer", jaar: "1572" },
  { id: "braun", naam: "Braun en Hogenberg", jaar: "1585" },
  { id: "kad1613", naam: "Kadastrale kaart", jaar: "1613" },
  { id: "blaeu", naam: "Blaeu", jaar: "1649" },
  { id: "kad1832", naam: "Kadastrale kaart", jaar: "1832" },
];

/** Imperatieve handle waarmee bijv. het zoekveld naar een straat kan inzoomen. */
export type KaartHandle = {
  zoomNaarStraat: (slug: string, centroid?: [number, number]) => void;
  /** Verdwenen-stratenlaag tonen/verbergen (wordt lui opgehaald). */
  zetVerdwenen: (aan: boolean) => Promise<void>;
  /** Wissel de kaartondergrond (zie BASISKAARTEN). */
  zetBasiskaart: (id: string) => Promise<void>;
};

type Props = {
  /** Toon de subtiele intro-drift. Stopt bij de eerste interactie of zodra false. */
  anim?: boolean;
  /** Aangeroepen zodra de bezoeker zélf met de kaart begint te interacteren. */
  onInteractie?: () => void;
  ref?: React.Ref<KaartHandle>;
};

export default function Kaart({ anim = false, onInteractie, ref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<LeafletMap | null>(null);
  // Straatlijnen op slug, plus de nu gemarkeerde lijn (voor het locator-knopje).
  const laagPerSlug = useRef<Record<string, Polyline>>({});
  const gemarkeerd = useRef<Polyline | null>(null);
  const stratenLaag = useRef<GeoJSON | null>(null);
  const verdwenenLaag = useRef<GeoJSON | null>(null);
  const basiskaartLaag = useRef<TileLayer | null>(null);
  const [gereed, setGereed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      zoomNaarStraat(slug, centroid) {
        const kaart = kaartRef.current;
        if (!kaart) return;
        const laag = laagPerSlug.current[slug];
        // Vorige markering herstellen.
        if (gemarkeerd.current && gemarkeerd.current !== laag) {
          gemarkeerd.current.setStyle({ weight: 5, opacity: 0.75 });
          gemarkeerd.current = null;
        }
        if (laag) {
          kaart.fitBounds(laag.getBounds(), {
            paddingTopLeft: [40, 70],
            paddingBottomRight: [40, 110], // ruimte onder de onderbalk
            maxZoom: 17,
          });
          laag.setStyle({ weight: 9, opacity: 1 });
          laag.bringToFront();
          laag.openTooltip();
          gemarkeerd.current = laag;
        } else if (centroid) {
          // Terugval als de straat geen lijn heeft: centroïde ([lon, lat]).
          kaart.setView([centroid[1], centroid[0]], 17);
        }
      },
      async zetVerdwenen(aan) {
        const kaart = kaartRef.current;
        if (!kaart) return;
        // Uit: verdwenen laag weg, huidige straten terug.
        if (!aan) {
          if (verdwenenLaag.current) kaart.removeLayer(verdwenenLaag.current);
          if (stratenLaag.current && !kaart.hasLayer(stratenLaag.current)) {
            stratenLaag.current.addTo(kaart);
          }
          return;
        }
        if (!verdwenenLaag.current) {
          const L = (await import("leaflet")).default;
          // Eigen data (met slug) zodat verdwenen straten aanklikbaar zijn en
          // een echte detailpagina openen, net als de huidige straten.
          const res = await fetch("/data/verdwenen.geojson");
          if (!res.ok) throw new Error("Verdwenen straten konden niet geladen worden");
          const geojson = await res.json();
          verdwenenLaag.current = L.geoJSON(geojson, {
            style: { color: "#6a3fb5", weight: 5, opacity: 0.85 },
            onEachFeature: (feature, laag) => {
              const { naam, slug } = feature.properties as {
                naam: string;
                slug: string;
              };
              laag.bindTooltip(naam, { sticky: true, direction: "top" });
              laag.on("click", () => {
                window.location.href = `/straat/${slug}/`;
              });
              laag.on("mouseover", () =>
                (laag as L.Path).setStyle({ weight: 8, opacity: 1 })
              );
              laag.on("mouseout", () =>
                (laag as L.Path).setStyle({ weight: 5, opacity: 0.85 })
              );
            },
          });
        }
        // Alleen verdwenen straten tonen: huidige straten verbergen.
        if (stratenLaag.current) kaart.removeLayer(stratenLaag.current);
        verdwenenLaag.current.addTo(kaart);
      },
      async zetBasiskaart(id) {
        const kaart = kaartRef.current;
        if (!kaart) return;
        const L = (await import("leaflet")).default;
        const nieuw =
          id === "pdok" || !WMS_LAGEN[id]
            ? L.tileLayer(PDOK_TILES, { attribution: ATTRIBUTIE, maxZoom: 19, minZoom: 11 })
            : L.tileLayer.wms(WMS_URL, {
                layers: WMS_LAGEN[id],
                attribution: WMS_ATTRIB,
              });
        if (basiskaartLaag.current) kaart.removeLayer(basiskaartLaag.current);
        nieuw.addTo(kaart);
        nieuw.bringToBack(); // onder de straatlijnen houden
        basiskaartLaag.current = nieuw;
      },
    }),
    []
  );

  useEffect(() => {
    let gestopt = false;

    (async () => {
      // Leaflet gebruikt `window` en kan dus pas in de browser geladen worden.
      const L = (await import("leaflet")).default;
      if (gestopt || !containerRef.current || kaartRef.current) return;

      const kaart = L.map(containerRef.current, {
        center: GOUDA_CENTRUM,
        zoom: START_ZOOM,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: false,
        // Canvas-renderer met ruime kliktolerantie: soepel bij 1000+ lijnen
        // en grotere tikdoelen op touchscreens.
        renderer: L.canvas({ tolerance: 12 }),
      });
      kaartRef.current = kaart;
      L.control.zoom({ position: "bottomleft" }).addTo(kaart);
      basiskaartLaag.current = L.tileLayer(PDOK_TILES, {
        attribution: ATTRIBUTIE,
        maxZoom: 19,
        minZoom: 11,
      }).addTo(kaart);

      const antwoord = await fetch("/data/straten.geojson");
      if (!antwoord.ok || gestopt) return;
      const geojson = await antwoord.json();

      stratenLaag.current = L.geoJSON(geojson, {
        style: { color: "#d32016", weight: 5, opacity: 0.75 },
        onEachFeature: (feature, laag) => {
          const { naam, slug } = feature.properties as {
            naam: string;
            slug: string;
          };
          laagPerSlug.current[slug] = laag as Polyline;
          laag.bindTooltip(naam, { sticky: true, direction: "top" });
          laag.on("click", () => {
            window.location.href = `/straat/${slug}/`;
          });
          laag.on("mouseover", () =>
            (laag as L.Path).setStyle({ weight: 8, opacity: 1 })
          );
          laag.on("mouseout", () =>
            (laag as L.Path).setStyle({ weight: 5, opacity: 0.75 })
          );
        },
      }).addTo(kaart);

      if (!gestopt) setGereed(true);
    })();

    return () => {
      gestopt = true;
      kaartRef.current?.remove();
      kaartRef.current = null;
    };
  }, []);

  // Intro-drift + interactiedetectie. Draait alleen als de kaart klaar is en
  // `anim` aan staat. De beweging is een puur CSS-transform op de container:
  // die loopt op de GPU-compositor, dus zonder Leaflet-herberekening en zonder
  // schokken (in tegenstelling tot per-frame setView). De drift stopt zodra de
  // bezoeker zelf tikt, sleept, scrollt of het toetsenbord gebruikt (dan sluit
  // de intro) of wanneer de intro sluit. Overgeslagen bij prefers-reduced-
  // motion (WCAG 2.2 AA); de interactiedetectie blijft dan wél actief.
  useEffect(() => {
    const container = containerRef.current;
    if (!gereed || !anim || !container) return;

    const reduceer = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let drift: Animation | null = null;
    let afgehandeld = false;

    // Stopt de drift. `soepel` laat de transform in ~0,6 s terugveren naar de
    // ruststand (voor sluiten via ✕/Esc); bij interactie zetten we hem direct
    // terug zodat de kaartcoördinaten meteen weer kloppen voor het slepen.
    const stopDrift = (soepel: boolean) => {
      let huidig = "none";
      if (drift) {
        huidig = getComputedStyle(container).transform;
        drift.cancel();
        drift = null;
      }
      container.style.willChange = "";
      if (soepel && huidig && huidig !== "none") {
        container.style.transform = huidig;
        void container.offsetWidth; // reflow forceren vóór de transitie
        container.style.transition = "transform 0.6s ease-out";
        container.style.transform = "none";
        const opruimen = () => {
          container.style.transition = "";
          container.style.transform = "";
          container.removeEventListener("transitionend", opruimen);
        };
        container.addEventListener("transitionend", opruimen);
      } else {
        container.style.transition = "";
        container.style.transform = "";
      }
    };

    const bijInteractie = () => {
      if (afgehandeld) return;
      afgehandeld = true;
      stopDrift(false);
      onInteractie?.();
    };

    if (!reduceer) {
      container.style.transformOrigin = "center";
      container.style.willChange = "transform";
      // Rustige, langzame "adem": subtiele schaal + minieme verschuiving. De
      // schaal blijft ≥ 1.03 zodat de verschuiving nooit een rand vrijlegt.
      drift = container.animate(
        [
          { transform: "scale(1.035) translate(-0.7%, -0.5%)" },
          { transform: "scale(1.05) translate(0.6%, 0.7%)" },
          { transform: "scale(1.045) translate(0.7%, -0.6%)" },
          { transform: "scale(1.035) translate(-0.7%, -0.5%)" },
        ],
        { duration: 44000, iterations: Infinity, easing: "ease-in-out" }
      );
    }

    const vang: AddEventListenerOptions = { capture: true };
    const passief: AddEventListenerOptions = { passive: true };
    container.addEventListener("pointerdown", bijInteractie, vang);
    container.addEventListener("touchstart", bijInteractie, passief);
    container.addEventListener("wheel", bijInteractie, passief);
    container.addEventListener("keydown", bijInteractie);

    return () => {
      container.removeEventListener("pointerdown", bijInteractie, vang);
      container.removeEventListener("touchstart", bijInteractie, passief);
      container.removeEventListener("wheel", bijInteractie, passief);
      container.removeEventListener("keydown", bijInteractie);
      // Intro gesloten zónder kaartinteractie (✕/Esc/Zoek): soepel terugveren.
      stopDrift(!afgehandeld);
    };
  }, [gereed, anim, onInteractie]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Kaart van Gouda met aanklikbare straten. Gebruik het zoekveld als toegankelijk alternatief."
      style={{ position: "absolute", inset: 0, background: "#eae6df" }}
    />
  );
}
