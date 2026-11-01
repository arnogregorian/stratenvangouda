import type { Metadata } from "next";
import { alleStraten, OG_STANDAARD } from "@/lib/straten";
import StratenLijst from "@/components/StratenLijst";

export const metadata: Metadata = {
  title: "Alle straten",
  description:
    "Alfabetische lijst van alle Goudse straten, met een directe link naar de herkomst en geschiedenis van elke straatnaam.",
  alternates: { canonical: "/straten/" },
  // Volledig openGraph-blok (incl. eigen url en de vaste deelafbeelding), zodat
  // og:url naar deze pagina wijst en niet naar de startpagina.
  openGraph: {
    title: "Alle straten — Straten van Gouda",
    description:
      "Alfabetische lijst van alle Goudse straten met een directe link naar elke straatpagina.",
    url: "/straten/",
    type: "website",
    locale: "nl_NL",
    siteName: "Straten van Gouda",
    images: [{ url: OG_STANDAARD, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [OG_STANDAARD] },
};

export default function StratenPagina() {
  // Alleen de huidige straten (de verdwenen straten blijven aan de kaart-toggle
  // en het zoeken voorbehouden). Lichte vorm zonder geometrie naar de client.
  const lijst = alleStraten().map((s) => ({
    naam: s.naam,
    slug: s.slug,
    alt: s.altNamen.join(" "),
  }));

  return (
    <main id="inhoud" className="pagina">
      <h1>Alle straten</h1>
      <p>
        Alle {lijst.length} straten van Gouda op alfabetische volgorde. Tik op
        een straat voor de herkomst en geschiedenis van de naam, of zoek
        hieronder.
      </p>
      <StratenLijst lijst={lijst} />
    </main>
  );
}
