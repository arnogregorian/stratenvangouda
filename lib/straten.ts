import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";

export type Straat = {
  identifier: string;
  slug: string;
  naam: string;
  type: string;
  altNamen: string[];
  genoemdNaar: string | null;
  ligging: string | null;
  vermeldingen: string | null;
  geometry: GeoJSON.Geometry | null;
};

export type Afbeelding = {
  identifier: string | null;
  titel: string | null;
  thumbnail: string | null;
  image: string | null;
  iiifInfoJson: string | null;
  vervaardiger: string | null;
  datering: string | null;
  auteursrechten: string | null;
  bronUrl: string | null;
  bronorganisatie: string | null;
};

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    const pad = join(process.cwd(), "data", "cache.db");
    db = new DatabaseSync(pad, { readOnly: true });
  }
  return db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function naarStraat(rij: any): Straat {
  return {
    identifier: rij.identifier,
    slug: rij.slug,
    naam: rij.naam,
    type: rij.type,
    altNamen: JSON.parse(rij.alt_namen ?? "[]"),
    genoemdNaar: rij.genoemd_naar,
    ligging: rij.ligging,
    vermeldingen: rij.vermeldingen,
    geometry: rij.geometry ? JSON.parse(rij.geometry) : null,
  };
}

/** Alle huidige straten (verdwenen straten zijn v2, zie RFP §3.2). */
export function alleStraten(): Straat[] {
  return getDb()
    .prepare("SELECT * FROM straten WHERE type != 'verdwenen' ORDER BY naam")
    .all()
    .map(naarStraat);
}

export function straatViaSlug(slug: string): Straat | null {
  const rij = getDb()
    .prepare("SELECT * FROM straten WHERE slug = ? AND type != 'verdwenen'")
    .get(slug);
  return rij ? naarStraat(rij) : null;
}

export function afbeeldingenVoorStraat(identifier: string): Afbeelding[] {
  return getDb()
    .prepare("SELECT * FROM afbeeldingen WHERE straat_identifier = ? ORDER BY volgorde")
    .all(identifier)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((rij: any) => ({
      identifier: rij.identifier,
      titel: rij.titel,
      thumbnail: rij.thumbnail,
      image: rij.image,
      iiifInfoJson: rij.iiif_info_json,
      vervaardiger: rij.vervaardiger,
      datering: rij.datering,
      auteursrechten: rij.auteursrechten,
      bronUrl: rij.bron_url,
      bronorganisatie: rij.bronorganisatie,
    }));
}

export function gesyncedOp(): string | null {
  const rij = getDb()
    .prepare("SELECT waarde FROM meta WHERE sleutel = 'synced_at'")
    .get() as { waarde: string } | undefined;
  return rij?.waarde ?? null;
}

/** Stabiel foto-id: laatste segment van de ARK-identifier van de afbeelding. */
export function fotoId(afbeelding: Afbeelding, index: number): string {
  const ark = afbeelding.identifier?.split("/").pop();
  return ark || String(index);
}

export const SITE_URL = process.env.SITE_URL ?? "https://stratenvangouda.nl";
