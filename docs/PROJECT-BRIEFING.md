# StratenVanGouda.nl — Projectbriefing & technische details

*Samengesteld 18 juli 2026 op basis van het RFP (10 juni), onze offerte 2026-0009 (11 juni), de gunningsmail van Peter Kuppen (17 juli) en live verificatie van de Gouda Tijdmachine API's.*

## 1. Status en contactpersonen

- **Opdracht gegund aan Webroots B.V.** per mail van 17 juli 2026 (Peter Kuppen, voorzitter, via secretaris@diegoude.nl).
- **Kickoff-voorstel: vrijdag 14 augustus 2026, 16:00–17:00, Chocoladefabriek Gouda** — nog te bevestigen.
- **Deadline oplevering: vóór 1 november 2026.**
- Contacten:
  - Peter Kuppen — voorzitter (voorzitter@diegoude.nl)
  - Eric Boers — secretaris (secretaris@diegoude.nl)
  - **Richard de Jongh en Bob Coret — technische aanspreekpunten** (aanwezig bij kickoff)
  - Algemeen: info@diegoude.nl
- Financieel: vaste prijs **€ 3.565 excl. btw** (€ 4.313,65 incl.), meerwerk € 85/uur excl. btw. Garantie: 3 maanden na acceptatie. Offerte geldig tot 11 augustus 2026.
- Documenten in deze map: `RFP StratenVanGouda.nl.pdf`, `Offerte Webroots 2026-0009.pdf`, `gtm-api-straatnamen-openapi.json`.

## 2. Wat we gaan bouwen (scope v1)

Mobile-first website waarmee Gouwenaars de herkomst van Goudse straatnamen ontdekken. Alleen Nederlands, geen meertaligheid, geen CMS — alle content komt uit de Gouda Tijdmachine.

**Pagina's:**
| Pagina | Inhoud |
|---|---|
| Homepage | Interactieve kaart (straten als **lijnen**, aanklikbaar), zoekveld met auto-suggest, GPS-knop "straten in mijn buurt" |
| Detailpagina | Eigen stabiele URL per straat; naam, leeftijd/jaartal, uitleg, alternatieve namen, wijk (indien beschikbaar), foto's als oneindig scrollende thumbnails, deelknop |
| Fotopagina | IIIF deep-zoom viewer (+/− knoppen én pinch), bronvermelding (beschrijving, maker, datering) |
| Colofon | Statische tekst (Markdown), logo's, subsidievermelding gemeente Gouda, privacyverklaring, statistiekmelding |
| Hulp | Statische tekst (Markdown), contact |

- Navigatiefooter (Home, Terug, Colofon, Hulp) op alle pagina's behalve homepage.
- Deelknop: Web Share API met fallback (copy-link, mailto).
- Externe links vermijden; extra info in-site (modal/pop-up).
- Lange teksten: "lees meer"-toggle, paragrafen, geen tabellen. Lange lijsten alt-namen: passende mobiele UX.
- Sitemap.xml gegenereerd uit de API; Open Graph per pagina; Schema.org waar passend.

**Buiten scope (v2):** verdwenen straten, filters (wijk/periode/heden-verdwenen), gebruikersbijdragen, meertaligheid, historische kaartondergronden, onderzoekerszoekfunctie, PWA/apps.

## 3. Toegezegde stack (offerte)

- **Next.js + React**, SSG of SSR — echte, indexeerbare, deelbare URL's.
- **Leaflet** met **PDOK BRT-Achtergrondkaart**-tegels (subsidiair OSM met attributie; géén Google Maps).
- **IIIF-viewer: OpenSeadragon of Tify** — beelden rechtstreeks van de IIIF Image API van het Streekarchief, geen eigen beeldopslag.
- **Lichte lokale cache (SQLite) met dagelijkse verversing** van de API-data.
- Alle dependencies (JS, CSS, fonts, iconen) **lokaal gebundeld** — geen externe CDN's, geen Google Fonts, geen Google Analytics.
- Statistiek via **bestaande Matomo-installatie** van Die Goude.
- Statische teksten als **Markdown**, door redactie te onderhouden.
- Open-source oplevering in **GitHub-repo van opdrachtgever**, incl. README (stack, dataflow, integraties, beperkingen, build/deploy-handleiding).
- Hosting op de **bestaande Linux-server van Die Goude**; wij ontwikkelen eerst op eigen testomgeving.

**Niet-functionele eisen:** FCP < 1,5 s, TTI < 3 s; kaart soepel met enkele honderden straten; lazy loading thumbnails; **WCAG 2.2 AA** (contrast, tikdoelen, toetsenbord, alt-teksten — afwijkingen expliciet rapporteren bij oplevering); 320–1920px+; recente Chrome/Firefox/Edge/Safari; geen tracking-cookies.

**Proces:** 2 ontwerpiteraties met klikmodel → akkoord → bouw → werkende testversie → akkoord → livegang. 3 afstemmomenten + 6 uur feedbackverwerking gereserveerd. Overdrachtssessie met technisch beheerder.

## 4. De Gouda Tijdmachine API's (geverifieerd, live getest 18 juli)

Overzicht infrastructuur: https://www.goudatijdmachine.nl/omeka/s/data/page/usageInfo

### 4.1 Straatnamen REST API (primaire bron) — v1.3.0
- **Productie:** `https://api-straatnamen.goudatijdmachine.nl`
- Development: `https://www.goudatijdmachine.nl/api-straatnamen`
- Docs (Swagger): https://api-straatnamen.goudatijdmachine.nl/ — spec: `assets/gtm-api-straatnamen-openapi.json` (lokale kopie in deze map)
- Read-only, **geen authenticatie**. Identifiers zijn persistente ARK-URI's (`https://n2t.net/ark:/60537/…`) die **URL-encoded** als path-parameter moeten.

**Endpoints:**
1. `GET /straatnamen?q=&limit=&offset=&lat=&lon=&type=` — lijst/zoeken.
   - **Let op: `Accept: application/json` of `application/geo+json` header is verplicht** (anders 406). Alternatief: `?geojson`.
   - `type`: `huidig` | `verdwenen` | `alle` (default alle).
   - `lat`/`lon`: dichtstbijzijnde straten (basis voor de GPS-functie) — getest, werkt.
   - JSON-response: `{ "straten": [{identifier, naam, naam_alt}], "aantal": n }`.
   - GeoJSON-response: FeatureCollection; properties `identifier`, `naam`, `naam_alt`, `type` (waarden **"heden"/"verdwenen"**) + geometrie → direct bruikbaar in Leaflet.
2. `GET /straatnamen/{identifier}` — detail: `identifier`, `naam`, `alt_names` (array of null), `genoemd_naar` (hoofdtekst), `ligging`, `vermeldingen` (bijv. "Raadsbesluit, nummer 4053 - 78 (7-05-1973)"), `geometry` (LineString/MultiLineString/Polygon, WGS84), `type`.
3. `GET /afbeeldingen/{identifier}?limit=&offset=` — beelden per straat: `{ "aantal": 92, "afbeeldingen": [{identifier, titel, thumbnail, image, iiif_info_json, vervaardiger, datering, informatie_auteursrechten, url, bronbronorganisatie}] }`.
   - `iiif_info_json` bijv. `https://images.memorix.nl/sahm/iiif/{uuid}/info.json` → **rechtstreeks in OpenSeadragon te laden**.
   - `thumbnail` = `goudatijdmachine.nl/omeka/files/square/…jpg`; `image` = IIIF `full/500,`.
   - `informatie_auteursrechten` bijv. "PubliekDomein"; `url` linkt naar de SAMH-beeldbank.

**Werkelijke datavolumes (volledige sync 18 juli):** 1305 unieke straten (1199 huidig, 106 verdwenen — het RFP sprak van "enkele honderden"), 9.845 afbeeldingen verdeeld over 474 straten, allemaal met IIIF-link. Uitschieter: de Markt heeft 1.454 afbeeldingen. Kaartperformance met 1199 lijnen is getest en soepel (canvas-renderer).

**Bevindingen uit de live test (bespreken met Richard/Bob):**
- De lijst bevat **dubbele identifiers** (o.a. Korte en Lange Geuzenstraat elk 2×).
- Eén straat ("Cinqe erf") heeft **geen ARK** maar een Omeka-resource-URI; het detail-endpoint geeft daarop HTTP 400.
- Spec wijkt af van werkelijkheid: spec noemt wrapper `panden`, echte respons is `straten`; lijst gebruikt `naam_alt`, detail `alt_names`.
- `naam_alt` in de lijst is een **array met daarin één komma-gescheiden string** — vermoedelijk onbedoeld.
- `aantal` = aantal geretourneerde items, niet het totaal → paginering/totaaltelling onduidelijk.
- **Geen `wijk`-veld** in de respons, terwijl het RFP "wijk (indien beschikbaar uit de API)" noemt.
- **Geen expliciet jaartal/leeftijd-veld**; alleen `vermeldingen` (vrije tekst met datum) — RFP vraagt "leeftijd van de straatnaam".
- Straat zonder afbeeldingen (bijv. Boschlust) geeft **404 "Straat niet gevonden"** op `/afbeeldingen/` — niet te onderscheiden van een onbekende straat.
- Filterwaarde `type=huidig` vs. datawaarde `"heden"` — inconsistent.
- Spec bevat een `ClearCacheResponse`-schema → er is een (verborgen?) cache-clear-endpoint; zegt iets over caching aan API-zijde.
- Testresultaten API: https://api-straatnamen.goudatijdmachine.nl/test-results/

### 4.2 Overige infrastructuur (secundair/fallback)
- **SPARQL (Qlever):** `https://sparql.goudatijdmachine.nl/` — ontologie: https://www.goudatijdmachine.nl/def/
- **Omeka S REST API:** `https://www.goudatijdmachine.nl/omeka/api` (JSON-LD; ook `?format=turtle|ntriples|rdfxml`)
- **IIIF Presentation manifests:** `…/omeka/iiif/2/{id}/manifest`; Change Discovery: `https://www.goudatijdmachine.nl/iiif/activity/all`
- **WMS (GeoServer):** `https://www.goudatijdmachine.nl/geoserver/gtm/wms?SERVICE=WMS`
- Datadumps: https://www.goudatijdmachine.nl/omeka/datasets — datacatalogus: `/.well-known/datacatalog`
- Straatnamenproject: https://www.goudatijdmachine.nl/straatnamen/

### 4.3 Kaartondergrond
- PDOK BRT-Achtergrondkaart (raster/vector tiles, gratis, open). Attributie verplicht. Leaflet-integratie standaard.

## 5. Vragenlijst voor Die Goude (vooraf mailen / kickoff 14 aug)

### Toegang & accounts
1. **GitHub**: welke organisatie/repo stelt Die Goude beschikbaar? Wie nodigt ons uit (GitHub-usernames doorgeven)? Welke open-source licentie heeft de voorkeur (MIT, EUPL, GPL)?
2. **Linux-server**: wat zijn de specs (distro, RAM), draait er al een webserver (nginx/Apache), is Node.js (LTS) beschikbaar of gewenst, of moet de site puur statisch geserveerd worden? Mogen wij SSH-toegang krijgen voor de livegang, of doet de beheerder van Die Goude de deployment aan de hand van onze documentatie (RFP 6.8 zegt het laatste, onze offerte biedt begeleide livegang — afstemmen)? Is Docker een optie?
3. **Domein**: wie registreert/beheert StratenVanGouda.nl? DNS-toegang, SSL (Let's Encrypt op de server?). Ook www-variant en eventuele redirects.
4. **Matomo**: URL van de installatie, site-ID, wie maakt de site aan? First-party tracking script lokaal hosten — akkoord? (RFP: "technische informatie wordt gedurende het project aangeleverd".)
5. Wie is de **technisch beheerder** voor de overdrachtssessie — Richard de Jongh?

### Bestanden & content (aan te leveren door Die Goude)
6. **Logo's** van Die Goude, Streekarchief Midden-Holland, Gouda Tijdmachine en gemeente Gouda — het liefst als SVG.
7. **Huisstijl**: bestaan er brandguidelines van diegoude.nl (kleuren, lettertypen — let op: fonts moeten lokaal gehost, dus licentie check)? Favicon-bronbestand?
8. **Statische teksten**: Colofon (incl. subsidievermelding en privacyverklaring) en Hulp — wie schrijft ze, wanneer beschikbaar? Komt er een intro-tekst op de homepage?
9. **Privacyverklaring**: bestaande tekst of nieuw op te stellen?

### API & data (voor Richard/Bob)
10. Komt er een **`wijk`-veld** in de API (RFP noemt wijk op de detailpagina) of laten we dit weg?
11. Waar komt het **jaartal/de leeftijd** van de straatnaam vandaan — apart veld toevoegen of parsen uit `vermeldingen`?
12. De **duiding van discutabele/problematische straatnamen** (belangrijk richting subsidieverstrekker): zit die in `genoemd_naar` of komt er een apart veld/markering?
13. Spec vs. realiteit: `panden` vs `straten`, `naam_alt` vs `alt_names`, komma-string in array — wordt de API/spec nog bijgewerkt, en is er een versiebeleid/changelog waar wij op kunnen bouwen?
14. `aantal` = geretourneerd aantal, niet totaal — hoe kunnen we het **totaal aantal straten** voor paginering/sitemap bepalen (of gewoon `limit=2000` alles ophalen)?
15. `/afbeeldingen/` geeft **404 bij straat zonder beelden** — kan dat een lege lijst worden, of moeten wij 404 als "geen beelden" interpreteren?
16. `type=huidig` filter vs. waarde `"heden"` in data — klopt de filter en toont v1 alléén huidige straten (verdwenen straten zijn v2)?
17. **Verversing**: hoe vaak wordt de bron ge-update en cachet de API zelf? Onze dagelijkse cache-refresh — is een vast tijdstip gewenst? Is er een noodprocedure/cache-clear als er per direct iets aangepast moet worden (bijv. bij een fout in een tekst)?
18. **Rate limits / fair use** van de API en de Memorix IIIF-server? Ons buildproces haalt bij elke (dagelijkse) build alle ~honderden straten op.
19. **Externe domeinen**: de beelden komen van `images.memorix.nl` en thumbnails van `goudatijdmachine.nl`. RFP zegt "geen externe CDN's" — bevestigen dat deze bronservers uiteraard wél toegestaan zijn (voor CSP-configuratie).
20. Zijn alle afbeeldingen rechtenvrij te tonen (`informatie_auteursrechten` per beeld — moeten we beelden zonder "PubliekDomein" anders behandelen)?
21. Is het **PDOK BRT-achtergrondkaart**-voorstel definitief akkoord (stijl: standaard/grijs/pastel)?
22. Bestaat er al een **proof of concept** van de Tijdmachine (genoemd in RFP §2.4) dat we mogen zien als referentie?

### Proces
23. Kickoff 14 augustus 16:00 Chocoladefabriek — **bevestigen**. Agenda: doornemen offerte, planning designiteraties, aanleverlijst.
24. Wie zitten er in de **werkgroep** voor de twee designiteraties en wat is hun beschikbaarheid in aug/sep (i.v.m. oplevering vóór 1 november)?
25. Voorkeur open-source licentie ook voor **ontwerpen/content** (RFP §12 noemt open-content)?

## 6. Voorgestelde planning (concept, af te stemmen)

| Fase | Periode |
|---|---|
| Kickoff + aanleveringen | 14 aug |
| Ontwerpiteratie 1 (klikmodel) | 2e helft aug |
| Ontwerpiteratie 2 + akkoord | begin sep |
| Bouw op testomgeving | sep – medio okt |
| Testversie + feedback | medio okt |
| Livegang + overdracht | vóór 1 nov |
