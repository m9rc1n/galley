// Draws the extension icon as PNGs, without dependencies: a column of proof text where one line
// is partly an insertion, with a change marker in the margin.
//   node scripts/icons.mjs  → src/icons/icon{16,32,48,128}.png
// The 128 px icon follows the Chrome Web Store rule: 96 px of artwork inside 16 px of transparent padding.
// The dev build (`npm run dev`) uses the same icon with an orange accent.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

const EDGE = [74, 74, 74, 255];
const INK = [25, 25, 25, 255];
const PAPER = [255, 255, 255, 255];
export const GREEN = [63, 185, 80, 255];
export const ORANGE = [240, 138, 36, 255];

// [x, y, width, height, radius, color] in a 116×116 design space, painted in order.
const shapes = (accent) => [
  [0, 0, 116, 116, 26, EDGE], // hairline edge so the tile stays visible on dark toolbars
  [1.5, 1.5, 113, 113, 24.5, INK],
  [26, 28, 64, 12, 6, PAPER], // a line of text
  [26, 52, 24, 12, 6, PAPER], // a line that was edited: the original words…
  [56, 52, 34, 12, 6, accent], //   …and the inserted ones
  [26, 76, 46, 12, 6, PAPER], // last line of the paragraph
  [9, 50, 7, 16, 3.5, accent], // change marker in the margin
];
const DESIGN = 116;
const PADDING = { 16: 1, 32: 2, 48: 3, 128: 16 };

/** The same artwork as an SVG string, for the store graphics. */
export function iconSvg(accent = GREEN) {
  const rgb = ([r, g, b]) => `rgb(${r},${g},${b})`;
  const rects = shapes(accent)
    .map(([x, y, w, h, r, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${rgb(c)}"/>`)
    .join('');
  return `<svg viewBox="0 0 ${DESIGN} ${DESIGN}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${rects}</svg>`;
}

function inside([x, y, w, h, r], px, py) {
  const dx = Math.max(x + r - px, 0, px - (x + w - r));
  const dy = Math.max(y + r - py, 0, py - (y + h - r));
  return px >= x && px <= x + w && py >= y && py <= y + h && dx * dx + dy * dy <= r * r;
}

function render(size, SHAPES) {
  const pad = PADDING[size];
  const scale = DESIGN / (size - 2 * pad);
  const ss = size >= 128 ? 4 : 8; // supersampling per axis
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x - pad + (sx + 0.5) / ss) * scale;
          const py = (y - pad + (sy + 0.5) / ss) * scale;
          let color = null;
          for (const shape of SHAPES) if (inside(shape, px, py)) color = shape[5];
          if (!color) continue;
          const alpha = color[3] / 255;
          r += color[0] * alpha;
          g += color[1] * alpha;
          b += color[2] * alpha;
          a += alpha;
        }
      }
      const i = (y * size + x) * 4;
      if (a > 0) {
        pixels[i] = Math.round(r / a);
        pixels[i + 1] = Math.round(g / a);
        pixels[i + 2] = Math.round(b / a);
      }
      pixels[i + 3] = Math.round((a / (ss * ss)) * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Write icon16/32/48/128.png into `dir` with the given accent colour. */
export async function writeIcons(dir, accent = GREEN) {
  await mkdir(dir, { recursive: true });
  for (const size of [16, 32, 48, 128]) await writeFile(`${dir}/icon${size}.png`, png(size, render(size, shapes(accent))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeIcons(fileURLToPath(new URL('../src/icons', import.meta.url)));
  console.log('icons written to src/icons/');
}
