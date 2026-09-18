#!/usr/bin/env node
/**
 * Synchroniseert de straatnamen-data van de Gouda Tijdmachine naar een lokale
 * SQLite-cache (data/cache.db) en genereert de statische databestanden voor de
 * frontend (public/data/). Dagelijks draaien vóór `npm run build`.
 *
 * Bron: https://api-straatnamen.goudatijdmachine.nl (v1.5.0, read-only, geen auth)
 *
 * De API stuurt sinds v1.5.0 cache-validators (ETag/Last-Modified) die de hele
 * collectie inclusief gekoppelde afbeeldingen dekken. De validators van de
 * vorige sync staan in cache.db (meta-tabel); antwoordt de bron met 304 Not
 * Modified, dan is de cache nog actueel en vervallen de ~1300 detail- en
 * beeldcalls. Met `--alleen-bij-wijziging` eindigt zo'n ongewijzigde run met
 * exitcode 3, zodat een cron-keten (`sync --alleen-bij-wijziging && build &&
 * rsync`) de herbouw dan overslaat.
 *
 * Let op: dit script beëindigt via process.exitCode en een natuurlijke
 * afsluiting, nooit via process.exit() — dat crasht op Windows met een
 * libuv-assert zolang er nog netwerk-handles openstaan.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, renameSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.STRAATNAMEN_API ?? "https://api-straatnamen.goudatijdmachine.nl";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "cache.db");
const CONCURRENCY = 6;

/** Exitcode 3 bij ongewijzigde bron, zodat een cron-keten de build kan overslaan. */
const alleenBijWijziging = process.argv.includes("--alleen-bij-wijziging");

/** Sentinel voor een 304 Not Modified-antwoord van de bron. */
const ONGEWIJZIGD = Symbol("bron ongewijzigd");

// Meer dan één poging omdat de bron soms kort instabiel is (connect-timeouts /
// ECONNRESET), met name vlak na een API-deploy. Eén hapering mag de hele sync
// van ~1300 straten niet laten mislukken.
const API_POGINGEN = 5;

async function apiGet(path, accept = "application/json", { conditioneel = null, metHeaders = false } = {}) {
  for (let poging = 1; poging <= API_POGINGEN; poging++) {
    try {
      const headers = { Accept: accept, "User-Agent": "StratenVanGouda-sync (Webroots, arno@webroots.nl)" };
      // Beide validators meesturen; If-None-Match gaat voor (RFC 9110).
      if (conditioneel?.etag) headers["If-None-Match"] = conditioneel.etag;
      if (conditioneel?.lastModified) headers["If-Modified-Since"] = conditioneel.lastModified;
      const res = await fetch(`${API}${path}`, {
        headers,
        signal: AbortSignal.timeout(30000),
      });
      if (res.status === 304) return ONGEWIJZIGD;
      // 404: straat zonder afbeeldingen. 400: identifier zonder ARK (sommige
      // straten hebben een Omeka-resource-URI die de API niet accepteert).
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} voor ${path}`);
      const data = await res.json();
      return metHeaders
        ? { data, etag: res.headers.get("etag"), lastModified: res.headers.get("last-modified") }
        : data;
    } catch (err) {
      if (poging === API_POGINGEN) throw err;
      // Exponentiële backoff: 1s, 2s, 4s, 8s tussen de pogingen.
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (poging - 1)));
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

/** Cache-validators van de bron bij de vorige sync (null als die ontbreken). */
function leesVorigeValidators(pad) {
  if (!existsSync(pad)) return null;
  try {
    const oud = new DatabaseSync(pad, { readOnly: true });
    // Schemacontrole: mist de bestaande cache.db een sinds de vorige sync
    // toegevoegde kolom (nu `sinds`), dan negeren we de validators. Zo houdt een
    // 304 ("bron ongewijzigd") geen verouderd schema in stand, maar volgt er een
    // volledige herbouw die de nieuwe kolom vult. Dit forceert óók de eenmalige
    // cache-verversing voor v1.8: de duiding verhuisde naar `genoemd_naar` en
    // `sinds` is nieuw, terwijl de Last-Modified van de bron ongewijzigd bleef.
    // Belangrijk in CI, waar cache.db van de vorige run teruggehaald wordt.
    const kolommen = oud.prepare("PRAGMA table_info(straten)").all();
    if (!kolommen.some((k) => k.name === "sinds")) {
      oud.close();
      return null;
    }
    const rijen = oud
      .prepare("SELECT sleutel, waarde FROM meta WHERE sleutel IN ('bron_etag', 'bron_last_modified')")
      .all();
    oud.close();
    const meta = Object.fromEntries(rijen.map((r) => [r.sleutel, r.waarde]));
    if (!meta.bron_etag && !meta.bron_last_modified) return null;
    return { etag: meta.bron_etag ?? null, lastModified: meta.bron_last_modified ?? null };
  } catch {
    return null;
  }
}

/** Aantal afbeeldingen in de bestaande cache (0 als er nog geen is of hij onleesbaar is). */
function leesVorigAantalAfbeeldingen(pad) {
  if (!existsSync(pad)) return 0;
  try {
    const oud = new DatabaseSync(pad, { readOnly: true });
    const rij = oud.prepare("SELECT COUNT(*) AS n FROM afbeeldingen").get();
    oud.close();
    return Number(rij?.n ?? 0);
  } catch {
    return 0;
  }
}

console.log(`Sync gestart vanaf ${API}`);

// 1. Alle straten inclusief geometrie via de GeoJSON-variant (één call). De
// validators van de vorige sync gaan conditioneel mee: Last-Modified/ETag
// dekken de hele collectie inclusief gekoppelde afbeeldingen, dus een 304
// betekent dat cache.db nog actueel is en de rest kan vervallen.
const validators = leesVorigeValidators(DB_PATH);
const respons = await apiGet("/straatnamen?limit=2000", "application/geo+json", {
  conditioneel: validators,
  metHeaders: true,
});
if (respons === ONGEWIJZIGD) {
  console.log(
    `Bron ongewijzigd sinds ${validators.lastModified ?? "de vorige sync"}; cache.db is actueel.`
  );
  // Verse checkout met bestaande cache.db: exportbestanden alsnog genereren.
  if (!existsSync(join(ROOT, "public", "data", "index.json"))) await import("./exporteer.mjs");
  process.exitCode = alleenBijWijziging ? 3 : 0;
} else {
  await volledigeSync(respons);
}

async function volledigeSync(respons) {
  const collectie = respons?.data;
  if (!collectie?.features?.length) {
    console.error("Geen straten ontvangen; sync afgebroken.");
    process.exitCode = 1;
    return;
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
      // Jaartal "straat bestaat sinds" (API-veld sinds v1.8); lang niet elke
      // straat heeft er een. De vroegere `problematisch`-duiding is deprecated
      // en wordt door de API nu aan `genoemd_naar` geplakt (na een newline).
      sinds: detail?.sinds ?? null,
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

  // 3c. Veiligheidscontrole vóór de atomische wissel. Een volledige sync hoort
  // duizenden afbeeldingen te bevatten (18 jul 2026: 9.845). Levert de bron er nul
  // op — of drastisch minder dan de vorige keer — dan is er bovenstrooms iets stuk
  // (bijv. /afbeeldingen dat 404 geeft voor álle straten). We overschrijven cache.db
  // dan NIET met een fotoloze dataset: afbreken met exitcode 1 laat de bestaande
  // cache intact en de (Vercel-)build zichtbaar falen, i.p.v. stilzwijgend een site
  // zonder beeldmateriaal op te leveren. Forceren kan met SYNC_STA_GEEN_AFBEELDINGEN=1
  // (voor het zeldzame geval dat de bron bewust geen afbeeldingen meer heeft).
  const totaalAfbeeldingen = straten.reduce((n, s) => n + s.afbeeldingen.length, 0);
  const vorigeAfbeeldingen = leesVorigAantalAfbeeldingen(DB_PATH);
  const minRatio = Number(process.env.SYNC_MIN_AFBEELDINGEN_RATIO ?? 0.5);
  const forceerLeeg = process.env.SYNC_STA_GEEN_AFBEELDINGEN === "1";
  if (!forceerLeeg && totaalAfbeeldingen === 0) {
    console.error(
      `Sync afgebroken: 0 afbeeldingen opgehaald voor ${straten.length} straten. ` +
        `Waarschijnlijk is de bron (/afbeeldingen) tijdelijk stuk. ` +
        `cache.db is NIET overschreven. Forceren met SYNC_STA_GEEN_AFBEELDINGEN=1.`
    );
    process.exitCode = 1;
    return;
  }
  if (
    !forceerLeeg &&
    vorigeAfbeeldingen > 0 &&
    totaalAfbeeldingen < vorigeAfbeeldingen * minRatio
  ) {
    console.error(
      `Sync afgebroken: slechts ${totaalAfbeeldingen} afbeeldingen opgehaald, fors ` +
        `minder dan de vorige ${vorigeAfbeeldingen} (< ${Math.round(minRatio * 100)}%). ` +
        `Mogelijk bronprobleem. cache.db is NIET overschreven. ` +
        `Forceren met SYNC_STA_GEEN_AFBEELDINGEN=1 of drempel bijstellen via ` +
        `SYNC_MIN_AFBEELDINGEN_RATIO.`
    );
    process.exitCode = 1;
    return;
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
      sinds TEXT,
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
    "INSERT INTO straten VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const voegAfbeeldingToe = db.prepare(
    "INSERT INTO afbeeldingen VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  db.exec("BEGIN");
  for (const s of straten) {
    voegStraatToe.run(
      s.identifier, s.slug, s.naam, s.type, JSON.stringify(s.altNamen),
      s.genoemdNaar, s.ligging, s.vermeldingen, s.sinds,
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
  // Validators bewaren voor de conditionele check bij de volgende sync.
  if (respons.etag) db.prepare("INSERT INTO meta VALUES ('bron_etag', ?)").run(respons.etag);
  if (respons.lastModified)
    db.prepare("INSERT INTO meta VALUES ('bron_last_modified', ?)").run(respons.lastModified);
  db.exec("COMMIT");
  db.close();
  renameSync(tmpPad, DB_PATH);

  // 5. Statische databestanden voor de frontend genereren uit de cache
  await import("./exporteer.mjs");

  const huidig = straten.filter((s) => s.type !== "verdwenen");
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
}
