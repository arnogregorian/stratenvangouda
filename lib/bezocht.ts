"use client";

/**
 * Sessiegebonden bijhouden welke straten de bezoeker heeft bekeken. Bewust
 * `sessionStorage` (leeft zolang het tabblad/de sessie open is) i.p.v. een
 * cookie: dat past bij de privacybelofte "geen tracking-cookies" (colofon) en
 * vraagt geen toestemming.
 *
 * Gebruikt door:
 * - components/MarkeerBezocht.tsx — markeert elke bekeken straatdetailpagina;
 * - components/Kaart.tsx — kleurt bezochte straten donkerder;
 * - components/StartScherm.tsx — zoomt bij terugkeer in op de laatst bekeken straat.
 */

const SLEUTEL_SET = "sv-bezochte-straten";
const SLEUTEL_LAATST = "sv-laatste-straat";

function leesSet(): Set<string> {
  try {
    const ruw = sessionStorage.getItem(SLEUTEL_SET);
    return new Set(ruw ? (JSON.parse(ruw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Registreer dat een straat bekeken is: voeg toe aan de set én onthoud als laatste. */
export function markeerBezocht(slug: string): void {
  if (!slug) return;
  try {
    const set = leesSet();
    set.add(slug);
    sessionStorage.setItem(SLEUTEL_SET, JSON.stringify([...set]));
    sessionStorage.setItem(SLEUTEL_LAATST, slug);
  } catch {
    /* sessionStorage kan geblokkeerd zijn (privémodus); dan simpelweg niets onthouden */
  }
}

/** Alle deze sessie bekeken slugs. */
export function bezochteSlugs(): Set<string> {
  return leesSet();
}

/** De laatst bekeken straat, of null. Zie `wisLaatstBezocht` om te "consumeren". */
export function laatstBezocht(): string | null {
  try {
    return sessionStorage.getItem(SLEUTEL_LAATST);
  } catch {
    return null;
  }
}

/** Vergeet alléén de "laatste"-markering (na inzoomen bij terugkeer), zodat een
 *  verse herlaad van de homepage weer de intro toont i.p.v. opnieuw in te zoomen.
 *  De set met bezochte straten blijft staan (voor de donkere kleur). */
export function wisLaatstBezocht(): void {
  try {
    sessionStorage.removeItem(SLEUTEL_LAATST);
  } catch {
    /* niets */
  }
}

const SLEUTEL_VERDWENEN = "sv-verdwenen-aan";

/** Voorkeur "verdwenen straten tonen". Blijft de hele sessie staan — ook na het
 *  bekijken van een straatdetailpagina — tot de bezoeker het weer uitzet. */
export function verdwenenVoorkeur(): boolean {
  try {
    return sessionStorage.getItem(SLEUTEL_VERDWENEN) === "1";
  } catch {
    return false;
  }
}

export function zetVerdwenenVoorkeur(aan: boolean): void {
  try {
    sessionStorage.setItem(SLEUTEL_VERDWENEN, aan ? "1" : "0");
  } catch {
    /* niets */
  }
}
