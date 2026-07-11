// Generates simple placeholder PWA icons as real PNG files using only
// Node's built-in zlib (no image-library dependency). The design is a
// rounded warm-brown square with a simple ascending "waveform bars" glyph,
// standing in for FretCoach's own visual identity until a designed icon
// set is produced.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

const BACKGROUND = [0xb5, 0x65, 0x2c]; // matches --primary
const BAR = [0xff, 0xfa, 0xf3]; // matches --primary-foreground

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = makeTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    crc = (crc >>> 8) ^ table[c];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function buildPng(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const margin = maskable ? Math.round(size * 0.18) : Math.round(size * 0.08);
  const radius = maskable ? 0 : Math.round(size * 0.2);

  const inRoundedSquare = (x, y) => {
    if (x < margin || y < margin || x >= size - margin || y >= size - margin) return false;
    if (radius === 0) return true;
    const left = x < margin + radius;
    const right = x >= size - margin - radius;
    const top = y < margin + radius;
    const bottom = y >= size - margin - radius;
    if ((left || right) && (top || bottom)) {
      const cx = left ? margin + radius : size - margin - radius;
      const cy = top ? margin + radius : size - margin - radius;
      const dx = x - cx;
      const dy = y - cy;
      return dx * dx + dy * dy <= radius * radius;
    }
    return true;
  };

  // Five ascending bars, like a simple level meter / waveform.
  const barCount = 5;
  const contentSize = size - margin * 2;
  const barGap = Math.round(contentSize * 0.06);
  const barWidth = Math.round((contentSize - barGap * (barCount - 1)) / barCount);
  const heights = [0.35, 0.55, 0.85, 0.6, 0.4];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let [r, g, b] = BACKGROUND;
      let a = 255;

      if (inRoundedSquare(x, y)) {
        const relX = x - margin;
        const relY = y - margin;
        const barIndex = Math.floor(relX / (barWidth + barGap));
        if (barIndex >= 0 && barIndex < barCount) {
          const barStartX = barIndex * (barWidth + barGap);
          if (relX >= barStartX && relX < barStartX + barWidth) {
            const barHeight = Math.round(contentSize * heights[barIndex]);
            const barTop = contentSize - barHeight;
            if (relY >= barTop) {
              [r, g, b] = BAR;
            }
          }
        }
      } else if (!maskable) {
        a = 0;
      }

      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }

  // Raw scanlines with filter-type byte 0 prefix per row.
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "maskable-512.png", size: 512, maskable: true },
];

for (const target of targets) {
  const png = buildPng(target.size, { maskable: target.maskable });
  writeFileSync(join(OUT_DIR, target.name), png);
  console.log(`Wrote ${target.name} (${target.size}x${target.size}, ${png.length} bytes)`);
}
