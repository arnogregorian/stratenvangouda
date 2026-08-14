"use client";

/** Compacte client-side zoekindex, gegenereerd door scripts/sync.mjs. */
export type IndexItem = {
  /** naam */ n: string;
  /** alternatieve namen, komma-gescheiden */ a?: string;
  /** slug */ s: string;
  /** centroïde [lon, lat] */ c?: [number, number];
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
  return [...begintMet, ...bevat].slice(0, max);
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
