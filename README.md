# StratenVanGouda.nl

Laagdrempelige, mobile-first website waarmee Gouwenaars en bezoekers van Gouda
de herkomst, betekenis en geschiedenis van Goudse straatnamen ontdekken.
Gebouwd door [Webroots B.V.](https://webroots.nl) in opdracht van
[Historische Vereniging Die Goude](https://www.diegoude.nl/), op basis van de
data-infrastructuur van de [Gouda Tijdmachine](https://www.goudatijdmachine.nl/).

> **Status:** in ontwikkeling. Ontwerp-iteraties en definitieve huisstijl volgen;
> teksten van Colofon en Hulp zijn concepten.

## Stack

| Onderdeel | Keuze | Toelichting |
|---|---|---|
| Framework | Next.js (App Router) + React, TypeScript | Statisch gegenereerde pagina's met echte, deelbare en indexeerbare URL's |
| Kaart | Leaflet + PDOK BRT-Achtergrondkaart | Straten als aanklikbare lijnen; canvas-renderer voor 1000+ geometrieën |
| Beeldmateriaal | OpenSeadragon (IIIF Image API) | Deep-zoom rechtstreeks van de IIIF-server van het Streekarchief; geen eigen beeldopslag |
| Datacache | SQLite (ingebouwd `node:sqlite`, Node ≥ 22.5) | Dagelijkse verversing vanuit de Straatnamen API |
| Statische teksten | Markdown in `content/` | Door redactie te onderhouden zonder ontwikkelaar |
| Statistiek | Matomo (bestaande installatie Die Goude) | Uit totdat `NEXT_PUBLIC_MATOMO_URL` + `NEXT_PUBLIC_MATOMO_SITE_ID` zijn ingesteld; cookieloos |

Alle afhankelijkheden worden lokaal gebundeld: geen externe CDN's, geen Google
Fonts, geen Google Analytics. De site is een volledig statische export en heeft
op de server **geen Node.js-proces** nodig.

## Dataflow

```
Gouda Tijdmachine Straatnamen API          (dagelijks, `npm run sync`)
  https://api-straatnamen.goudatijdmachine.nl
        │  /straatnamen (GeoJSON, 1 call) + /straatnamen/{ark} + /afbeeldingen/{ark}
        ▼
  data/cache.db (SQLite)  ──►  public/data/straten.geojson  (kaart)
        │                      public/data/index.json       (zoeken + GPS)
        ▼  `npm run build`
  out/  (statische site: homepage, ±1200 straatpagina's, fotopagina's,
         colofon, hulp, sitemap.xml)
        ▼
  webserver Die Goude (nginx/Apache), tijdens bezoek laden alleen
  kaarttegels (PDOK) en beelden (IIIF Streekarchief / Tijdmachine) extern
```

De website heeft geen eigen contentbeheer: inhoudelijke wijzigingen lopen via
de Gouda Tijdmachine en komen bij de eerstvolgende sync + build mee.

## Bouwen en plaatsen (beheerhandleiding)

Vereisten: Node.js 24 LTS (minimaal 22.5) en npm.

```bash
npm ci                 # afhankelijkheden installeren
npm run sync           # data ophalen → data/cache.db + public/data/
npm run build          # statische site genereren → out/
```

De inhoud van `out/` kan door elke webserver geserveerd worden. Voorbeeld
nginx-locatie:

```nginx
root /var/www/stratenvangouda/out;
location / {
    try_files $uri $uri/index.html =404;
}
```

**Dagelijkse verversing** (richtlijn RFP: content binnen een dag actueel) via
cron, bijvoorbeeld om 04:30:

```cron
30 4 * * * cd /var/www/stratenvangouda && npm run sync && npm run build && rsync -a --delete out/ /var/www/stratenvangouda/live/
```

Publiceer atomisch (rsync naar de live-map of symlink-wissel) zodat bezoekers
nooit een half-gebouwde site zien. Faalt de sync, dan blijft de vorige versie
gewoon staan.

### Omgevingsvariabelen (optioneel)

| Variabele | Doel | Standaard |
|---|---|---|
| `SITE_URL` | Canonieke basis-URL voor sitemap/metadata | `https://stratenvangouda.nl` |
| `STRAATNAMEN_API` | Alternatief API-endpoint | productie-endpoint |
| `NEXT_PUBLIC_MATOMO_URL` | Matomo-installatie (bijv. `https://stats.diegoude.nl`) | uit |
| `NEXT_PUBLIC_MATOMO_SITE_ID` | Matomo site-ID | uit |

## Ontwikkeling

```bash
npm run sync   # eenmalig data ophalen
npm run dev    # http://localhost:3000
npm run serve  # de statische export uit out/ lokaal serveren
```

Statische teksten bewerken: `content/colofon.md` en `content/hulp.md`
(gewone Markdown; wijzigingen zijn zichtbaar na een nieuwe build).

## Bekende beperkingen / openstaande punten

- **Wijk en jaartal/leeftijd** van de straatnaam staan nog niet als veld in de
  Straatnamen API; zodra beschikbaar worden ze op de detailpagina getoond
  (zie `app/(paginas)/straat/[slug]/page.tsx`).
- De API-lijst bevat enkele **dubbele identifiers** en één straat **zonder
  ARK-identifier** ("Cinqe erf"); het sync-script dedupliceert en slaat
  detailloze straten met alleen kaartinformatie op. Gemeld bij Gouda Tijdmachine.
- **Verdwenen straten** worden al gesynchroniseerd maar niet getoond (v2 in het RFP).
- De kaartlijnen zijn met de canvas-renderer niet per stuk met het toetsenbord
  focusbaar; het zoekveld is het volwaardige, toegankelijke alternatief en wordt
  als zodanig in de WCAG-rapportage bij oplevering vermeld.
- Huisstijl (lettertype, definitief kleurenpalet, favicon) en logo's volgen uit
  de designiteraties; nu tijdelijk systeemlettertype + kleuren van diegoude.nl.
- Licentie: nader te bepalen met Die Goude (open source, bijv. MIT of EUPL).
