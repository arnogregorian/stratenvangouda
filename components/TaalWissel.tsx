"use client";

import { useEffect, useRef, useState } from "react";
import { useTaal, type Taal } from "@/lib/taal";
import stijl from "./TaalWissel.module.css";

const OPTIES: { taal: Taal; naam: string }[] = [
  { taal: "nl", naam: "Nederlands" },
  { taal: "en", naam: "English" },
  { taal: "de", naam: "Deutsch" },
  { taal: "fr", naam: "Français" },
];

/** Kleine SVG-vlaggen (emoji-vlaggen renderen op Windows als letters). */
function VlagSvg({ taal }: { taal: Taal }) {
  switch (taal) {
    case "nl":
      return (
        <svg viewBox="0 0 9 6" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="9" height="6" fill="#21468b" />
          <rect width="9" height="4" fill="#fff" />
          <rect width="9" height="2" fill="#ae1c28" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 9 6" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="9" height="6" fill="#ffce00" />
          <rect width="9" height="4" fill="#dd0000" />
          <rect width="9" height="2" fill="#000" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 9 6" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="9" height="6" fill="#fff" />
          <rect width="3" height="6" fill="#002395" />
          <rect x="6" width="3" height="6" fill="#ed2939" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 60 30" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="60" height="30" fill="#012169" />
          <path d="M0,0 60,30M60,0 0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 60,30M60,0 0,30" stroke="#c8102e" strokeWidth="3.5" />
          <path d="M30,0V30M0,15H60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0V30M0,15H60" stroke="#c8102e" strokeWidth="6" />
        </svg>
      );
  }
}

function Vlag({ taal }: { taal: Taal }) {
  return (
    <span className={stijl.vlag} aria-hidden="true">
      <VlagSvg taal={taal} />
    </span>
  );
}

export default function TaalWissel() {
  const { taal, setTaal } = useTaal();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const buiten = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", buiten);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", buiten);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={stijl.wissel}>
      <button
        type="button"
        className={stijl.knop}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Taal / Language: ${OPTIES.find((o) => o.taal === taal)?.naam ?? ""}`}
      >
        <Vlag taal={taal} />
      </button>
      {open && (
        <ul className={stijl.menu} role="menu">
          {OPTIES.map((o) => (
            <li key={o.taal} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={o.taal === taal}
                className={o.taal === taal ? stijl.optieActief : stijl.optie}
                onClick={() => {
                  setTaal(o.taal);
                  setOpen(false);
                }}
              >
                <Vlag taal={o.taal} />
                <span>{o.naam}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
