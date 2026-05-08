// Generate PWA icons from the inline Mira SVG logo.
// Run once after install: `node scripts/gen-icons.mjs`
// Outputs:
//   public/icons/icon-192.png        (any purpose — full-bleed logo on bg)
//   public/icons/icon-512.png        (any purpose)
//   public/icons/icon-maskable-512.png  (maskable — logo at 70% in safe area)

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT  = resolve(ROOT, 'public/icons');

const BG       = '#212017';   // matches manifest background_color
const INK      = '#f7f4eb';   // light ink color from theme
const LIME     = '#dffb52';   // accent

// Logo: circle with "M" notch (matches components/ui/logo.tsx). Rendered as inline SVG.
function logoSvg({ size, ringColor = INK, fill = BG, strokeRatio = 1.5, logoScale = 1 }) {
  const cx = 12, cy = 12;
  // The viewBox is 24×24 — we scale it to the requested size.
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <rect width="24" height="24" fill="${fill}"/>
    <g transform="translate(${12 - 12 * logoScale}, ${12 - 12 * logoScale}) scale(${logoScale})">
      <circle cx="${cx}" cy="${cy}" r="10" stroke="${ringColor}" stroke-width="${strokeRatio}" fill="none"/>
      <path d="M7 16V9.5L12 14l5-4.5V16" stroke="${ringColor}" stroke-width="${strokeRatio}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </g>
  </svg>`;
}

async function render(svg, size, outFile) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  console.log(`✓ ${outFile}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // any-purpose icons — logo touches edges of viewBox
  await render(logoSvg({ size: 192, ringColor: LIME, logoScale: 1 }), 192, resolve(OUT, 'icon-192.png'));
  await render(logoSvg({ size: 512, ringColor: LIME, logoScale: 1 }), 512, resolve(OUT, 'icon-512.png'));

  // maskable — logo at 70% to stay inside the safe area
  await render(logoSvg({ size: 512, ringColor: LIME, logoScale: 0.7 }), 512, resolve(OUT, 'icon-maskable-512.png'));

  console.log('\nDone. Reload your app or rebuild for the icons to be picked up.');
}

main().catch((e) => { console.error(e); process.exit(1); });
