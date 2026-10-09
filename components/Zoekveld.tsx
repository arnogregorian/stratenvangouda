"use client";

import { useEffect, useRef, useState } from "react";
import { laadIndex, zoek, type IndexItem } from "@/lib/zoekindex";
import { useTaal } from "@/lib/taal";
import stijl from "./Zoekveld.module.css";

type Props = {
  /** Locator-knopje per suggestie: toon de straat op de kaart i.p.v. navigeren. */
  onLocate?: (item: IndexItem) => void;
};

export default function Zoekveld({ onLocate }: Props) {
  const { t } = useTaal();
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState<IndexItem[] | null>(null);
  const [suggesties, setSuggesties] = useState<IndexItem[]>([]);
  const [actief, setActief] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Index pas laden bij eerste focus (bespaart data op de homepage)
  const zorgVoorIndex = () => {
    if (!index) laadIndex().then(setIndex).catch(() => setIndex([]));
  };

  useEffect(() => {
    if (!index) return;
    const resultaten = zoek(index, term);
    setSuggesties(resultaten);
    setOpen(resultaten.length > 0);
    setActief(-1);
  }, [term, index]);

  useEffect(() => {
    const sluitBijKlikBuiten = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", sluitBijKlikBuiten);
    return () => document.removeEventListener("pointerdown", sluitBijKlikBuiten);
  }, []);

  const gaNaar = (item: IndexItem) => {
    window.location.href = `/straat/${item.s}/`;
  };

  const toetsen = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActief((a) => Math.min(a + 1, suggesties.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActief((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const keuze = suggesties[actief >= 0 ? actief : 0];
      if (keuze) gaNaar(keuze);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={stijl.wrapper}>
      <label htmlFor="zoek" className="alleen-screenreader">
        {t.zoekLabel}
      </label>
      <input
        id="zoek"
        type="search"
        className={stijl.veld}
        placeholder={t.zoekPlaceholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="zoek-suggesties"
        aria-activedescendant={actief >= 0 ? `suggestie-${actief}` : undefined}
        value={term}
        onFocus={zorgVoorIndex}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={toetsen}
      />
      {open && (
        <ul id="zoek-suggesties" role="listbox" className={stijl.lijst}>
          {suggesties.map((item, i) => (
            <li
              key={item.s}
              id={`suggestie-${i}`}
              role="option"
              aria-selected={i === actief}
              className={i === actief ? stijl.itemActief : stijl.item}
            >
              <button
                type="button"
                className={stijl.keuze}
                tabIndex={-1}
                onPointerDown={(e) => {
                  e.preventDefault();
                  gaNaar(item);
                }}
              >
                <span className={stijl.naam}>
                  {item.n}
                  {item.v && <span className={stijl.tag}>{t.verdwenen}</span>}
                </span>
                {item.a && <span className={stijl.alt}>{item.a}</span>}
              </button>
              {onLocate && (
                <button
                  type="button"
                  className={stijl.locator}
                  tabIndex={-1}
                  aria-label={t.toonOpKaart(item.n)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLocate(item);
                    setOpen(false);
                  }}
                >
                  <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="7" />
                    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
