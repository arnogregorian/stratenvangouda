/**
 * Hulp bij archiefdateringen. De Gouda Tijdmachine levert `datering` als string
 * in wisselende precisie: volledige datum ("1962-11-24"), maand ("1963-05") of
 * alleen een jaar ("1963"). Soms staat er vrije tekst ("circa 1920").
 *
 * Gedeeld door server (OG-afbeelding + detailpagina) en client (FotoStrip), dus
 * bewust géén "use client" — het zijn pure functies.
 */

const MAANDEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/**
 * Leesbare Nederlandse datum: "24 november 1962", "mei 1963" of "1963".
 * Vrije/onbekende notaties worden onveranderd teruggegeven.
 */
export function formatteerDatering(datering: string | null): string | null {
  if (!datering) return null;

  const vol = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datering);
  if (vol) {
    const maand = MAANDEN[Number(vol[2]) - 1];
    if (maand) return `${Number(vol[3])} ${maand} ${vol[1]}`;
  }

  const maandJaar = /^(\d{4})-(\d{2})$/.exec(datering);
  if (maandJaar) {
    const maand = MAANDEN[Number(maandJaar[2]) - 1];
    if (maand) return `${maand} ${maandJaar[1]}`;
  }

  return datering; // "1963", "circa 1920", perioden, enz.
}

/**
 * Alleen het jaartal ("1962-11-24" → "1962"), voor compacte labels op de
 * thumbnails. Vrije tekst zonder herkenbaar jaar wordt onveranderd teruggegeven.
 */
export function jaarVan(datering: string | null): string | null {
  if (!datering) return null;
  const m = /(\d{4})/.exec(datering);
  return m ? m[1] : datering;
}

/**
 * Sorteerwaarde: hoe hoger, hoe recenter. "1962-11-24" → 19621124,
 * "1963" → 19630000. Zonder herkenbaar jaartal → -Infinity (belandt achteraan
 * bij oplopend, vooraan bij aflopend).
 */
export function deringSorteerwaarde(datering: string | null): number {
  if (!datering) return -Infinity;
  const m = /(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(datering);
  if (!m) return -Infinity;
  const jaar = Number(m[1]);
  const maand = m[2] ? Number(m[2]) : 0;
  const dag = m[3] ? Number(m[3]) : 0;
  return jaar * 10000 + maand * 100 + dag;
}
