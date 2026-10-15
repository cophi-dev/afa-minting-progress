import { aggregateClicks, CLICK_PREFIX, parseClickPathname } from './lib/goLinks.js';
import { aggregateEvents, EVENT_PREFIX, parseEventPathname } from './lib/events.js';
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
    const listAll = async (prefix, parse) => {
      const out = [];
      let cursor;
      do {
        const page = await list({ prefix, cursor, limit: 1000, token });
        for (const blob of page.blobs) out.push(parse(blob.pathname));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    };
    const [clicks, events] = await Promise.all([
      listAll(CLICK_PREFIX, parseClickPathname),
      listAll(EVENT_PREFIX, parseEventPathname),
    ]);
    // Top-level fields stay as before (go-link clicks); site events are added under `events`.
    return res.status(200).json({ generatedAt: new Date().toISOString(), ...aggregateClicks(clicks), events: aggregateEvents(events) });
  } catch (error) {
    console.error('stats failed', error?.message);
    return res.status(502).json({ error: 'stats_failed' });
  }
}
