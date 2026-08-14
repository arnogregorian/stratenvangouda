"use client";

import { useEffect } from "react";

/**
 * Privacyvriendelijke webstatistiek via de bestaande Matomo-installatie van
 * Die Goude (RFP §6.7). Staat uit totdat NEXT_PUBLIC_MATOMO_URL en
 * NEXT_PUBLIC_MATOMO_SITE_ID zijn ingesteld; technische gegevens volgen van
 * Die Goude gedurende het project. Geen cookies zonder consent-instelling.
 */
export default function Matomo() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_MATOMO_URL;
    const siteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;
    if (!url || !siteId) return;

    const w = window as typeof window & { _paq?: unknown[][] };
    w._paq = w._paq ?? [];
    w._paq.push(["disableCookies"]);
    w._paq.push(["trackPageView"]);
    w._paq.push(["enableLinkTracking"]);
    w._paq.push(["setTrackerUrl", `${url}/matomo.php`]);
    w._paq.push(["setSiteId", siteId]);

    const script = document.createElement("script");
    script.async = true;
    script.src = `${url}/matomo.js`;
    document.body.appendChild(script);
  }, []);

  return null;
}
