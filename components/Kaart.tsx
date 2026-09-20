"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type {
  Map as LeafletMap,
  Polyline,
  GeoJSON,
  TileLayer,
  CircleMarker,
  Circle,
} from "leaflet";
import { bezochteSlugs } from "@/lib/bezocht";

// PDOK BRT-Achtergrondkaart (RFP §6.2): open data van het Kadaster, geen
// Google Maps. Attributie verplicht.
const PDOK_TILES =
  "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";
const ATTRIBUTIE =
  'Kaart: <a href="https://www.pdok.nl">Kadaster / PDOK</a>';
const GOUDA_CENTRUM: [number, number] = [52.0115, 4.7105];
const START_ZOOM = 16;

// Straatlijnen: normale kleur en een donkerder tint voor straten die deze sessie
// al bekeken zijn (zie lib/bezocht.ts).
const STRAAT_KLEUR = "#d32016";
const STRAAT_KLEUR_BEZOCHT = "#8f1610";
// Live-locatie: blauwe stip + nauwkeurigheidscirkel, contrasteert met de straten.
const LOCATIE_KLEUR = "#1d6fd6";
const LOCATIE_OPTIES = {
  watch: true,
  setView: true,
  maxZoom: 17,
  enableHighAccuracy: true,
} as const;

// Historische kaarten liggen als overlay óp PDOK. Blaeu (1649) komt uit de
// GeoWebCache-WMTS van de Gemeente Gouda in het native EPSG:900913-tegelgrid
// (= 3857); de kadastrale kaart van 1832 uit de tileserver van HUC KNAW.
const WMTS_URL =
  "https://gis.gouda.nl/geoserver/gwc/service/wmts?Service=WMTS&Request=GetTile&Version=1.0.0" +
  "&Layer=CHRASTER:{laag}&Style=&TileMatrixSet=EPSG:900913&Format=image/png" +
  "&TileMatrix=EPSG:900913:{z}&TileCol={x}&TileRow={y}";
const WMTS_ATTRIB = "<a href='https://gis.gouda.nl'>Gemeente Gouda</a>";
// Per laag de tegel-URL, bronvermelding en (optioneel) dekking. Buiten `bounds`
// vraagt Leaflet geen tegels op — nodig voor de WMTS, die daarbuiten een 400
// geeft in plaats van een lege tegel.
const HISTORISCHE_LAGEN: Record<
  string,
  {
    url: string;
    attribution: string;
    bounds?: [[number, number], [number, number]];
    maxNativeZoom?: number;
  }
> = {
  blaeu: {
    url: WMTS_URL.replace("{laag}", "StadsplattegrondBlaeu1649"),
    attribution: WMTS_ATTRIB,
    bounds: [[52.004051, 4.694818], [52.01798, 4.722507]],
    maxNativeZoom: 18, // voorbij z18 levert de WMTS alleen lege tegels
  },
  kad1832: {
    url: "https://tileserver.huc.knaw.nl/{z}/{x}/{y}",
    attribution: "Tiles HUC KNAW",
  },
};

/** Keuzelijst voor de kaartlaag-modal (volgorde = weergavevolgorde). */
export const BASISKAARTEN: { id: string; naam: string; jaar: string }[] = [
  { id: "pdok", naam: "Actuele kaart", jaar: "nu" },
  { id: "blaeu", naam: "Blaeu", jaar: "1649" },
  { id: "kad1832", naam: "Kadastrale kaart", jaar: "1832" },
];

// Kaartpositie in de URL-hash (#zoom/lat/lng). Zo herstelt de browser-"terug"
// de vorige kaartpositie en zijn kaartlinks deelbaar/bladwijzerbaar.
function leesHashPositie(): { center: [number, number]; zoom: number } | null {
  const m = /^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(
    window.location.hash
  );
  if (!m) return null;
  const zoom = Number(m[1]);
  const lat = Number(m[2]);
  const lng = Number(m[3]);
  if (![zoom, lat, lng].every(Number.isFinite)) return null;
  return { center: [lat, lng], zoom };
}

function schrijfHashPositie(kaart: LeafletMap): void {
  const c = kaart.getCenter();
  const z = Math.round(kaart.getZoom() * 100) / 100;
  history.replaceState(null, "", `#${z}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}`);
}

/** Imperatieve handle waarmee bijv. het zoekveld naar een straat kan inzoomen. */
export type KaartHandle = {
  zoomNaarStraat: (slug: string, centroid?: [number, number]) => void;
  /** Verdwenen-stratenlaag tonen/verbergen (wordt lui opgehaald). */
  zetVerdwenen: (aan: boolean) => Promise<void>;
  /** Wissel de kaartondergrond (zie BASISKAARTEN). */
  zetBasiskaart: (id: string) => Promise<void>;
  /** Vraag de live locatie op, toon een stip en zoom er (blijvend) naartoe. */
  startLiveLocatie: () => void;
  /** Markeer een straatlijn (highlight) zónder de viewport te verplaatsen. */
  markeerStraat: (slug: string) => void;
};

type Props = {
  /** Toon de subtiele intro-drift. Stopt bij de eerste interactie of zodra false. */
  anim?: boolean;
  /** Aangeroepen zodra de bezoeker zélf met de kaart begint te interacteren. */
  onInteractie?: () => void;
  /** Aangeroepen zodra de straten geladen zijn (voor "zoom bij terugkeer"). */
  onGereed?: () => void;
  ref?: React.Ref<KaartHandle>;
};

export default function Kaart({
  anim = false,
  onInteractie,
  onGereed,
  ref,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<LeafletMap | null>(null);
  // Straatlijnen op slug, plus de nu gemarkeerde lijn (voor het locator-knopje).
  const laagPerSlug = useRef<Record<string, Polyline>>({});
  const gemarkeerd = useRef<Polyline | null>(null);
  const stratenLaag = useRef<GeoJSON | null>(null);
  const verdwenenLaag = useRef<GeoJSON | null>(null);
  const historischeLaag = useRef<TileLayer | null>(null);
  // Live-locatie: stip + nauwkeurigheidscirkel, plus een vlag als er om locatie
  // gevraagd is vóór de kaart klaar was.
  const locatieMarker = useRef<CircleMarker | null>(null);
  const locatieCirkel = useRef<Circle | null>(null);
  const wilLocatie = useRef(false);
  // Laatste onGereed-callback in een ref, zodat de init-effect niet opnieuw hoeft
  // te draaien als de prop van identiteit verandert.
  const onGereedRef = useRef(onGereed);
  onGereedRef.current = onGereed;
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
              // Ook verdwenen lijnen opzoekbaar maken, zodat de homepage er bij
              // terugkeer op kan inzoomen (zie zoomNaarStraat).
              laagPerSlug.current[slug] = laag as Polyline;
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
        // De historische kaart ligt als overlay óp PDOK in plaats van ervoor
        // in de plaats: buiten de dekking van de oude kaart (bijv. Westergouwe)
        // blijft zo de actuele kaart zichtbaar in plaats van een leeg vlak.
        if (historischeLaag.current) {
          kaart.removeLayer(historischeLaag.current);
          historischeLaag.current = null;
        }
        const def = HISTORISCHE_LAGEN[id];
        if (!def) return; // "pdok": alleen de basiskaart
        historischeLaag.current = L.tileLayer(def.url, {
          attribution: def.attribution,
          bounds: def.bounds ? L.latLngBounds(def.bounds) : undefined,
          maxZoom: 19,
          maxNativeZoom: def.maxNativeZoom,
          zIndex: 2, // boven PDOK; de straatlijnen zitten in een eigen pane
        }).addTo(kaart);
      },
      startLiveLocatie() {
        const kaart = kaartRef.current;
        if (!kaart) {
          // Kaart nog aan het laden: onthoud de wens en start zodra hij klaar is.
          wilLocatie.current = true;
          return;
        }
        kaart.locate(LOCATIE_OPTIES);
      },
      markeerStraat(slug) {
        // Alleen highlighten; de exacte viewport komt uit de URL-hash.
        const laag = laagPerSlug.current[slug];
        if (gemarkeerd.current && gemarkeerd.current !== laag) {
          gemarkeerd.current.setStyle({ weight: 5, opacity: 0.75 });
          gemarkeerd.current = null;
        }
        if (laag) {
          laag.setStyle({ weight: 9, opacity: 1 });
          laag.bringToFront();
          laag.openTooltip();
          gemarkeerd.current = laag;
        }
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

      // Beginpositie uit de URL-hash (#zoom/lat/lng) indien aanwezig — zo
      // herstelt browser-"terug" de vorige kaartpositie — anders het centrum.
      const startPositie = leesHashPositie();
      const kaart = L.map(containerRef.current, {
        center: startPositie?.center ?? GOUDA_CENTRUM,
        zoom: startPositie?.zoom ?? START_ZOOM,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: false,
        // Canvas-renderer met ruime kliktolerantie: soepel bij 1000+ lijnen
        // en grotere tikdoelen op touchscreens.
        renderer: L.canvas({ tolerance: 12 }),
      });
      kaartRef.current = kaart;
      // Kaartpositie in de URL bijhouden zodat terug-navigatie hem herstelt.
      kaart.on("moveend", () => schrijfHashPositie(kaart));
      // Zoomknoppen verticaal gecentreerd op de linkerrand (via CSS in
      // StartScherm.module.css), zodat ze niet achter de vaste onderbalk vallen.
      L.control.zoom({ position: "topleft" }).addTo(kaart);
      L.tileLayer(PDOK_TILES, {
        attribution: ATTRIBUTIE,
        maxZoom: 19,
        minZoom: 11,
      }).addTo(kaart);

      // Live-locatie: markeer de positie met een blauwe stip + nauwkeurigheids-
      // cirkel en volg mee (watch). De aanvraag komt van de intro of de
      // onderbalkknop via startLiveLocatie().
      kaart.on("locationfound", (e) => {
        const straal = e.accuracy ?? 20;
        if (locatieCirkel.current && locatieMarker.current) {
          locatieCirkel.current.setLatLng(e.latlng).setRadius(straal);
          locatieMarker.current.setLatLng(e.latlng);
        } else {
          locatieCirkel.current = L.circle(e.latlng, {
            radius: straal,
            color: LOCATIE_KLEUR,
            weight: 1,
            fillColor: LOCATIE_KLEUR,
            fillOpacity: 0.15,
            interactive: false,
          }).addTo(kaart);
          locatieMarker.current = L.circleMarker(e.latlng, {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: LOCATIE_KLEUR,
            fillOpacity: 1,
            interactive: false,
          }).addTo(kaart);
        }
      });
      // Als er om locatie gevraagd is vóór de kaart klaar was: nu alsnog starten.
      if (wilLocatie.current) {
        wilLocatie.current = false;
        kaart.locate(LOCATIE_OPTIES);
      }

      const antwoord = await fetch("/data/straten.geojson");
      if (!antwoord.ok || gestopt) return;
      const geojson = await antwoord.json();

      // Deze sessie al bekeken straten krijgen een donkerder tint ("bezochte
      // links"). Eén keer uitlezen bij het opbouwen van de laag.
      const bezocht = bezochteSlugs();

      stratenLaag.current = L.geoJSON(geojson, {
        style: (feature) => ({
          color:
            feature &&
            bezocht.has((feature.properties as { slug: string }).slug)
              ? STRAAT_KLEUR_BEZOCHT
              : STRAAT_KLEUR,
          weight: 5,
          opacity: 0.75,
        }),
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

      if (!gestopt) {
        setGereed(true);
        onGereedRef.current?.();
      }
    })();

    return () => {
      gestopt = true;
      kaartRef.current?.stopLocate();
      kaartRef.current?.remove();
      kaartRef.current = null;
      locatieMarker.current = null;
      locatieCirkel.current = null;
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
