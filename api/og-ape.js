import { blurAfa } from './blur-preview.js';
import { apeCopy, isMinted, parseApeId } from './lib/apeState.js';
import { renderOgCard } from './lib/ogCard.js';

export default async function handler(req, res) {
  const id = parseApeId(req.query?.id);
  if (id == null) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'invalid_id' });
  }
  try {
    const minted = await isMinted(id);
    const host = 'afa-mint-progress.vercel.app'; // static assets; also works behind preview protection
    let ape;
    if (minted) {
      const isImage = (r) => r.ok && (r.headers.get('content-type') || '').startsWith('image/');
      let source = await fetch(`https://${host}/hires/${id}.webp`);
      if (!isImage(source)) source = await fetch(`https://${host}/images/${id}.webp`);
      if (!isImage(source)) throw new Error(`source ${source.status}`);
      ape = Buffer.from(await source.arrayBuffer());
    } else {
      const source = await fetch(`https://${host}/images/${id}.webp`);
      if (!source.ok) throw new Error(`source ${source.status}`);
      ape = await blurAfa(Buffer.from(await source.arrayBuffer()), id, 'medium', // Large cards read blurrier than the small modal tile; 0.6 makes the
      // 510px card look like 'medium' at its displayed size.
      { size: 510, format: 'png', blurScale: 0.6 });
    }
    const { title, subtitle } = apeCopy(id, minted);
    const png = await renderOgCard({ ape, title, subtitle, footer: 'afa-mint-progress.vercel.app' });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', minted
      ? 'public, max-age=3600, s-maxage=604800'
      : 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(png);
  } catch (error) {
    console.error('og ape failed', error?.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'og_failed' });
  }
}
