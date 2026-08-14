#!/usr/bin/env node
/**
 * Synchroniseert de straatnamen-data van de Gouda Tijdmachine naar een lokale
 * SQLite-cache (data/cache.db) en genereert de statische databestanden voor de
 * frontend (public/data/). Dagelijks draaien vóór `npm run build`.
 *
 * Bron: https://api-straatnamen.goudatijdmachine.nl (v1.3.0, read-only, geen auth)
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.STRAATNAMEN_API ?? "https://api-straatnamen.goudatijdmachine.nl";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "cache.db");
const CONCURRENCY = 6;

async function apiGet(path, accept = "application/json") {
  for (let poging = 1; poging <= 3; poging++) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: { Accept: accept, "User-Agent": "StratenVanGouda-sync (Webroots, arno@webroots.nl)" },
        signal: AbortSignal.timeout(30000),
      });
      // 404: straat zonder afbeeldingen. 400: identifier zonder ARK (sommige
      // straten hebben een Omeka-resource-URI die de API niet accepteert).
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} voor ${path}`);
      return await res.json();
    } catch (err) {
      if (poging === 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * poging));
    }
  }
}

function slugify(naam) {
  return naam
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** naam_alt komt soms als string, soms als array met één komma-gescheiden string */
function normaliseerAltNamen(...bronnen) {
  const namen = new Set();
  for (const bron of bronnen) {
    if (!bron) continue;
    const items = Array.isArray(bron) ? bron : [bron];
    for (const item of items) {
      if (typeof item !== "string") continue;
      for (const naam of item.split(",")) {
        const schoon = naam.trim();
        if (schoon) namen.add(schoon);
      }
    }
  }
  return [...namen];
}

async function werkLijstAf(items, verwerk) {
  let index = 0;
  let klaar = 0;
  const werker = async () => {
    while (index < items.length) {
      const i = index++;
      await verwerk(items[i], i);
      klaar++;
      if (klaar % 50 === 0) console.log(`  ${klaar}/${items.length} straten verwerkt`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, werker));
}

console.log(`Sync gestart vanaf ${API}`);

// 1. Alle straten inclusief geometrie via de GeoJSON-variant (één call)
const collectie = await apiGet("/straatnamen?limit=2000", "application/geo+json");
if (!collectie?.features?.length) {
  console.error("Geen straten ontvangen; sync afgebroken.");
  process.exit(1);
}
console.log(`${collectie.features.length} straten ontvangen (incl. verdwenen straten)`);

// 2. Detail + afbeeldingen per straat ophalen
const straten = [];
const zonderDetail = [];
await werkLijstAf(collectie.features, async (feature) => {
  const { identifier, naam, naam_alt, type } = feature.properties;
  const detail = await apiGet(`/straatnamen/${encodeURIComponent(identifier)}`);
  if (!detail) zonderDetail.push(`${naam} (${identifier})`);

  const afbeeldingen = [];
  let offset = 0;
  const LIMIT = 200;
  // Paginering: doorgaan zolang er een volle pagina terugkomt
  for (;;) {
    const antwoord = await apiGet(
      `/afbeeldingen/${encodeURIComponent(identifier)}?limit=${LIMIT}&offset=${offset}`
    );
    const batch = antwoord?.afbeeldingen ?? [];
    afbeeldingen.push(...batch);
    if (batch.length < LIMIT) break;
    offset += LIMIT;
  }

  straten.push({
    identifier,
    naam,
    type,
    altNamen: normaliseerAltNamen(naam_alt, detail?.alt_names),
    genoemdNaar: detail?.genoemd_naar ?? null,
    ligging: detail?.ligging ?? null,
    vermeldingen: detail?.vermeldingen ?? null,
    geometry: detail?.geometry ?? feature.geometry ?? null,
    afbeeldingen,
  });
});

// 3a. Dedupliceren: de API-lijst bevat identifiers meermaals (databevinding
// voor Gouda Tijdmachine); de eerste variant wint.
const perIdentifier = new Map();
const dubbelen = [];
for (const straat of straten) {
  if (perIdentifier.has(straat.identifier)) dubbelen.push(`${straat.naam} (${straat.identifier})`);
  else perIdentifier.set(straat.identifier, straat);
}
straten.length = 0;
straten.push(...perIdentifier.values());

// 3b. Stabiele slugs toekennen (deterministisch: sorteren op identifier bij botsing)
straten.sort((a, b) => a.identifier.localeCompare(b.identifier));
const slugTeller = new Map();
for (const straat of straten) {
  const basis = slugify(straat.naam) || "straat";
  const aantal = slugTeller.get(basis) ?? 0;
  slugTeller.set(basis, aantal + 1);
  straat.slug = aantal === 0 ? basis : `${basis}-${aantal + 1}`;
}

// 4. Wegschrijven naar SQLite (eerst naar tijdelijk bestand, dan atomisch wisselen)
mkdirSync(dirname(DB_PATH), { recursive: true });
const tmpPad = `${DB_PATH}.tmp`;
if (existsSync(tmpPad)) rmSync(tmpPad);
const db = new DatabaseSync(tmpPad);
db.exec(`
  CREATE TABLE straten (
    identifier TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    naam TEXT NOT NULL,
    type TEXT NOT NULL,
    alt_namen TEXT NOT NULL,
    genoemd_naar TEXT,
    ligging TEXT,
    vermeldingen TEXT,
    geometry TEXT
  );
  CREATE TABLE afbeeldingen (
    straat_identifier TEXT NOT NULL,
    volgorde INTEGER NOT NULL,
    identifier TEXT,
    titel TEXT,
    thumbnail TEXT,
    image TEXT,
    iiif_info_json TEXT,
    vervaardiger TEXT,
    datering TEXT,
    auteursrechten TEXT,
    bron_url TEXT,
    bronorganisatie TEXT,
    PRIMARY KEY (straat_identifier, volgorde)
  );
  CREATE TABLE meta (sleutel TEXT PRIMARY KEY, waarde TEXT);
`);
const voegStraatToe = db.prepare(
  "INSERT INTO straten VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
const voegAfbeeldingToe = db.prepare(
  "INSERT INTO afbeeldingen VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
db.exec("BEGIN");
for (const s of straten) {
  voegStraatToe.run(
    s.identifier, s.slug, s.naam, s.type, JSON.stringify(s.altNamen),
    s.genoemdNaar, s.ligging, s.vermeldingen,
    s.geometry ? JSON.stringify(s.geometry) : null
  );
  s.afbeeldingen.forEach((a, i) => {
    voegAfbeeldingToe.run(
      s.identifier, i, a.identifier ?? null, a.titel ?? null, a.thumbnail ?? null,
      a.image ?? null, a.iiif_info_json ?? null, a.vervaardiger ?? null,
      a.datering ?? null, a.informatie_auteursrechten ?? null, a.url ?? null,
      // Veldnaam bevat een typefout in de API ("bronbronorganisatie"); beide accepteren
      a.bronbronorganisatie ?? a.bronorganisatie ?? null
    );
  });
}
db.prepare("INSERT INTO meta VALUES ('synced_at', ?)").run(new Date().toISOString());
db.exec("COMMIT");
db.close();
renameSync(tmpPad, DB_PATH);

// 5. Statische databestanden voor de frontend genereren uit de cache
await import("./exporteer.mjs");

const huidig = straten.filter((s) => s.type !== "verdwenen");
const totaalAfbeeldingen = straten.reduce((n, s) => n + s.afbeeldingen.length, 0);
console.log(
  `Klaar: ${straten.length} straten (${huidig.length} huidig), ${totaalAfbeeldingen} afbeeldingen → data/cache.db + public/data/`
);
if (dubbelen.length) {
  console.log(`Let op: ${dubbelen.length} dubbele identifiers in de API-lijst; eerste 10:`);
  dubbelen.slice(0, 10).forEach((s) => console.log(`  - ${s}`));
}
if (zonderDetail.length) {
  console.log(
    `Let op: ${zonderDetail.length} straten zonder detailrespons (geen ARK-identifier of API-fout); eerste 10:`
  );
  zonderDetail.slice(0, 10).forEach((s) => console.log(`  - ${s}`));
}
