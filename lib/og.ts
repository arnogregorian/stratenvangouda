import type { Metadata } from "next";
import { OG_STANDAARD } from "./straten";

/**
 * Open Graph/Twitter-metadata met de vaste Die Goude-deelafbeelding en een
 * correcte, paginagebonden og:url. Voor pagina's zonder eigen deelafbeelding
 * (colofon, hulp, fotopagina's): zonder een eigen openGraph-blok zouden ze de
 * og:url "/" van de root-layout erven en bij delen naar de startpagina wijzen
 * in plaats van naar de pagina zelf.
 */
export function deelMetadata(opts: {
  url: string;
  title: string;
  description: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.url,
      type: "website",
      locale: "nl_NL",
      siteName: "Straten van Gouda",
      images: [{ url: OG_STANDAARD, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [OG_STANDAARD] },
  };
}
