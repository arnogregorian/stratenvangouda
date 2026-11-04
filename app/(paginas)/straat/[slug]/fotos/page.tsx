import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  afbeeldingenVoorStraat,
  alleSlugs,
  fotoId,
  straatViaSlug,
} from "@/lib/straten";
import FotoViewer from "@/components/FotoViewer";
import { deelMetadata } from "@/lib/og";

export const dynamicParams = false;

export function generateStaticParams() {
  return alleSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const straat = straatViaSlug(slug);
  if (!straat) return {};
  const beschrijving = `Historische afbeeldingen van ${straat.naam} in Gouda, uit de collectie van het Streekarchief Midden-Holland.`;
  return {
    title: `Beeldmateriaal van ${straat.naam}`,
    description: beschrijving,
    // Fotoselectie gaat via ?foto=; alleen de basispagina indexeren
    alternates: { canonical: `/straat/${slug}/fotos/` },
    ...deelMetadata({
      url: `/straat/${slug}/fotos/`,
      title: `Beeldmateriaal van ${straat.naam} — Straten van Gouda`,
      description: beschrijving,
    }),
  };
}

export default async function FotosPagina({ params }: Props) {
  const { slug } = await params;
  const straat = straatViaSlug(slug);
  if (!straat) notFound();

  const alleFotos = afbeeldingenVoorStraat(straat.identifier);
  // Alleen de eerste foto in de HTML; de volledige lijst laadt client-side
  const eerste = alleFotos.length
    ? {
        id: fotoId(alleFotos[0], 0),
        titel: alleFotos[0].titel,
        thumbnail: alleFotos[0].thumbnail,
        image: alleFotos[0].image,
        iiif: alleFotos[0].iiifInfoJson,
        vervaardiger: alleFotos[0].vervaardiger,
        datering: alleFotos[0].datering,
        rechten: alleFotos[0].auteursrechten,
        bron: alleFotos[0].bronorganisatie,
        beeldbank: alleFotos[0].bronUrl,
        inventarisnummer: alleFotos[0].inventarisnummer,
      }
    : null;

  return (
    <main id="inhoud">
      <Suspense>
        <FotoViewer
          eerste={eerste}
          totaal={alleFotos.length}
          straatNaam={straat.naam}
          slug={slug}
        />
      </Suspense>
    </main>
  );
}
