# Storingsmelding — `/afbeeldingen/{identifier}` geeft 404 voor álle straten

> **OPGELOST — 3 september 2026.** Verholpen in API v1.5.0
> ([commit `14ec8e3`](https://github.com/gouda-tijdmachine/api-straatnamen/commit/14ec8e32b6f4e6eabd3d78279f45fef37fae0e68)):
> de vereiste thumbnail-property was uit de RDF-export verdwenen; de thumbnail komt nu
> uit dezelfde IIIF-bron als het image-veld. De tijdelijk bevroren `data/cache.db` is
> weer uit git en de Vercel-build draait weer `npm run sync && npm run build`.
> Dit document blijft staan als naslag.

**Aan:** Richard de Jongh, Bob Coret (technisch aanspreekpunt Gouda Tijdmachine)
**Van:** Webroots B.V. (arno@webroots.nl), bouwer van StratenVanGouda.nl
**Datum:** 14 augustus 2026
**Prioriteit:** hoog — blokkeert al het beeldmateriaal op StratenVanGouda.nl

## Samenvatting

Sinds kort geeft het endpoint **`GET /afbeeldingen/{identifier}` voor iedere straat HTTP 404
`{"code":"NOT_FOUND","message":"Straat niet gevonden."}`** — óók voor straten die aantoonbaar
beeldmateriaal hebben. Het detail-endpoint `GET /straatnamen/{identifier}` werkt met exact dezelfde
identifier wél (HTTP 200). Er lijkt dus een regressie te zitten in het afbeeldingen-endpoint, niet in
de identifiers of onze aanroep.

De API-versie staat nu op **v1.4.0** (was v1.3.0 bij onze test van 18 juli). Zowel de productie- als
de development-server vertonen hetzelfde gedrag.

## Impact voor ons

Onze site haalt bij elke (dagelijkse) build de data opnieuw op. Doordat álle afbeeldingen-aanroepen
nu 404 geven, levert een verse sync **0 afbeeldingen** op en verschijnt de site zonder enig
beeldmateriaal. (We hebben inmiddels een veiligheidscontrole ingebouwd die de build in dat geval
laat falen en onze laatste goede dataset behoudt, zodat we niet stilzwijgend een beeldloze site
publiceren.)

## Reproductie

Straat mét beeld — **Markt** (`https://n2t.net/ark:/60537/bn4b0F`, had 1.454 afbeeldingen op 18 juli):

```bash
# Detail werkt (200):
curl -s -H 'Accept: application/json' \
  'https://api-straatnamen.goudatijdmachine.nl/straatnamen/https%3A%2F%2Fn2t.net%2Fark%3A%2F60537%2Fbn4b0F' | head -c 200

# Afbeeldingen faalt (404) met dezelfde identifier:
curl -s -H 'Accept: application/json' \
  'https://api-straatnamen.goudatijdmachine.nl/afbeeldingen/https%3A%2F%2Fn2t.net%2Fark%3A%2F60537%2Fbn4b0F?limit=3'
# -> {"code":"NOT_FOUND","message":"Straat niet gevonden."}
```

Dit is **niet** het bekende "404 = straat zonder beeld"-gedrag (dat we op 18 juli constateerden, o.a.
bij Boschlust). We hebben **40 straten die op 18 juli samen 2.035 afbeeldingen hadden** opnieuw
getest tegen het live endpoint:

| Meting | Resultaat |
|---|---|
| Straten getest (allen mét beeld op 18 juli) | 40 |
| Nu HTTP 404 | **40 / 40** |
| Nu HTTP 200 | 0 |
| Afbeeldingen die nu opgehaald konden worden | **0** |

Ter controle: `GET /straatnamen?limit=5` en het detail-endpoint werken normaal (200), dus de API zelf
is bereikbaar; alleen `/afbeeldingen/` is stuk. Ook de development-server
(`https://www.goudatijdmachine.nl/api-straatnamen`) geeft hetzelfde 404-gedrag.

## Vragen

1. Is dit een bekende regressie in v1.4.0, en is er zicht op herstel? Wij kunnen dan onze sync
   hervatten zodra het endpoint weer beeld teruggeeft.
2. Bestaat er een changelog / versiebeleid voor de API waarop wij kunnen bouwen (i.v.m. onze
   dagelijkse build)?

## Aandachtspunt bij herstel — gewijzigde respons in v1.4.0

Onafhankelijk van de 404 zagen we dat de OpenAPI-spec van v1.4.0 het afbeeldingen-antwoord anders
beschrijft dan v1.3.0. Graag bevestigen wat de bedoeling is, zodat we onze verwerking kloppend maken:

- **Wrapper:** de 200-respons is nu gedocumenteerd als `{ "panden": [...], "aantal": n }`, terwijl wij
  (conform v1.3.0) `{ "afbeeldingen": [...] }` uitlezen.
- **Velden per afbeelding:** het `Afbeelding`-schema in v1.4.0 bevat nog slechts
  `identifier, titel, thumbnail, vervaardiger, datering, bronorganisatie`. Verdwenen t.o.v. v1.3.0
  zijn o.a. **`image`, `iiif_info_json`, `informatie_auteursrechten` en `url`**. Wij hebben
  `iiif_info_json` nodig voor de IIIF deep-zoom-viewer (OpenSeadragon) en tonen `image`, de
  rechtenmelding en de bronlink op de fotopagina. Blijven deze velden beschikbaar?

Alvast dank — we horen graag of dit aan jullie kant opgepakt kan worden.

Met vriendelijke groet,
Webroots B.V.
