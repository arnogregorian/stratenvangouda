import type { Metadata } from "next";
import { renderContent } from "@/lib/markdown";
import { deelMetadata } from "@/lib/og";

const beschrijving =
  "Over StratenVanGouda.nl: een initiatief van Historische Vereniging Die Goude en het Streekarchief Midden-Holland, mede mogelijk gemaakt door de gemeente Gouda.";

export const metadata: Metadata = {
  title: "Colofon",
  description: beschrijving,
  alternates: { canonical: "/colofon/" },
  ...deelMetadata({
    url: "/colofon/",
    title: "Colofon — Straten van Gouda",
    description: beschrijving,
  }),
};

export default function ColofonPagina() {
  return (
    <main
      id="inhoud"
      className="pagina"
      dangerouslySetInnerHTML={{ __html: renderContent("colofon.md") }}
    />
  );
}
