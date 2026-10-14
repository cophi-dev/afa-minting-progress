import { listMintRecords } from './lib/mintStore.js';
import { MAX_TOKEN_ID } from './lib/constants.js';

const OUT = 128;

/**
 * Heavily blurred, low-res AFA preview for an unminted token.
 * The sharp source never leaves the server: we downsample to 12px,
 * upscale to 128px, Gaussian-blur and add noise before encoding.
 */
export const BLUR_LEVELS = {
  heavy: { base: 12, sigma: 7, noise: 36 },
  strong: { base: 24, sigma: 4, noise: 28 },
  medium: { base: 32, sigma: 2.6, noise: 22 },
  light: { base: 48, sigma: 2, noise: 18 },
  faint: { base: 64, sigma: 1.4, noise: 14 },
};
export const DEFAULT_BLUR = 'medium';

/**
 * Low-res, blurred AFA preview. Silhouette, colours and gaze stay readable;
 * details do not. Output is always 128px.
 */
export const blurAfa = async (input, seed = 1, level = DEFAULT_BLUR) => {
  const { base, sigma, noise: amp } = BLUR_LEVELS[level] ?? BLUR_LEVELS[DEFAULT_BLUR];
  const sharp = (await import('sharp')).default;
  const tiny = await sharp(input).resize(base, base, { fit: 'cover' }).removeAlpha().raw().toBuffer();
  const noise = Buffer.alloc(OUT * OUT * 3);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < noise.length; i += 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    noise[i] = 128 - (amp >> 1) + ((s >>> 24) % amp);
  }
  const noiseLayer = await sharp(noise, { raw: { width: OUT, height: OUT, channels: 3 } }).png().toBuffer();
  return sharp(tiny, { raw: { width: base, height: base, channels: 3 } })
    .resize(OUT, OUT, { kernel: 'cubic' })
    .blur(sigma * (OUT / base) / 2)
    .composite([{ input: noiseLayer, blend: 'soft-light' }])
    .webp({ quality: 60 })
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
