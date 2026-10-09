"use client";

/** Compacte client-side zoekindex, gegenereerd door scripts/sync.mjs. */
export type IndexItem = {
  /** naam */ n: string;
  /** alternatieve namen, komma-gescheiden */ a?: string;
  /** slug */ s: string;
  /** centroïde [lon, lat] */ c?: [number, number];
  /** verdwenen straat (alleen gezet als het er een is) */ v?: 1;
};

let cache: Promise<IndexItem[]> | null = null;

export function laadIndex(): Promise<IndexItem[]> {
  cache ??= fetch("/data/index.json").then((r) => {
    if (!r.ok) throw new Error("Zoekindex kon niet geladen worden");
    return r.json();
  });
  return cache;
}

export function normaliseer(tekst: string): string {
  return tekst
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Levenshtein-afstand (edit distance) met vroege afbreking: zodra het minimum
 * van een rij de drempel `max` overschrijdt, kan het eindresultaat die drempel
 * nooit meer onderschrijden en stoppen we. Scheelt werk bij lange, duidelijk
 * afwijkende namen.
 */
export function levenshtein(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i);
  let huidige = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    huidige[0] = i;
    let rijMin = huidige[0];
    for (let j = 1; j <= b.length; j++) {
      const kost = a[i - 1] === b[j - 1] ? 0 : 1;
      huidige[j] = Math.min(
        vorige[j] + 1, // verwijderen
        huidige[j - 1] + 1, // invoegen
        vorige[j - 1] + kost // vervangen
      );
      if (huidige[j] < rijMin) rijMin = huidige[j];
    }
    if (rijMin > max) return max + 1;
    [vorige, huidige] = [huidige, vorige];
  }
  return vorige[b.length];
}

export function zoek(index: IndexItem[], term: string, max = 8): IndexItem[] {
  const t = normaliseer(term.trim());
  if (t.length < 2) return [];
  const begintMet: IndexItem[] = [];
  const bevat: IndexItem[] = [];
  for (const item of index) {
    const naam = normaliseer(item.n);
    const alt = item.a ? normaliseer(item.a) : "";
    if (naam.startsWith(t)) begintMet.push(item);
    else if (naam.includes(t) || alt.includes(t)) bevat.push(item);
    if (begintMet.length >= max) break;
  }
  const resultaten = [...begintMet, ...bevat];

  // Typtolerantie als vangnet: alleen aanvullen met benaderende treffers
  // (Levenshtein) als de exacte tiers de lijst nog niet vullen — zo verdringt
  // een typo-match nooit een echte treffer. Eén bewerking volstaat voor normale
  // termen; pas bij lange termen (≥8) staan we er twee toe.
  if (resultaten.length < max) {
    const drempel = t.length >= 8 ? 2 : 1;
    const gezien = new Set(resultaten.map((i) => i.s));
    const benaderend: { item: IndexItem; afstand: number }[] = [];
    for (const item of index) {
      if (gezien.has(item.s)) continue;
      const naam = normaliseer(item.n);
      const velden = item.a ? `${item.n}, ${item.a}` : item.n;
      const woorden = normaliseer(velden).split(/[\s,]+/).filter(Boolean);
      // (a) tegen elk los woord — vangt een verkeerd gespeld woord in de naam;
      let afstand = woorden.reduce(
        (min, w) => Math.min(min, levenshtein(t, w, drempel)),
        drempel + 1
      );
      // (b) tegen de naam-prefix van gelijke lengte — vangt een typo terwijl je
      //     nog een begin typt ("oosthqven" → "Oosthaven").
      if (afstand > drempel && naam.length >= t.length) {
        afstand = Math.min(afstand, levenshtein(t, naam.slice(0, t.length), drempel));
      }
      if (afstand <= drempel) benaderend.push({ item, afstand });
    }
    // Dichtstbij eerst, zodat een treffer op één bewerking voorgaat op twee.
    benaderend.sort((a, b) => a.afstand - b.afstand);
    for (const { item } of benaderend) {
      if (resultaten.length >= max) break;
      resultaten.push(item);
    }
  }
  return resultaten.slice(0, max);
}

/** Afstand in meters tussen twee [lon, lat]-punten (haversine). */
export function afstandMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
