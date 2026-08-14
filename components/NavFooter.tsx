"use client";

import stijl from "./NavFooter.module.css";

/**
 * Navigatiefooter op alle pagina's behalve de homepage (RFP §4.2):
 * Home, Terug, Colofon en Hulp.
 */
export default function NavFooter() {
  return (
    <nav className={stijl.footer} aria-label="Hoofdnavigatie">
      <a href="/" className={stijl.item}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
        Home
      </a>
      <button
        type="button"
        className={stijl.item}
        onClick={() => (history.length > 1 ? history.back() : (location.href = "/"))}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="m11 18-6-6 6-6" />
        </svg>
        Terug
      </button>
      <a href="/colofon/" className={stijl.item}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01M11 12h1v4h1" />
        </svg>
        Colofon
      </a>
      <a href="/hulp/" className={stijl.item}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.34c-.72.28-.9.9-.9 1.66M12 16.5h.01" />
        </svg>
        Hulp
      </a>
    </nav>
  );
}
