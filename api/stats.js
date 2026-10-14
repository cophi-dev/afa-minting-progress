import { aggregateClicks, CLICK_PREFIX, parseClickPathname } from './lib/goLinks.js';
import { isAuthorizedBearer } from './lib/signature.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthorizedBearer(req.headers.authorization, process.env.STATS_TOKEN)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(503).json({ error: 'not_configured' });

  try {
    const { list } = await import('@vercel/blob');
    const entries = [];
    let cursor;
    do {
      const page = await list({ prefix: CLICK_PREFIX, cursor, limit: 1000, token });
      for (const blob of page.blobs) entries.push(parseClickPathname(blob.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return res.status(200).json({ generatedAt: new Date().toISOString(), ...aggregateClicks(entries) });
  } catch (error) {
    console.error('stats failed', error?.message);
    return res.status(502).json({ error: 'stats_failed' });
  }
}
