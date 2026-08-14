"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

// PDOK BRT-Achtergrondkaart (RFP §6.2): open data van het Kadaster, geen
// Google Maps. Attributie verplicht.
const PDOK_TILES =
  "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";
const ATTRIBUTIE =
  'Kaart: <a href="https://www.pdok.nl">Kadaster / PDOK</a>';
const GOUDA_CENTRUM: [number, number] = [52.0115, 4.7105];

export default function Kaart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let gestopt = false;

    (async () => {
      // Leaflet gebruikt `window` en kan dus pas in de browser geladen worden.
      const L = (await import("leaflet")).default;
      if (gestopt || !containerRef.current || kaartRef.current) return;

      const kaart = L.map(containerRef.current, {
        center: GOUDA_CENTRUM,
        zoom: 15,
        zoomControl: false,
        // Canvas-renderer met ruime kliktolerantie: soepel bij 1000+ lijnen
        // en grotere tikdoelen op touchscreens.
        renderer: L.canvas({ tolerance: 12 }),
      });
      kaartRef.current = kaart;
      L.control.zoom({ position: "bottomleft" }).addTo(kaart);
      L.tileLayer(PDOK_TILES, {
        attribution: ATTRIBUTIE,
        maxZoom: 19,
        minZoom: 11,
      }).addTo(kaart);

      const antwoord = await fetch("/data/straten.geojson");
      if (!antwoord.ok || gestopt) return;
      const geojson = await antwoord.json();

      L.geoJSON(geojson, {
        style: { color: "#d32016", weight: 5, opacity: 0.75 },
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
            (laag as L.Path).setStyle({ weight: 5, opacity: 0.75 })
          );
        },
      }).addTo(kaart);
    })();

    return () => {
      gestopt = true;
      kaartRef.current?.remove();
      kaartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Kaart van Gouda met aanklikbare straten. Gebruik het zoekveld als toegankelijk alternatief."
      style={{ position: "absolute", inset: 0, background: "#eae6df" }}
    />
  );
}
