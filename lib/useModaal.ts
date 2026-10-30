"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Toegankelijk gedrag voor een modale dialog (WCAG 2.2 AA, 2.4.3 / 4.1.2):
 * verplaatst bij openen de focus naar de dialog, houdt Tab binnen de dialog
 * (focus-trap, past bij `aria-modal="true"`), sluit op Escape en zet de focus
 * bij sluiten terug op het element dat de dialog opende.
 *
 * Het dialog-element (`containerRef`) moet `tabIndex={-1}` hebben, zodat de
 * focus erheen kan en de screenreader de dialog-naam voorleest. `onClose` hoeft
 * niet stabiel te zijn: het wordt via een ref gelezen zodat het effect alleen op
 * `open` reageert en de focus niet bij elke re-render verspringt.
 */
export function useModaal(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const vorigeFocus = document.activeElement as HTMLElement | null;

    // getClientRects i.p.v. offsetParent: dat laatste is null voor
    // position:fixed-elementen (bv. een scrim) en zou die ten onrechte uitsluiten.
    const zichtbaar = (el: HTMLElement) => el.getClientRects().length > 0;
    const focusbare = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(zichtbaar);

    // Focus naar de dialog zelf; de screenreader leest rol + naam voor.
    container.focus();

    const bijToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lijst = focusbare();
      if (lijst.length === 0) {
        e.preventDefault();
        return;
      }
      const top = lijst[0];
      const bodem = lijst[lijst.length - 1];
      const actief = document.activeElement as HTMLElement | null;
      const inDialog = actief ? lijst.includes(actief) : false;
      if (e.shiftKey) {
        // Terug vanaf de eerste control (of vanaf de container) → naar de laatste.
        if (!inDialog || actief === top) {
          e.preventDefault();
          bodem.focus();
        }
      } else if (!inDialog || actief === bodem) {
        // Vooruit vanaf de laatste control (of vanaf de container) → naar de eerste.
        e.preventDefault();
        top.focus();
      }
    };

    container.addEventListener("keydown", bijToets);
    return () => {
      container.removeEventListener("keydown", bijToets);
      // Focus terug naar de opener (bv. de knop die de dialog opende).
      vorigeFocus?.focus?.();
    };
  }, [open, containerRef]);
}
