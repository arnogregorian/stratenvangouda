import type { Metadata } from "next";
import { renderContent } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Colofon",
  description:
    "Over StratenVanGouda.nl: een initiatief van Historische Vereniging Die Goude en het Streekarchief Midden-Holland, mede mogelijk gemaakt door de gemeente Gouda.",
  alternates: { canonical: "/colofon/" },
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
