import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { isMinted, parseApeId } from './lib/apeState.js';
import { fetchIpfsImage } from './lib/ipfsFetch.js';

let cidsPromise = null;
const loadCids = () => {
  if (!cidsPromise) {
    cidsPromise = fs.readFile(path.join(process.cwd(), 'src', 'data', 'image_cids.json'), 'utf8')
      .then(JSON.parse);
  }
  return cidsPromise;
};

/**
 * Hi-res AFA artwork for MINTED tokens only, as a 1200px webp.
 * Fallback for mints that are not yet in public/hires. Cached at the edge for a year.
 */
export default async function handler(req, res) {
  const id = parseApeId(req.query?.tokenId);
  if (id === null) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'invalid_token_id' });
  }
  try {
    if (!(await isMinted(id))) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.status(404).json({ error: 'not_minted' });
    }
    const cid = (await loadCids())[id];
    if (!cid) throw new Error('no cid');
    const source = await fetchIpfsImage(cid);
    const webp = await sharp(source).resize(1200, 1200, { fit: 'inside' }).webp({ quality: 85 }).toBuffer();
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    return res.status(200).send(webp);
  } catch (error) {
    console.error('afa image failed', id, String(error?.message || error));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'lookup_failed' });
  }
}
