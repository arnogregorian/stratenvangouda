# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

StratenVanGouda.nl — a mobile-first site where visitors discover the origin and history of Gouda's street names. Built by Webroots B.V. for Historische Vereniging Die Goude, on top of the Gouda Tijdmachine data infrastructure. The site is a **fully static export** with **no server-side runtime** in production: all pages are pre-rendered HTML served by plain nginx/Apache. See `README.md` (build/deploy handbook) and `docs/PROJECT-BRIEFING.md` (scope, contacts, API findings, deadline 1 Nov 2026).

**The entire codebase is written in Dutch** — variable names, function names, file names, DB columns, comments. This is deliberate; match it. Do not rename identifiers to English.

## Commands

```bash
npm ci                      # install
npm run sync                # REQUIRED FIRST: fetch API → data/cache.db + public/data/
npm run dev                 # http://localhost:3000 (needs cache.db to exist)
npm run build               # static export → out/
npm run serve               # serve the out/ export locally (npx serve out)
node scripts/exporteer.mjs  # regenerate public/data/ from existing cache.db, no re-fetch
```

- **`npm run sync` must run before `dev` or `build`.** `data/cache.db` is gitignored and must be built first; the Next app reads it synchronously at render time and will fail without it.
- **Requires Node ≥ 22.5** — the sync/export scripts use the built-in `node:sqlite` (`DatabaseSync`). Target is Node 24 LTS.
- No test suite and no lint script are configured. Don't invent one.
- **Vercel demo:** `vercel.json` overrides the build to `npm run sync && npm run build` (data must be synced before the static export) and sets `NODE_OPTIONS=--experimental-sqlite` so `node:sqlite` works on Node 22.x as well as 24. Production hosting is still the static `out/` on Die Goude's Linux server; `vercel.json` doesn't affect that path.

## Architecture: the two-stage build

Data flows through two completely separate stages. Understanding this split is essential:

**Stage 1 — `scripts/sync.mjs` (network, runs standalone before the build):**
Fetches the Gouda Tijdmachine Straatnamen API → writes `data/cache.db` (SQLite) → then calls `scripts/exporteer.mjs`, which derives the static client data files in `public/data/`:
- `straten.geojson` — map lines (current streets only)
- `index.json` — compact search + GPS index (`{n, a, s, c}` = name, alt-names, slug, centroid)
- `fotos/{slug}.json` — per-street photo metadata, one file each (lazy-loaded; some streets like de Markt have 1400+ images, which must never be inlined)

**Stage 2 — `next build` (no network):**
Next.js reads `data/cache.db` via `lib/straten.ts` and pre-renders ~1200 street pages to static HTML in `out/`. The Next app **never touches the API** — it only reads the local SQLite cache produced in stage 1.

At runtime in the browser there is no backend: client components `fetch()` the pre-generated files from `public/data/`. External requests during a visit are only map tiles (PDOK) and images (IIIF / Memorix).

## Two data-access paths (don't confuse them)

- **Server-side (build time):** `lib/straten.ts` — a synchronous, read-only `node:sqlite` singleton. Used by Server Components (`app/**/page.tsx`, `sitemap.ts`) via `alleStraten()`, `straatViaSlug()`, `afbeeldingenVoorStraat()`. All queries filter `type != 'verdwenen'` (disappeared streets are synced but hidden — v2 scope).
- **Client-side (browser):** `lib/zoekindex.ts` and `lib/fotos.ts` — `"use client"` modules that `fetch()` the JSON in `public/data/` and cache the promise. Search/GPS/photo-strip logic lives here.

## Rendering conventions

- Street pages use `generateStaticParams()` + `export const dynamicParams = false` to enumerate every slug. Slugs are assigned deterministically in `sync.mjs` (stable across rebuilds; collisions get `-2`, `-3` suffixes).
- **Server Components do data access; Client Components (`"use client"`) do interactivity.** Leaflet (`components/Kaart.tsx`) and OpenSeadragon (`components/FotoViewer.tsx`) are `await import()`-ed *inside* `useEffect` because they reference `window` and cannot be imported at module top level.
- Photos are split: the first batch (~12) is inlined in the page HTML for immediate paint; the rest lazy-load via `lib/fotos.ts`.
- Static-export constraints (`next.config.ts`): `output: "export"`, `trailingSlash: true`, `images.unoptimized`. **Always use trailing-slash internal links** (e.g. `/straat/${slug}/`) and never use `next/image` optimization or any feature that needs a Node server.
- Path alias: `@/*` → repo root.

## API quirks (all handled in scripts/sync.mjs — preserve this handling)

The live Gouda Tijdmachine API (`https://api-straatnamen.goudatijdmachine.nl`, read-only, no auth) has known irregularities the sync script deliberately works around. See `docs/PROJECT-BRIEFING.md §4` for the full list:
- Identifiers are ARK URIs that must be **URL-encoded** as path params.
- The list returns **duplicate identifiers** — sync deduplicates (first wins).
- One street ("Cinqe erf") has no ARK → detail endpoint returns 400; streets without images return 404. Both are treated as "no detail / no images", not errors.
- `naam_alt` (list) vs `alt_names` (detail); `naam_alt` arrives as an array containing one comma-separated string → `normaliseerAltNamen()` flattens both.
- Photo source-org field has a typo in the API (`bronbronorganisatie`); the code accepts both spellings.
- Writes go to `cache.db.tmp` then `renameSync` for atomic swap, so a failed sync leaves the previous DB intact.

## Not yet available from the API

`wijk` (neighbourhood) and an explicit year/age field are requested in the RFP but not yet in the API. The detail page (`app/(paginas)/straat/[slug]/page.tsx`) has placeholder comments marking where they'll go once the API provides them.

## Environment variables (all optional)

| Variable | Purpose | Default |
|---|---|---|
| `SITE_URL` | Canonical base URL for sitemap/metadata | `https://stratenvangouda.nl` |
| `STRAATNAMEN_API` | Alternate API endpoint | production endpoint |
| `NEXT_PUBLIC_MATOMO_URL` | Matomo install (cookieless analytics; off until set) | off |
| `NEXT_PUBLIC_MATOMO_SITE_ID` | Matomo site ID | off |

## Constraints to respect

- **No external CDNs, no Google Fonts, no Google Analytics** — all JS/CSS/fonts/icons are bundled locally (contractual requirement). The only permitted external runtime requests are PDOK map tiles and IIIF/Memorix images.
- Static-only content editing: `content/colofon.md` and `content/hulp.md` are plain Markdown rendered at build time (`lib/markdown.ts`) so Die Goude editors can maintain them without a developer.
- Target **WCAG 2.2 AA**. The map canvas lines aren't individually keyboard-focusable by design; the search field is the accessible alternative.
