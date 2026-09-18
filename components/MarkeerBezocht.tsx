"use client";

import { useEffect } from "react";
import { markeerBezocht } from "@/lib/bezocht";

/**
 * Registreert (client-side) dat deze straatdetailpagina bekeken is, zodat de
 * kaart de straat donkerder kan kleuren en de homepage er bij terugkeer op
 * inzoomt. Rendert zelf niets.
 */
export default function MarkeerBezocht({ slug }: { slug: string }) {
  useEffect(() => {
    markeerBezocht(slug);
  }, [slug]);
  return null;
}
