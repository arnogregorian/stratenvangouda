#!/usr/bin/env node
/**
 * Genereert de statische databestanden voor de frontend uit data/cache.db:
 *   public/data/straten.geojson   – kaartlijnen (alleen huidige straten)
 *   public/data/index.json        – compacte zoek/GPS-index
 *   public/data/fotos/{slug}.json – fotometadata per straat (lazy geladen;
 *                                   de Markt heeft er 1400+, die horen niet
 *                                   in de HTML van de pagina)
 * Wordt aangeroepen aan het einde van scripts/sync.mjs en kan ook los draaien.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DATA = join(ROOT, "public", "data");

function centroid(geometry) {
  if (!geometry?.coordinates) return null;
  const punten = [];
  const verzamel = (c) => {
    if (typeof c[0] === "number") punten.push(c);
    else c.forEach(verzamel);
  };
  verzamel(geometry.coordinates);
  if (!punten.length) return null;
  const som = punten.reduce(([x, y], [lon, lat]) => [x + lon, y + lat], [0, 0]);
  return [
    Math.round((som[0] / punten.length) * 1e6) / 1e6,
    Math.round((som[1] / punten.length) * 1e6) / 1e6,
  ];
}

const db = new DatabaseSync(join(ROOT, "data", "cache.db"), { readOnly: true });
const huidig = db
  .prepare("SELECT * FROM straten WHERE type != 'verdwenen' ORDER BY naam")
  .all()
  .map((rij) => ({
    ...rij,
    altNamen: JSON.parse(rij.alt_namen ?? "[]"),
    geometry: rij.geometry ? JSON.parse(rij.geometry) : null,
  }));

mkdirSync(PUBLIC_DATA, { recursive: true });

writeFileSync(
  join(PUBLIC_DATA, "straten.geojson"),
  JSON.stringify({
    type: "FeatureCollection",
    features: huidig
      .filter((s) => s.geometry)
      .map((s) => ({
        type: "Feature",
        properties: { naam: s.naam, slug: s.slug },
        geometry: s.geometry,
      })),
  })
);

// Verdwenen straten als aparte laag (met slug → aanklikbaar naar de detailpagina).
const verdwenen = db
  .prepare("SELECT * FROM straten WHERE type = 'verdwenen' ORDER BY naam")
  .all()
  .map((rij) => ({
    ...rij,
    geometry: rij.geometry ? JSON.parse(rij.geometry) : null,
  }));

writeFileSync(
  join(PUBLIC_DATA, "verdwenen.geojson"),
  JSON.stringify({
    type: "FeatureCollection",
    features: verdwenen
      .filter((s) => s.geometry)
      .map((s) => ({
        type: "Feature",
        properties: { naam: s.naam, slug: s.slug },
        geometry: s.geometry,
      })),
  })
);

writeFileSync(
  join(PUBLIC_DATA, "index.json"),
  JSON.stringify(
    huidig.map((s) => ({
      n: s.naam,
      a: s.altNamen.join(", ") || undefined,
      s: s.slug,
      c: centroid(s.geometry) ?? undefined,
    }))
  )
);

const fotosMap = join(PUBLIC_DATA, "fotos");
if (existsSync(fotosMap)) rmSync(fotosMap, { recursive: true });
mkdirSync(fotosMap);
const haalFotos = db.prepare(
  "SELECT * FROM afbeeldingen WHERE straat_identifier = ? ORDER BY volgorde"
);
// Fotobestanden voor álle straten (ook verdwenen; die hebben nu detailpagina's).
const alleStr = [...huidig, ...verdwenen];
const fotosSlugs = [];
for (const straat of alleStr) {
  const fotos = haalFotos.all(straat.identifier).map((a, i) => ({
    id: a.identifier?.split("/").pop() || String(i),
    titel: a.titel,
    thumbnail: a.thumbnail,
    image: a.image,
    iiif: a.iiif_info_json,
    vervaardiger: a.vervaardiger,
    datering: a.datering,
    rechten: a.auteursrechten,
    bron: a.bronorganisatie,
  }));
  if (!fotos.length) continue;
  writeFileSync(join(fotosMap, `${straat.slug}.json`), JSON.stringify(fotos));
  fotosSlugs.push(straat.slug);
}

// Offline-manifest voor de PWA-download: pagina's + databestanden (eigen origin)
// en miniatuur-URL's (extern). Wordt alleen opgehaald als de bezoeker in de
// geïnstalleerde app kiest om alles offline op te slaan.
const thumbnails = db
  .prepare(
    "SELECT DISTINCT thumbnail FROM afbeeldingen WHERE thumbnail IS NOT NULL AND thumbnail != ''"
  )
  .all()
  .map((r) => r.thumbnail);
const lokaal = [
  "/",
  "/hulp/",
  "/colofon/",
  "/data/index.json",
  "/data/straten.geojson",
  "/data/verdwenen.geojson",
  ...alleStr.map((s) => `/straat/${s.slug}/`),
  ...fotosSlugs.map((slug) => `/data/fotos/${slug}.json`),
];
writeFileSync(
  join(PUBLIC_DATA, "offline-manifest.json"),
  JSON.stringify({ local: lokaal, thumbnails })
);

console.log(
  `Export klaar: ${huidig.length} huidige + ${verdwenen.length} verdwenen straten, ` +
    `fotobestanden voor ${fotosSlugs.length} straten, ${thumbnails.length} miniaturen → public/data/`
);
