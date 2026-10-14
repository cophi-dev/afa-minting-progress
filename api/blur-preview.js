import { listMintRecords } from './lib/mintStore.js';
import { MAX_TOKEN_ID } from './lib/constants.js';

const OUT = 128;

/**
 * Heavily blurred, low-res AFA preview for an unminted token.
 * The sharp source never leaves the server: we downsample to 12px,
 * upscale to 128px, Gaussian-blur and add noise before encoding.
 */
export const blurAfa = async (input, seed = 1) => {
  const sharp = (await import('sharp')).default;
  const tiny = await sharp(input).resize(12, 12, { fit: 'cover' }).removeAlpha().raw().toBuffer();
  const noise = Buffer.alloc(OUT * OUT * 3);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < noise.length; i += 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    noise[i] = 110 + (s >>> 24) % 36;
  }
  const noiseLayer = await sharp(noise, { raw: { width: OUT, height: OUT, channels: 3 } }).png().toBuffer();
  return sharp(tiny, { raw: { width: 12, height: 12, channels: 3 } })
    .resize(OUT, OUT, { kernel: 'cubic' })
    .blur(7)
    .composite([{ input: noiseLayer, blend: 'soft-light' }])
    .webp({ quality: 55 })
    .toBuffer();
};

export default async function handler(req, res) {
  const raw = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  const id = /^\d{1,4}$/.test(String(raw ?? '')) ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id < 0 || id > MAX_TOKEN_ID) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'invalid_id' });
  }

  try {
    const records = await listMintRecords();
    if (records.some((r) => r.token_id === id)) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      return res.status(409).json({ minted: true, tokenId: id });
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const source = await fetch(`https://${host}/images/${id}.webp`);
    if (!source.ok) throw new Error(`source ${source.status}`);
    const blurred = await blurAfa(Buffer.from(await source.arrayBuffer()), id + 7);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    return res.status(200).send(blurred);
  } catch (error) {
    console.error('blur preview failed', error?.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'blur_failed' });
  }
}
