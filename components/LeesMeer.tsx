"use client";

import { useState } from "react";
import stijl from "./LeesMeer.module.css";

const GRENS = 420;

/**
 * Lange teksten worden afgekapt met een "lees meer"-toggle (RFP §4.3).
 * Tekst wordt als paragrafen weergegeven, geen tabellen.
 */
export default function LeesMeer({ tekst }: { tekst: string }) {
  const [open, setOpen] = useState(false);
  const lang = tekst.length > GRENS;

  const zichtbaar =
    !lang || open ? tekst : `${tekst.slice(0, GRENS).trimEnd()}…`;

  return (
    <div>
      {zichtbaar.split(/\n\n+/).map((alinea, i) => (
        <p key={i} className={stijl.alinea}>
          {alinea}
        </p>
      ))}
      {lang && (
        <button
          type="button"
          className={stijl.toggle}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? "Lees minder" : "Lees meer"}
        </button>
      )}
    </div>
  );
}
