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
30 4 * * * cd /var/www/stratenvangouda && node scripts/sync.mjs --alleen-bij-wijziging && npm run build && rsync -a --delete out/ /var/www/stratenvangouda/live/
```

De sync stuurt de cache-validators (`ETag`/`Last-Modified`, API v1.5.0) van de
vorige run mee. Is er bij de bron niets gewijzigd, dan antwoordt de API met
304 Not Modified en eindigt de sync met exitcode 3: de keten stopt en de
herbouw wordt die dag overgeslagen. Zonder `--alleen-bij-wijziging` eindigt een
ongewijzigde run gewoon met exitcode 0 (handig voor `npm run sync` lokaal en op
Vercel, waar de build sowieso moet doorlopen).

Publiceer atomisch (rsync naar de live-map of symlink-wissel) zodat bezoekers
nooit een half-gebouwde site zien. Faalt de sync, dan blijft de vorige versie
gewoon staan.

### Demo op Vercel

Naast de statische hosting op de eigen Linux-server kan de site als **demo op
Vercel** draaien. `vercel.json` regelt dit: Vercel voert
`npm run sync && npm run build` uit, zodat eerst de data wordt opgehaald en
daarna de volledig statische export (`out/`) wordt gegenereerd en geserveerd.

- **Node.js 22.5+** is vereist voor de ingebouwde `node:sqlite` (zie `engines`
  in `package.json`). `NODE_OPTIONS=--experimental-sqlite` in `vercel.json`
  maakt de build ook op Node 22.x werkend; op Node 24 is die vlag een no-op.
- Elke Vercel-build haalt **live** de actuele data uit de Gouda Tijdmachine op;
  een deploy kan daardoor enkele minuten duren. Voor een snellere of stabielere
  demo kan desgewenst een reeds gesyncte `data/cache.db` worden meegeleverd.
- De uiteindelijke productie-hosting blijft de statische `out/` op de Linux-
  server van Die Goude; `vercel.json` heeft daar geen invloed op.

### Automatische uitrol en keepalive (GitHub Actions)

De productie-site wordt gebouwd en uitgerold door **`.github/workflows/uitrol.yml`**.
Die Goude host op gedeelde Linux-hosting zonder Node.js, dus de build draait in
GitHub Actions en alleen de statische `out/` gaat naar de server:

- **Dagelijks** (cron 04:17 UTC): conditionele sync met `--alleen-bij-wijziging`.
  Is de bron ongewijzigd (304), dan worden build én uitrol die dag overgeslagen.
- **Handmatig** (`workflow_dispatch`, via de Actions-tab of
  `gh workflow run uitrol.yml --ref main`): altijd een volledige sync + build +
  uitrol. **Let op: een gewone push naar `main` rolt niet uit.** Codewijzigingen
  worden pas live na een handmatige run (of op een dag dat de bron toch verandert).
- Uitrol gaat via **FTPS** met `lftp` naar de webmap; de FTPS-gegevens staan in
  de repository-secrets (`FTPS_HOST`, `FTPS_GEBRUIKER`, `FTPS_WACHTWOORD`).

**Keepalive (`.github/workflows/keepalive.yml`).** GitHub schakelt geplande
(cron-)workflows in een **openbare** repository automatisch uit na **60 dagen
zonder repository-activiteit**; alleen echte commits/pushes tellen mee — de
dagelijkse uitrol-runs en de build-cache niet. Zonder tegenmaatregel zou de
dagelijkse uitrol na een stille periode stilletjes stoppen. De keepalive draait
daarom **wekelijks** en maakt, zodra de repository ~50 dagen geen commit heeft
gehad, één kleine commit die alleen `.github/keepalive.txt` (een tijdstempel)
bijwerkt. Die commit telt als repository-activiteit en zet de 60-dagenteller
terug — ruim binnen de grens en zonder onderhoud. De commits zijn herkenbaar aan
auteur `die-goude-keepalive[bot]` en het bericht `chore(ci): keepalive …`; ze
wijzigen de site niet en veroorzaken geen uitrol (de dagelijkse build beslist op
de API-bron, niet op een git-wijziging). De keepalive pusht rechtstreeks naar
`main`; wordt er na de overdracht branch-protection op `main` gezet, voeg dan een
uitzondering voor deze bot toe (of laat de keepalive naar een eigen tak pushen).

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

- De API-lijst bevat enkele **dubbele identifiers** en één straat **zonder
  ARK-identifier** ("Cinqe erf"); het sync-script dedupliceert en slaat
  detailloze straten met alleen kaartinformatie op. Gemeld bij Gouda Tijdmachine.
- **Verdwenen straten** worden al gesynchroniseerd maar niet getoond (v2 in het RFP).
- De kaartlijnen zijn met de canvas-renderer niet per stuk met het toetsenbord
  focusbaar; het zoekveld is het volwaardige, toegankelijke alternatief. Zie het
  toegankelijkheidsoverzicht (`docs/TOEGANKELIJKHEID.md`) voor de volledige
  WCAG 2.2 AA-rapportage en bekende afwijkingen.
- Huisstijl (lettertype, definitief kleurenpalet, favicon) en logo's volgen uit
  de designiteraties; nu tijdelijk systeemlettertype + kleuren van diegoude.nl.
- Licentie: nader te bepalen met Die Goude (open source, bijv. MIT of EUPL).
