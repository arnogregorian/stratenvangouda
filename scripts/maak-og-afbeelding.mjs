// Genereert de vaste deelafbeelding (Open Graph / social share) voor pagina's
// zonder eigen foto: de startpagina en straten zonder beeldmateriaal. Een
// branded kaart (1200×630) met het beeldmerk van Die Goude en de sitetitel.
//
// Eenmalig draaien na een wijziging van tekst of beeldmerk:
//   node scripts/maak-og-afbeelding.mjs
// Schrijft public/og-standaard.png (ingecheckt in de repo, geen build-stap).
//
// Raster via sharp (al aanwezig als Next-afhankelijkheid). Het beeldmerk wordt
// als losse <svg> ingebed; de tekst gebruikt systeemfonts.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const hier = dirname(fileURLToPath(import.meta.url));
const wortel = resolve(hier, "..");

// Inner-content van het beeldmerk (zonder de <svg>-wrapper en <title>) zodat we
// het als geneste <svg> met eigen viewBox kunnen plaatsen.
const beeldmerkBron = readFileSync(
  resolve(wortel, "public/logos/die-goude-beeldmerk.svg"),
  "utf8"
);
const beeldmerkInner = beeldmerkBron
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<title>[\s\S]*?<\/title>/, "")
  .trim();

const B = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}">
  <rect width="${B}" height="${H}" fill="#f7f3ec"/>
  <rect width="${B}" height="14" fill="#d32016"/>
  <rect y="${H - 14}" width="${B}" height="14" fill="#d32016"/>

  <!-- Beeldmerk Die Goude, bovenin gecentreerd -->
  <svg x="${B / 2 - 95}" y="70" width="190" height="158" viewBox="494.22 30.38 80.17 66.77">
    ${beeldmerkInner}
  </svg>

  <text x="${B / 2}" y="360" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700" fill="#1a1a1a">
    Straten van Gouda
  </text>
  <text x="${B / 2}" y="422" text-anchor="middle"
        font-family="'Segoe UI', Arial, sans-serif" font-size="36" fill="#4a4a4a">
    De geschiedenis achter elke Goudse straatnaam
  </text>
  <text x="${B / 2}" y="548" text-anchor="middle"
        font-family="'Segoe UI', Arial, sans-serif" font-size="27" letter-spacing="1" fill="#d32016">
    Historische Vereniging Die Goude
  </text>
</svg>`;

const uit = resolve(wortel, "public/og-standaard.png");
await sharp(Buffer.from(svg)).png().toFile(uit);
console.log(`Geschreven: ${uit}`);
