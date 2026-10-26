"use client";

import { useState } from "react";
import { useTaal } from "@/lib/taal";
import stijl from "./OfflineDownload.module.css";

// Alleen eigen-origin bestanden; de miniaturen blijven extern en worden online
// geladen (lichte download, zie scripts/exporteer.mjs).
type Manifest = { local: string[] };
type Status = "idle" | "bezig" | "klaar" | "fout";

/** Verwerk een lijst met een vaste gelijktijdigheid; roep na elk item terug. */
async function pool<T>(
  items: T[],
  grootte: number,
  taak: (item: T) => Promise<void>,
  opStap: () => void
) {
  let i = 0;
  const werker = async () => {
    while (i < items.length) {
      const idx = i++;
      await taak(items[idx]);
      opStap();
    }
  };
  await Promise.all(Array.from({ length: grootte }, werker));
}

export default function OfflineDownload({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTaal();
  const [status, setStatus] = useState<Status>("idle");
  const [pct, setPct] = useState(0);

  if (!open) return null;

  const start = async () => {
    setStatus("bezig");
    setPct(0);
    try {
      const manifest: Manifest = await fetch("/data/offline-manifest.json").then(
        (r) => {
          if (!r.ok) throw new Error();
          return r.json();
        }
      );
      const cache = await caches.open("offline-straten");
      const totaal = manifest.local.length;
      let gedaan = 0;
      const stap = () => {
        gedaan++;
        setPct(Math.round((gedaan / totaal) * 100));
      };

      // Eigen origin (pagina's + data): normale fetch. De miniaturen worden
      // bewust niet mee-opgeslagen — die laden extern van de beeldbank.
      await pool(
        manifest.local,
        8,
        async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          } catch {
            /* individueel bestand overslaan */
          }
        },
        stap
      );

      setStatus("klaar");
    } catch {
      setStatus("fout");
    }
  };

  return (
    <div
      className={stijl.laag}
      role="dialog"
      aria-modal="true"
      aria-label={t.offlineTitel}
    >
      <button
        type="button"
        className={stijl.scrim}
        aria-label={t.sluiten}
        onClick={onClose}
      />
      <div className={stijl.paneel}>
        <div className={stijl.kop}>
          <h2 className={stijl.titel}>{t.offlineTitel}</h2>
          <button
            type="button"
            className={stijl.sluit}
            onClick={onClose}
            aria-label={t.sluiten}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p className={stijl.uitleg}>{t.offlineUitleg}</p>

        {status === "idle" && (
          <button type="button" className={stijl.actie} onClick={start}>
            {t.offlineStart}
          </button>
        )}

        {status === "bezig" && (
          <div>
            <div className={stijl.balk}>
              <div className={stijl.voortgang} style={{ width: `${pct}%` }} />
            </div>
            <p className={stijl.melding} aria-live="polite">
              {t.offlineBezig(pct)}
            </p>
          </div>
        )}

        {status === "klaar" && (
          <p className={stijl.gelukt} aria-live="polite">
            {t.offlineKlaar}
          </p>
        )}

        {status === "fout" && (
          <>
            <p className={stijl.melding} aria-live="polite">
              {t.offlineFout}
            </p>
            <button type="button" className={stijl.actie} onClick={start}>
              {t.offlineStart}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
