import type { MetadataRoute } from "next";
import { alleStraten, gesyncedOp, SITE_URL } from "@/lib/straten";

export const dynamic = "force-static";

/** Sitemap.xml gegenereerd op basis van de REST API-data (RFP §5.5). */
export default function sitemap(): MetadataRoute.Sitemap {
  const laatsteSync = gesyncedOp();
  const lastModified = laatsteSync ? new Date(laatsteSync) : undefined;

  return [
    { url: `${SITE_URL}/`, lastModified, priority: 1 },
    { url: `${SITE_URL}/straten/`, lastModified, priority: 0.6 },
    { url: `${SITE_URL}/colofon/`, lastModified, priority: 0.3 },
    { url: `${SITE_URL}/hulp/`, lastModified, priority: 0.3 },
    ...alleStraten().map((straat) => ({
      url: `${SITE_URL}/straat/${straat.slug}/`,
      lastModified,
      priority: 0.8,
    })),
  ];
}
