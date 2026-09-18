"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

// Zelfde PDOK BRT-achtergrondkaart als de hoofdkaart (components/Kaart.tsx).
const PDOK_TILES =
  "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";
const ATTRIBUTIE = 'Kaart: <a href="https://www.pdok.nl">Kadaster / PDOK</a>';
const GOUDA_CENTRUM: [number, number] = [52.0115, 4.7105];

type Props = {
  geometry: GeoJSON.Geometry | null;
  naam: string;
};

/**
 * Kleine, niet-navigerende kaart op de detailpagina die de betreffende straat
 * gemarkeerd toont, ingezoomd op haar eigen omtrek. Leaflet gebruikt `window`
 * en wordt dus pas in een effect geladen (net als components/Kaart.tsx).
 */
export default function StraatKaart({ geometry, naam }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kaartRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!geometry) return;
    let gestopt = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (gestopt || !containerRef.current || kaartRef.current) return;

      const kaart = L.map(containerRef.current, {
        zoomControl: false,
        // Geen per-ongeluk inzoomen tijdens het scrollen van de pagina.
        scrollWheelZoom: false,
        minZoom: 11,
        maxZoom: 19,
      });
      kaartRef.current = kaart;
      L.control.zoom({ position: "topright" }).addTo(kaart);
      L.tileLayer(PDOK_TILES, {
        attribution: ATTRIBUTIE,
        maxZoom: 19,
        minZoom: 11,
      }).addTo(kaart);

      const laag = L.geoJSON(geometry, {
        style: { color: "#d32016", weight: 6, opacity: 1 },
      }).addTo(kaart);
      laag.bindTooltip(naam, { direction: "top", sticky: true });

      const grens = laag.getBounds();
      if (grens.isValid()) {
        kaart.fitBounds(grens, { padding: [28, 28], maxZoom: 17 });
      } else {
        kaart.setView(GOUDA_CENTRUM, 15);
      }
    })();

    return () => {
      gestopt = true;
      kaartRef.current?.remove();
      kaartRef.current = null;
    };
  }, [geometry, naam]);

  if (!geometry) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Kaart met ${naam} gemarkeerd`}
      style={{
        height: "240px",
        width: "100%",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "#eae6df",
      }}
    />
  );
}
