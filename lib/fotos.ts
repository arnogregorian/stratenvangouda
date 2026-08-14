"use client";

/** Fotometadata zoals geëxporteerd naar public/data/fotos/{slug}.json. */
export type Foto = {
  id: string;
  titel: string | null;
  thumbnail: string | null;
  image: string | null;
  iiif: string | null;
  vervaardiger: string | null;
  datering: string | null;
  rechten: string | null;
  bron: string | null;
};

const cache = new Map<string, Promise<Foto[]>>();

export function laadFotos(slug: string): Promise<Foto[]> {
  let lopend = cache.get(slug);
  if (!lopend) {
    lopend = fetch(`/data/fotos/${slug}.json`).then((r) => {
      if (!r.ok) throw new Error("Fotolijst kon niet geladen worden");
      return r.json();
    });
    cache.set(slug, lopend);
  }
  return lopend;
}
