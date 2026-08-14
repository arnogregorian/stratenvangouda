"use client";

import { useEffect } from "react";

/**
 * Registreert de service worker (public/sw.js) voor de PWA. Alleen in productie:
 * in dev zou caching de hot-reload van Turbopack in de weg zitten.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registreer = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* stil falen: de site werkt ook zonder service worker */
      });
    };

    // Na 'load' registreren zodat het de eerste render niet vertraagt.
    if (document.readyState === "complete") registreer();
    else window.addEventListener("load", registreer, { once: true });
  }, []);

  return null;
}
