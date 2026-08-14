#!/usr/bin/env node
/**
 * Genereert de PWA-app-iconen uit het Font Awesome "signs-post"-symbool
 * (wit symbool op het Die Goude-rood). Uitvoer: public/icons/.
 *
 * `sharp` staat BEWUST NIET in package.json: de iconen zijn al gegenereerd en
 * gecommit, en de dagelijkse build hoeft geen zware native afhankelijkheid te
 * installeren. (Her)genereren gaat eenmalig met:
 *
 *     npm i -D sharp && node scripts/genereer-iconen.mjs && npm rm sharp
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UIT = process.env.ICON_OUT ?? join(ROOT, "public", "icons");
mkdirSync(UIT, { recursive: true });

const ROOD = "#d32016";
const WIT = "#ffffff";
// Font Awesome Free 7 "signs-post" (solid), viewBox 0 0 640 640.
const GLYPH =
  "M320.4 64C302.7 64 288.4 78.3 288.4 96L288.4 128L128.4 128C110.7 128 96.4 142.3 96.4 160L96.4 224C96.4 241.7 110.7 256 128.4 256L288.4 256L288.4 320L135 320C130.8 320 126.7 321.7 123.7 324.7L75.7 372.7C69.5 378.9 69.5 389.1 75.7 395.3L123.7 443.3C126.7 446.3 130.8 448 135 448L288.4 448L288.4 544C288.4 561.7 302.7 576 320.4 576C338.1 576 352.4 561.7 352.4 544L352.4 448L512.4 448C530.1 448 544.4 433.7 544.4 416L544.4 352C544.4 334.3 530.1 320 512.4 320L352.4 320L352.4 256L505.8 256C510 256 514.1 254.3 517.1 251.3L565.1 203.3C571.3 197.1 571.3 186.9 565.1 180.7L517.1 132.7C514.1 129.7 510 128 505.8 128L352.4 128L352.4 96C352.4 78.3 338.1 64 320.4 64z";

/** Master-SVG (1024²): rood vlak + wit symbool, gecentreerd met marge `pad`. */
function master(pad) {
  const S = 1024;
  const g = 640;
  const schaal = (S * (1 - 2 * pad)) / g;
  const off = (S - g * schaal) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
      `<rect width="${S}" height="${S}" fill="${ROOD}"/>` +
      `<g transform="translate(${off} ${off}) scale(${schaal})">` +
      `<path d="${GLYPH}" fill="${WIT}"/></g></svg>`
  );
}

const iconen = [
  { naam: "icon-192.png", grootte: 192, pad: 0.2 },
  { naam: "icon-512.png", grootte: 512, pad: 0.2 },
  // Maskable: extra marge zodat het symbool binnen de "safe zone" (±80%) blijft.
  { naam: "icon-512-maskable.png", grootte: 512, pad: 0.3 },
  // iOS rondt zelf af; volvlaks rood zonder transparantie.
  { naam: "apple-touch-icon.png", grootte: 180, pad: 0.18 },
];

for (const { naam, grootte, pad } of iconen) {
  await sharp(master(pad))
    .resize(grootte, grootte)
    .png()
    .toFile(join(UIT, naam));
  console.log(`  ${naam} (${grootte}×${grootte})`);
}
console.log(`Klaar: ${iconen.length} iconen → ${UIT}`);
