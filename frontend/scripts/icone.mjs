// Genera le icone del sito dallo stemma (SVG originale): node scripts-icone.mjs
// Usa il Chromium di Playwright per disegnare i PNG; il favicon.ico contiene un PNG 48×48.
import { chromium } from "@playwright/test";
import fs from "node:fs";

// gli stessi tracciati di lib/stemma.ts (questo script non può importare TypeScript)
const TIMBRO_SOPRA = "M8.3 4.3 35.2 1.5 36.4 2.5 10.5 36.1 8.5 34.4 5.6 7.6Z";
const TIMBRO_SOTTO = "M37.5 11.9 39.5 13.6 42.4 40.4 39.7 43.7 12.8 46.5 11.6 45.5Z";
const LAMA = "M41.4 1.4 27.9 22 6.6 46.6 20.1 26Z";

// scala: quanto è grande lo stemma dentro il quadrato (le icone «maskable» vogliono margine)
const svg = (scala, raggio) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><pattern id="r" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="3.4" fill="#f3ecdd" opacity=".16"/></pattern></defs>
<rect width="512" height="512" rx="${raggio}" fill="#0e0d10"/>
<path d="M512 0v300L210 0z" fill="url(#r)"/>
<g transform="translate(256 256) scale(${scala}) translate(-24 -24)">
<g stroke="#e0301f" stroke-width="1.6" stroke-linejoin="round" fill="#e0301f"><path d="${TIMBRO_SOPRA}"/><path d="${TIMBRO_SOTTO}"/></g>
<path d="${LAMA}" fill="#f3ecdd"/>
</g></svg>`;

fs.writeFileSync("public/icons/icon.svg", svg(8.6, 96));
const browser = await chromium.launch();
const page = await browser.newPage();
const png = async (file, size, scala, raggio) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}body{background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(scala, raggio)}`,
  );
  const buf = await page.screenshot({ omitBackground: true });
  if (file) fs.writeFileSync(file, buf);
  return buf;
};
await png("public/icons/icon-192.png", 192, 8.6, 96);
await png("public/icons/icon-512.png", 512, 8.6, 96);
await png("public/icons/icon-maskable-512.png", 512, 6.2, 0);
await png("public/icons/apple-touch-icon.png", 180, 7.6, 0);
const p48 = await png(null, 48, 9.6, 96);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt8(48, 6);
ico.writeUInt8(48, 7);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(p48.length, 14);
ico.writeUInt32LE(22, 18);
fs.writeFileSync("app/favicon.ico", Buffer.concat([ico, p48]));
await browser.close();
console.log("icone scritte");
