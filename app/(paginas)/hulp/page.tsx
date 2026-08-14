import type { Metadata } from "next";
import { renderContent } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Hulp",
  description:
    "Uitleg over het gebruik van StratenVanGouda.nl: zoeken, de kaart, straten in uw buurt en het bekijken van historisch beeldmateriaal.",
  alternates: { canonical: "/hulp/" },
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
