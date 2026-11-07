import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  afbeeldingenVoorStraat,
  alleSlugs,
  fotoId,
  straatViaSlug,
  SITE_URL,
  OG_STANDAARD,
  type Afbeelding,
} from "@/lib/straten";
import AltNamen from "@/components/AltNamen";
import DeelKnop from "@/components/DeelKnop";
import FotoStrip from "@/components/FotoStrip";
import LeesMeer from "@/components/LeesMeer";
import MarkeerBezocht from "@/components/MarkeerBezocht";
import StraatKaart from "@/components/StraatKaart";
import { deringSorteerwaarde } from "@/lib/datum";
import stijl from "./straat.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return alleSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

function samenvatting(tekst: string | null): string {
  const basis =
    tekst ??
    "Ontdek de herkomst en geschiedenis van deze Goudse straatnaam op Straten van Gouda.";
  return basis.length > 155 ? `${basis.slice(0, 152).trimEnd()}…` : basis;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const straat = straatViaSlug(slug);
  if (!straat) return {};
  // Deelafbeelding (OpenGraph, bijv. LinkedIn): de meest recente foto van deze
  // straat — herkenbaarder dan een generieke afbeelding. Heeft de straat geen
  // foto (bijv. de Columbuslaan), dan de vaste Die Goude-afbeelding tonen i.p.v.
  // een lege preview bij delen via WhatsApp/Facebook.
  const recentste = afbeeldingenVoorStraat(straat.identifier).reduce<Afbeelding | null>(
    (beste, f) =>
      !beste ||
      deringSorteerwaarde(f.datering) > deringSorteerwaarde(beste.datering)
        ? f
        : beste,
    null
  );
  const ogAfbeelding = recentste?.image ?? recentste?.thumbnail ?? OG_STANDAARD;
  return {
    title: straat.naam,
    description: samenvatting(straat.genoemdNaar),
    alternates: { canonical: `/straat/${slug}/` },
    openGraph: {
      title: `${straat.naam} — Straten van Gouda`,
      description: samenvatting(straat.genoemdNaar),
      url: `/straat/${slug}/`,
      type: "article",
      locale: "nl_NL",
      images: [ogAfbeelding],
    },
    twitter: { card: "summary_large_image", images: [ogAfbeelding] },
  };
}

/** Centroïde voor Schema.org geo-metadata. */
function centroid(geometry: GeoJSON.Geometry | null): [number, number] | null {
  if (!geometry || !("coordinates" in geometry)) return null;
  const punten: number[][] = [];
  const verzamel = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") punten.push(c as number[]);
    else if (Array.isArray(c)) c.forEach(verzamel);
  };
  verzamel(geometry.coordinates);
  if (!punten.length) return null;
  const som = punten.reduce(([x, y], [lon, lat]) => [x + lon, y + lat], [0, 0]);
  return [som[0] / punten.length, som[1] / punten.length];
}

export default async function StraatPagina({ params }: Props) {
  const { slug } = await params;
  const straat = straatViaSlug(slug);
  if (!straat) notFound();

  const alleFotos = afbeeldingenVoorStraat(straat.identifier);
  // Alleen de eerste batch in de HTML; de rest wordt lazy geladen (FotoStrip)
  const eersteFotos = alleFotos.slice(0, 12).map((foto, i) => ({
    id: fotoId(foto, i),
    titel: foto.titel,
    thumbnail: foto.thumbnail,
    image: foto.image,
    iiif: foto.iiifInfoJson,
    vervaardiger: foto.vervaardiger,
    datering: foto.datering,
    rechten: foto.auteursrechten,
    bron: foto.bronorganisatie,
    beeldbank: foto.bronUrl,
    inventarisnummer: foto.inventarisnummer,
  }));
  const punt = centroid(straat.geometry);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: straat.naam,
    alternateName: straat.altNamen.length ? straat.altNamen : undefined,
    description: samenvatting(straat.genoemdNaar),
    url: `${SITE_URL}/straat/${slug}/`,
    geo: punt
      ? { "@type": "GeoCoordinates", latitude: punt[1], longitude: punt[0] }
      : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gouda",
      addressCountry: "NL",
    },
  };

  return (
    <main id="inhoud" className="pagina">
      <MarkeerBezocht slug={slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <header className={stijl.kop}>
          <div className={stijl.titelRij}>
            <h1 className={stijl.titel}>{straat.naam}</h1>
            {straat.type === "verdwenen" && (
              <span className={stijl.verdwenenTag}>Verdwenen</span>
            )}
            {straat.sinds && (
              <span className={stijl.sinds}>Sinds {straat.sinds}</span>
            )}
          </div>
          {straat.ligging && <p className={stijl.ligging}>{straat.ligging}</p>}
          {straat.buurten.length > 0 && (
            <p className={stijl.buurt}>
              <span className={stijl.buurtLabel}>
                {straat.buurten.length > 1 ? "Buurten" : "Buurt"}
              </span>{" "}
              {straat.buurten.join(", ")}
            </p>
          )}
        </header>

        {straat.genoemdNaar ? (
          <LeesMeer tekst={straat.genoemdNaar} />
        ) : (
          <p className={stijl.geenTekst}>
            Over de herkomst van deze straatnaam is in de Gouda Tijdmachine nog
            geen beschrijving beschikbaar.
          </p>
        )}

        {/* Gevoelige duiding bij een beladen straatnaam (API v1.10.0):
            bewust als aparte rubriek na de "genoemd naar"-tekst. Slechts ~42
            straten hebben hier een waarde. */}
        {straat.problematisch && (
          <section className={stijl.problematisch}>
            <h2 className={stijl.problematischKop}>Beladen straatnaam</h2>
            <LeesMeer tekst={straat.problematisch} />
          </section>
        )}

        <div className={stijl.blok}>
          <AltNamen namen={straat.altNamen} />
        </div>

        <div className={stijl.blok}>
          <DeelKnop titel={`${straat.naam} — Straten van Gouda`} />
        </div>

        {/* Kaartje met de straat gemarkeerd: na de tekst, vóór de afbeeldingen. */}
        {straat.geometry && (
          <div className={stijl.blok}>
            <StraatKaart geometry={straat.geometry} naam={straat.naam} />
          </div>
        )}

        <div className={stijl.blok}>
          <FotoStrip eerste={eersteFotos} totaal={alleFotos.length} slug={slug} />
        </div>
      </article>
    </main>
  );
}
