"use client";

import { Fragment, useState } from "react";
import stijl from "./LeesMeer.module.css";

const GRENS = 420;

/**
 * Lange teksten worden afgekapt met een "lees meer"-toggle (RFP §4.3).
 * Dubbele newlines worden alinea's, enkele newlines een regelafbreking (bijv.
 * de aparte duiding bij problematische straatnamen, API-veld `problematisch`
 * sinds v1.10.0). Geen tabellen.
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
          {alinea.split("\n").map((regel, j, regels) => (
            <Fragment key={j}>
              {regel}
              {j < regels.length - 1 && <br />}
            </Fragment>
          ))}
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
