# Toegankelijkheidsoverzicht — StratenVanGouda.nl

**Streefniveau:** WCAG 2.2 niveau AA (conform RFP §5.1: "afwijkingen expliciet
rapporteren bij oplevering").
**Peildatum:** 30 oktober 2026.
**Opgesteld door:** Webroots B.V.

## 1. Opzet van deze rapportage

Dit overzicht is het resultaat van een **broncode-audit** van de volledige
front-end (alle React-componenten, CSS-modules, pagina's en designtokens) plus
**handmatig berekende contrastverhoudingen** uit de kleurwaarden in
`app/globals.css`. Waar een bevinding afhangt van gedrag dat niet uit de code
vaststaat (bibliotheekgedrag van Leaflet/OpenSeadragon, rendering op een echt
toestel), is dat expliciet vermeld.

**Nog niet uitgevoerd** (aanbevolen vóór de definitieve oplevering, zie §6):
een geautomatiseerde controle (axe / Lighthouse) en een test met een
screenreader (NVDA/VoiceOver) en volledige toetsenbordbediening op echte
apparaten. Dit document is daarmee een onderbouwde zelfevaluatie, geen formeel
geaccrediteerd toegankelijkheidsonderzoek.

## 2. Samenvatting

De site is **grotendeels conform WCAG 2.2 AA**. De structurele uitgangspunten
zijn sterk: echte `<button>`/`<a>`-elementen overal (geen klikbare `div`'s),
consequente `aria-hidden` op decoratieve iconen, ruime tikdoelen (44–48 px) als
ontwerpnorm, een skip-link met bestaand doel, `lang="nl"`, expliciete
ondersteuning voor `prefers-reduced-motion`, en een volwaardig toetsenbord- en
screenreader-alternatief voor de kaart (het zoekveld).

In deze ronde (30 okt 2026) zijn de belangrijkste gevonden knelpunten
**opgelost** (§4). De resterende aandachtspunten (§5) zijn beperkt in aantal en
ernst; het belangrijkste — de kaartlijnen zijn niet één voor één met het
toetsenbord te bereiken — is een bewuste ontwerpkeuze met een gelijkwaardig
alternatief, zoals WCAG toestaat.

## 3. Bevindingen per WCAG-principe

Legenda: ✅ voldoet · 🟡 voldoet met kanttekening · ⚠️ aandachtspunt/afwijking · ➖ niet van toepassing

### 3.1 Waarneembaar (Perceivable)

| Criterium | Status | Toelichting |
|---|---|---|
| 1.1.1 Niet-tekstuele content | ✅ | Foto's hebben `alt` (titel, met generieke fallback "Historische afbeelding"); het deep-zoombeeld heeft `role="img"` + `aria-label`; colofon-logo's hebben alt-teksten; alle decoratieve SVG-iconen zijn `aria-hidden="true"` binnen een knop met tekst of `aria-label`; kaarttegels zijn decoratief binnen een `role="region"` met label. |
| 1.3.1 Info en relaties | 🟡 | Semantische koppen (h1→h2) en landmarks (`main#inhoud`, `nav[aria-label]`) op alle inhoudspagina's. Kanttekening: op de homepage zit de enige `h1` in de intro-dialog, die na sluiten `inert` is; en de kaartweergave zelf heeft dan geen zichtbare `h1`. Zie §5. |
| 1.4.1 Gebruik van kleur | ✅ | Inline tekst (`genoemd naar`, problematisch) wordt als platte tekst gerenderd en bevat geen links; markdown-links (hulp/colofon) behouden hun onderstreping. Links staan dus niet "alleen op kleur" in lopende tekst. |
| 1.4.3 Contrast (minimum) | ✅ | Alle tekst/achtergrond-combinaties ≥ 4,5:1 (grote/UI ≥ 3:1). Hoofdtekst ~12,9:1; gedempte tekst ~6,1:1. Na de fixes van deze ronde: "Sinds"-badge ~6,6:1 en kaartlaag-jaartal-op-rood ~5,3:1 (waren krap/net onder). Zie §4. |
| 1.4.4 / 1.4.10 Tekst vergroten / Reflow | 🟡 | Geen `maximum-scale`/`user-scalable=no`; responsieve opzet met `min()`, flex en rem; `-webkit-text-size-adjust:100%`. Geen horizontaal-scrollpatronen in de code. In-browser verificatie op 320 px en 200% zoom aanbevolen (§6). |
| 1.4.11 Contrast niet-tekst | ✅ | Knoppen/randen/focus-outline ≥ 3:1; focus-ring is 3 px rood op lichte achtergrond. |
| 1.4.12 Tekstafstand | ✅ | `line-height:1.6` op body; geen vaste hoogtes die tekst afknippen. |

### 3.2 Bedienbaar (Operable)

| Criterium | Status | Toelichting |
|---|---|---|
| 2.1.1 Toetsenbord | 🟡 | Alle knoppen/links en de modals zijn met het toetsenbord bedienbaar; het zoekveld is een volwaardige combobox. **De kaartlijnen zijn canvas-gerenderd en niet per stuk focusbaar**; het toegankelijke alternatief is zoeken + "toon op kaart" (expliciet benoemd in het region-label). OpenSeadragon: zoom (+/−) en vorige/volgende zijn knoppen; pannen binnen een ingezoomde foto leunt op sleep/pinch (§5). |
| 2.1.2 Geen toetsenbordval | ✅ | Geen vallen; de modals hebben nu een expliciete focus-trap + Escape (§4). |
| 2.2.2 Pauzeren/stoppen (beweging) | 🟡 | De subtiele kaart-drift op het startscherm start automatisch maar **stopt bij elke interactie** en bij het sluiten van de intro, en is volledig uit bij `prefers-reduced-motion`. Geen aparte pauzeknop; verdedigbaar voldaan. |
| 2.3.1 Flitsen | ✅ | Geen flitsende of snel wisselende content. |
| 2.4.1 Blokken overslaan | ✅ | Skip-link "Direct naar inhoud" → `#inhoud`; doel bestaat op elke pagina. |
| 2.4.3 Focusvolgorde | ✅ | Logische DOM-volgorde; modals verplaatsen de focus nu naar de dialog en herstellen hem bij sluiten (§4). |
| 2.4.7 Focus zichtbaar | ✅ | Globale `:focus-visible { outline: 3px }`; het zoekveld toont nu ook die ring (was onderdrukt — §4). |
| 2.4.11 Focus niet afgedekt (min., **WCAG 2.2**) | 🟡 | De vaste onderbalk is `position:fixed`; inhoudspagina's reserveren ruimte via `padding-bottom`. Laag risico dat een net-onder-gescrold element wordt afgedekt; in-browser bevestigen aanbevolen (§6). |
| 2.5.7 Sleepbewegingen (**WCAG 2.2**) | 🟡 | Kaart pannen = slepen, maar er zijn niet-sleep-alternatieven (zoomknoppen, zoeken, pijltjestoetsen). Het verschuiven **binnen** een ingezoomde foto kent als zekere methode alleen sleep/pinch (§5). |
| 2.5.8 Doelgrootte (min. 24 px, **WCAG 2.2**) | ✅ | Nav-tabs ~49 px; kaart-/zoom-/sluitknoppen 40–48 px; foto-tegels ≥104 px. Na de fixes: beeldbank-link ~26 px en de sorteer-keuzelijst ruimer (§4). |

### 3.3 Begrijpelijk (Understandable)

| Criterium | Status | Toelichting |
|---|---|---|
| 3.1.1 Taal van de pagina | ✅ | `<html lang="nl">`. |
| 3.1.2 Taal van onderdelen | ✅ | Inhoud is uniform Nederlands; de meertalige kiezer is uitgeschakeld. (Bij heractivering `lang`-attributen op anderstalige fragmenten toevoegen.) |
| 3.2.x Voorspelbaar | ✅ | Geen context­wisseling bij focus; navigatie consistent. |
| 3.3.2 Labels/instructies | ✅ | Zoekveld heeft een gekoppeld (screenreader-)label; de sorteer-keuzelijst is gelabeld; icon-knoppen hebben `aria-label`. |
| 3.3.7 Overbodige invoer (**WCAG 2.2**) | ➖ | Geen formulieren met herhaalde invoer. |
| 3.3.8 Toegankelijke authenticatie (**WCAG 2.2**) | ➖ | Geen login. |

### 3.4 Robuust (Robust)

| Criterium | Status | Toelichting |
|---|---|---|
| 4.1.2 Naam, rol, waarde | 🟡 | Correct gebruik van `aria-haspopup`, `aria-expanded`, `aria-pressed`, combobox-rollen. `aria-modal="true"` wordt nu ondersteund door echt modaal gedrag (focus-trap + Escape, §4). |
| 4.1.3 Statusberichten | ✅ | Live-regio's bij delen, foto-teller en offline-voortgang; de GPS- en locatiemeldingen gebruiken nu een **persistente** live-regio (§4). |

## 4. Doorgevoerde verbeteringen (30 oktober 2026)

1. **Modaal gedrag voor dialogen** — nieuwe hook `lib/useModaal.ts` toegepast op
   de kaartlaag-modal, de "straten in mijn buurt"-dialog en de offline-download:
   focus verspringt bij openen naar de dialog, blijft erbinnen (focus-trap),
   **Escape** sluit, en de focus keert bij sluiten terug naar de knop die opende.
   (2.4.3, 4.1.2; de GPS- en offline-dialog reageerden eerder niet op Escape.)
2. **Zichtbare toetsenbordfocus op het zoekveld** — de onderdrukte `outline` is
   vervangen door de standaard 3 px focus-ring. (2.4.7)
3. **Kop op de fotopagina** — een (screenreader-)`h1` "Beeldmateriaal van
   {straat}" toegevoegd. (1.3.1)
4. **Contrast** — de "Sinds {jaar}"-badge is donkerrood (`#a81812`,
   ~6,6:1 i.p.v. ~4,6:1) en het jaartal op de actieve rode kaartlaag-keuze is vol
   wit (~5,3:1 i.p.v. ~4,1:1, dat laatste zat onder de norm). (1.4.3)
5. **Tikdoelen** — de "Bekijk in de beeldbank"-link (~26 px hoog) en de
   sorteer-keuzelijst ruimer gemaakt. (2.5.8)
6. **Persistente live-regio's** — de GPS-melding en de locatiemelding worden nu
   aangekondigd vanuit een regio die al vóór de wijziging bestaat. (4.1.3)

## 5. Bekende afwijkingen en aandachtspunten

| # | Punt | Criterium | Ernst | Toelichting / alternatief |
|---|---|---|---|---|
| 1 | **Kaartlijnen niet per stuk met het toetsenbord te focussen** | 2.1.1 | Bewuste keuze | De kaart gebruikt een canvas-renderer voor 1000+ lijnen; losse focusbaarheid is daarmee niet haalbaar. Het **zoekveld** (navigeren) en "toon op kaart" zijn het gelijkwaardige, toegankelijke alternatief, en dit staat in het `aria-label` van de kaartregio. WCAG staat een toegankelijk alternatief toe. |
| 2 | **Pannen binnen een ingezoomde foto** | 2.1.1 / 2.5.7 | Licht | Zoomen (+/−) en wisselen van foto zijn toetsenbordknoppen; het verschuiven binnen een sterk ingezoomd beeld leunt op sleep/pinch. Of OpenSeadragon toetsenbord-pan toestaat, is niet uit de code vast te stellen — in-browser verifiëren. |
| 3 | **Homepage zonder actieve `h1` na sluiten intro** | 1.3.1 | Licht | De `h1` "Straten van Gouda" staat in de intro-dialog; na sluiten is die `inert`. De pagina heeft wel een `<title>`. Eventueel een visueel verborgen `h1` aan de kaartweergave toevoegen. |
| 4 | **Jaartal-badge op thumbnails (wit op half-transparant)** | 1.4.3 | Zeer licht | Berekend worst-case (over een witte fotopartij) ~6,1:1 — voldoet. Over normale fotopixels ruimer. Geen actie nodig; wel afhankelijk van het beeld. |
| 5 | **Reflow 320 px / zoom 200% en `2.4.11`** | 1.4.10 / 2.4.11 | Te verifiëren | De opzet is responsief en reserveert ruimte onder de vaste balk; niet in-browser bevestigd. |
| 6 | **Bibliotheekgedrag Leaflet/OpenSeadragon** | div. | Te verifiëren | Afmeting van Leaflets zoomknoppen (default 30 px) en OSD-toetsenbordgedrag komen uit de bibliotheken, niet uit deze repo. |

## 6. Aanbevolen vervolgcontroles vóór definitieve oplevering

1. **Geautomatiseerd**: axe-core of Lighthouse-accessibility op de startpagina,
   een straatpagina en een fotopagina.
2. **Screenreader**: NVDA (Windows) en/of VoiceOver (iOS) — met name de drie
   dialogen (aankondiging van rol/naam, focus-trap, Escape) en de combobox.
3. **Toetsenbord**: volledige doorloop zonder muis, inclusief de kaart-
   alternatieven (zoeken + "toon op kaart") en de fotoviewer.
4. **Weergave**: 320 px breed en 200% zoom (reflow), en focus onder de vaste
   onderbalk (2.4.11).

Punten die daaruit komen, kunnen als laatste correctieronde vóór de lancering
worden meegenomen.
