"use client";

import { useEffect, useRef, useState } from "react";
import { laadFotos, type Foto } from "@/lib/fotos";
import stijl from "./FotoStrip.module.css";

const BATCH = 24;

/**
 * Oneindig scrollende lijst met lazy geladen thumbnails (RFP §4.3, §5.1).
 * De eerste foto's staan in de HTML (SEO, snelle first paint); de rest wordt
 * pas uit /data/fotos/{slug}.json geladen zodra de bezoeker scrolt — de Markt
 * heeft 1400+ afbeeldingen. Klik opent de fotopagina met de IIIF-viewer.
 */
export default function FotoStrip({
  eerste,
  totaal,
  slug,
}: {
  eerste: Foto[];
  totaal: number;
  slug: string;
}) {
  const [alle, setAlle] = useState<Foto[] | null>(null);
  const [aantalZichtbaar, setAantalZichtbaar] = useState(eerste.length);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fotos = alle ?? eerste;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || aantalZichtbaar >= totaal) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (!alle) {
          laadFotos(slug)
            .then((geladen) => {
              setAlle(geladen);
              setAantalZichtbaar((n) => Math.min(n + BATCH, geladen.length));
            })
            .catch(() => setAantalZichtbaar(eerste.length));
        } else {
          setAantalZichtbaar((n) => Math.min(n + BATCH, alle.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [aantalZichtbaar, totaal, alle, slug, eerste.length]);

  if (!totaal) return null;

  return (
    <section aria-label={`Beeldmateriaal, ${totaal} afbeeldingen`}>
      <h2 className={stijl.kop}>
        Beeldmateriaal <span className={stijl.aantal}>({totaal})</span>
      </h2>
      <ul className={stijl.rooster}>
        {fotos.slice(0, aantalZichtbaar).map((foto) => (
          <li key={foto.id}>
            <a
              href={`/straat/${slug}/fotos/?foto=${foto.id}`}
              className={stijl.tegel}
            >
              {foto.thumbnail ? (
                // Thumbnails komen rechtstreeks van de Gouda Tijdmachine (bronserver)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto.thumbnail}
                  alt={foto.titel ?? "Historische afbeelding"}
                  loading="lazy"
                  width={200}
                  height={200}
                />
              ) : (
                <span className={stijl.leeg} aria-hidden="true" />
              )}
              {foto.datering && (
                <span className={stijl.jaartal}>{foto.datering}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden="true" />
    </section>
  );
}
