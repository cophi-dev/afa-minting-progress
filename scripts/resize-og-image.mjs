import path from 'node:path';
import sharp from 'sharp';

const src = path.join(process.cwd(), 'public', 'og-image.jpg');
const targetW = 1200;
const targetH = 630;

await sharp(src)
  .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(`${src}.tmp`);

import fs from 'node:fs';
fs.renameSync(`${src}.tmp`, src);
console.log(`Resized ${src} to ${targetW}x${targetH}`);