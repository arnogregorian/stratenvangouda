import type { Metadata } from "next";
import { renderContent } from "@/lib/markdown";
import { deelMetadata } from "@/lib/og";

const beschrijving =
  "Uitleg over het gebruik van StratenVanGouda.nl: zoeken, de kaart, straten in uw buurt en het bekijken van historisch beeldmateriaal.";

export const metadata: Metadata = {
  title: "Hulp",
  description: beschrijving,
  alternates: { canonical: "/hulp/" },
  ...deelMetadata({
    url: "/hulp/",
    title: "Hulp — Straten van Gouda",
    description: beschrijving,
  }),
};

export default function HulpPagina() {
  return (
    <main
      id="inhoud"
      className="pagina"
      dangerouslySetInnerHTML={{ __html: renderContent("hulp.md") }}
    />
  );
}
