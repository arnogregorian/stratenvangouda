"use client";

import { useState } from "react";
import stijl from "./AltNamen.module.css";

const EERSTE_AANTAL = 6;

/**
 * Alternatieve namen en schrijfwijzen; bij lange lijsten (sommige straten
 * hebben er 12+) een inklapbare weergave die op mobiel goed werkt (RFP §4.3).
 */
export default function AltNamen({ namen }: { namen: string[] }) {
  const [open, setOpen] = useState(false);
  if (!namen.length) return null;

  const zichtbaar = open ? namen : namen.slice(0, EERSTE_AANTAL);
  const rest = namen.length - EERSTE_AANTAL;

  return (
    <section aria-label="Alternatieve namen en schrijfwijzen">
      <h2 className={stijl.kop}>Ook bekend als</h2>
      <ul className={stijl.lijst}>
        {zichtbaar.map((naam) => (
          <li key={naam} className={stijl.chip}>
            {naam}
          </li>
        ))}
        {rest > 0 && !open && (
          <li>
            <button
              type="button"
              className={stijl.meer}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              + nog {rest} {rest === 1 ? "naam" : "namen"}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
