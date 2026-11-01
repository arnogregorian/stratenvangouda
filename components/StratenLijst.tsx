"use client";

import { useMemo, useState } from "react";
import { normaliseer } from "@/lib/zoekindex";
import stijl from "./StratenLijst.module.css";

type Item = { naam: string; slug: string; alt: string; buurten: string[] };

/**
 * Alfabetische lijst van alle straten met een client-side filter (RFP §4.2).
 * De volledige lijst staat in de HTML (ook zonder JavaScript bruikbaar, goed
 * voor zoekmachines §5.5 en als toetsenbord-/screenreader-alternatief voor de
 * kaart §5.2); het zoekveld filtert progressief op naam én vroegere namen, en
 * daarnaast kan op buurt (RFP §4.3 "wijk") worden gefilterd.
 */
export default function StratenLijst({ lijst }: { lijst: Item[] }) {
  const [term, setTerm] = useState("");
  const [buurt, setBuurt] = useState("");

  const buurten = useMemo(() => {
    const set = new Set<string>();
    for (const s of lijst) for (const b of s.buurten) set.add(b);
    return [...set].sort((a, b) => a.localeCompare(b, "nl"));
  }, [lijst]);

  const groepen = useMemo(() => {
    const q = normaliseer(term.trim());
    const gefilterd = lijst.filter((s) => {
      if (buurt !== "" && !s.buurten.includes(buurt)) return false;
      if (q === "") return true;
      return (
        normaliseer(s.naam).includes(q) ||
        (s.alt !== "" && normaliseer(s.alt).includes(q))
      );
    });
    const gesorteerd = [...gefilterd].sort((a, b) =>
      a.naam.localeCompare(b.naam, "nl", { sensitivity: "base", numeric: true })
    );
    const perLetter = new Map<string, Item[]>();
    for (const s of gesorteerd) {
      const kaal = normaliseer(s.naam).replace(/[^a-z0-9]/g, "");
      const letter = /[a-z]/.test(kaal[0] ?? "") ? kaal[0].toUpperCase() : "#";
      let rij = perLetter.get(letter);
      if (!rij) perLetter.set(letter, (rij = []));
      rij.push(s);
    }
    // Letters alfabetisch; de "#"-groep (namen die met een leesteken of cijfer
    // beginnen) onderaan.
    return [...perLetter.entries()].sort(([a], [b]) =>
      a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b, "nl")
    );
  }, [term, buurt, lijst]);

  const aantal = groepen.reduce((n, [, l]) => n + l.length, 0);

  return (
    <div>
      <div className={stijl.filters}>
        <div className={stijl.veldWrap}>
          <label htmlFor="stratenzoek" className="alleen-screenreader">
            Zoek in de stratenlijst
          </label>
          <input
            id="stratenzoek"
            type="search"
            className={stijl.zoek}
            placeholder="Zoek een straatnaam…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            autoComplete="off"
          />
        </div>
        {buurten.length > 0 && (
          <div className={stijl.veldWrap}>
            <label htmlFor="buurtfilter" className="alleen-screenreader">
              Filter op buurt
            </label>
            <select
              id="buurtfilter"
              className={stijl.buurt}
              value={buurt}
              onChange={(e) => setBuurt(e.target.value)}
            >
              <option value="">Alle buurten</option>
              {buurten.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p className={stijl.aantal} aria-live="polite">
        {aantal} {aantal === 1 ? "straat" : "straten"}
      </p>

      {aantal === 0 ? (
        <p className={stijl.geen}>Geen straten gevonden.</p>
      ) : (
        groepen.map(([letter, items]) => (
          <section key={letter} className={stijl.groep}>
            <h2 className={stijl.letter}>{letter}</h2>
            <ul className={stijl.lijst}>
              {items.map((s) => (
                <li key={s.slug}>
                  <a className={stijl.link} href={`/straat/${s.slug}/`}>
                    {s.naam}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
