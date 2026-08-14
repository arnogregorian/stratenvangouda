"use client";

import { useEffect, useRef, useState } from "react";
import { laadIndex, zoek, type IndexItem } from "@/lib/zoekindex";
import stijl from "./Zoekveld.module.css";

export default function Zoekveld() {
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
        Zoek een straatnaam
      </label>
      <input
        id="zoek"
        type="search"
        className={stijl.veld}
        placeholder="Zoek een straatnaam…"
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
              onPointerDown={(e) => {
                e.preventDefault();
                gaNaar(item);
              }}
            >
              <span className={stijl.naam}>{item.n}</span>
              {item.a && <span className={stijl.alt}>{item.a}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
