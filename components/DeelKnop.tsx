"use client";

import { useState } from "react";
import stijl from "./DeelKnop.module.css";

/**
 * Deelknop: Web Share API op mobiel, met fallback naar kopieer-link en
 * mailto op desktop (RFP §6.6). Geen social-plugins van derden.
 */
export default function DeelKnop({ titel }: { titel: string }) {
  const [melding, setMelding] = useState<string | null>(null);

  const deel = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: titel, url });
        return;
      } catch {
        // gebruiker annuleerde delen; geen actie nodig
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMelding("Link gekopieerd naar het klembord");
    } catch {
      window.location.href = `mailto:?subject=${encodeURIComponent(
        titel
      )}&body=${encodeURIComponent(url)}`;
    }
    setTimeout(() => setMelding(null), 3000);
  };

  return (
    <span className={stijl.wrapper}>
      <button type="button" className={stijl.knop} onClick={deel}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.7 6.8-3.9M8.6 13.3l6.8 3.9" />
        </svg>
        Delen
      </button>
      <span role="status" aria-live="polite" className={stijl.melding}>
        {melding}
      </span>
    </span>
  );
}
