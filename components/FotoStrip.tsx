"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { laadFotos, type Foto } from "@/lib/fotos";
import { jaarVan, deringSorteerwaarde } from "@/lib/datum";
import stijl from "./FotoStrip.module.css";

const BATCH = 24;

type Sortering = "archief" | "oud" | "nieuw";

/**
 * Oneindig scrollende lijst met lazy geladen thumbnails (RFP §4.3, §5.1).
 * De eerste foto's staan in de HTML (SEO, snelle first paint); de rest wordt
 * pas uit /data/fotos/{slug}.json geladen zodra de bezoeker scrolt — de Markt
 * heeft 1400+ afbeeldingen. Klik opent de fotopagina met de IIIF-viewer.
 *
 * Op de tegel staat alleen het jaartal (compact); de volledige datum staat in
 * de viewer. Sorteren op datum laadt eenmalig alle metadata.
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
  const [sortering, setSortering] = useState<Sortering>("archief");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const basis = alle ?? eerste;

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

  // Sorteren vereist álle metadata; laad die eenmalig zodra er gesorteerd wordt.
  const kiesSortering = (nieuw: Sortering) => {
    setSortering(nieuw);
    if (nieuw !== "archief" && !alle && totaal > eerste.length) {
      laadFotos(slug)
        .then((geladen) => {
          setAlle(geladen);
          setAantalZichtbaar((n) => Math.min(Math.max(n, BATCH), geladen.length));
        })
        .catch(() => {
          /* laden mislukt: sortering blijft beperkt tot de eerste batch */
        });
    }
  };

  const gesorteerd = useMemo(() => {
    if (sortering === "archief") return basis;
    const kopie = [...basis];
    kopie.sort((a, b) => {
      const va = deringSorteerwaarde(a.datering);
      const vb = deringSorteerwaarde(b.datering);
      return sortering === "oud" ? va - vb : vb - va;
    });
    return kopie;
  }, [basis, sortering]);

  if (!totaal) return null;

  return (
    <section aria-label={`Beeldmateriaal, ${totaal} afbeeldingen`}>
      <div className={stijl.balk}>
        <h2 className={stijl.kop}>
          Beeldmateriaal <span className={stijl.aantal}>({totaal})</span>
        </h2>
        {totaal > 1 && (
          <label className={stijl.sorteer}>
            <span className="alleen-screenreader">Afbeeldingen sorteren</span>
            <select
              value={sortering}
              onChange={(e) => kiesSortering(e.target.value as Sortering)}
            >
              <option value="archief">Volgorde archief</option>
              <option value="oud">Oudste eerst</option>
              <option value="nieuw">Nieuwste eerst</option>
            </select>
          </label>
        )}
      </div>
      <ul className={stijl.rooster}>
        {gesorteerd.slice(0, aantalZichtbaar).map((foto) => (
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
                <span className={stijl.jaartal}>{jaarVan(foto.datering)}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} aria-hidden="true" />
    </section>
  );
}
