import { readFile } from 'node:fs/promises';
import path from 'node:path';

const W = 1200;
const H = 630;
let fontPromise = null;
let logoPromise = null;

const loadFont = () => {
  fontPromise ??= (async () => {
    const opentype = (await import('opentype.js')).default;
    const buf = await readFile(path.join(process.cwd(), 'api/lib/fonts/Inter-SemiBold.ttf'));
    return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  })();
  return fontPromise;
};

const loadLogo = () => {
  logoPromise ??= readFile(path.join(process.cwd(), 'public/logo-mark.png')).catch(() => null);
  return logoPromise;
};

// Glyph-by-glyph layout (avoids opentype.js GSUB features that Inter trips on).
const advance = (font, text, size) => {
  const scale = size / font.unitsPerEm;
  let w = 0;
  for (const ch of text) w += (font.charToGlyph(ch).advanceWidth || 0) * scale;
  return w;
};

const pathData = (font, text, x, y, size) => {
  const scale = size / font.unitsPerEm;
  let cx = x;
  let d = '';
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    d += glyph.getPath(cx, y, size).toPathData(2);
    cx += (glyph.advanceWidth || 0) * scale;
  }
  return d;
};

const wrap = (font, text, size, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && advance(font, next, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const textPaths = (font, lines, x, y, size, lineHeight, fill) => lines
  .map((line, i) => `<path fill="${fill}" d="${pathData(font, line, x, y + i * lineHeight, size)}"/>`)
  .join('');

/** 1200x630 PNG card: ape on the left, headline + domain on the right. */
export const renderOgCard = async ({ ape, title, subtitle, footer }) => {
  const sharp = (await import('sharp')).default;
  const font = await loadFont();
  const logo = await loadLogo();
  const textX = 640;
  const titleLines = wrap(font, title, 54, W - textX - 60).slice(0, 3);
  const subLines = wrap(font, subtitle, 26, W - textX - 60).slice(0, 3);
  const titleY = 250;
  const subY = titleY + titleLines.length * 62 + 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${textPaths(font, titleLines, textX, titleY, 54, 62, '#ffffff')}
    ${textPaths(font, subLines, textX, subY, 26, 36, 'rgba(255,255,255,0.7)')}
    ${textPaths(font, [footer], textX, 560, 24, 30, '#f5c542')}
  </svg>`;
  const apeImg = await sharp(ape).resize(510, 510, { fit: 'cover', kernel: 'cubic' }).png().toBuffer();
  const layers = [
    { input: apeImg, left: 60, top: 60 },
    { input: Buffer.from(svg), left: 0, top: 0 },
  ];
  if (logo) {
    const logoImg = await sharp(logo).resize({ height: 64 }).png().toBuffer();
    layers.push({ input: logoImg, left: textX, top: 70 });
  }
  return sharp({ create: { width: W, height: H, channels: 3, background: '#0b0b0c' } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
};
