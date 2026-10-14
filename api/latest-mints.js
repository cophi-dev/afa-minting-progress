import { listMintRecords } from './lib/mintStore.js';
import { PUBLIC_CACHE_CONTROL } from './lib/constants.js';

/** Public: last N mints without wallet addresses. */
export default async function handler(req, res) {
  const limit = Math.min(Math.max(Number(req.query?.limit) || 8, 1), 24);
  try {
    const records = await listMintRecords();
    const seen = new Set();
    const latest = records
      .slice()
      .sort((a, b) => b.block - a.block || b.token_id - a.token_id)
      .filter((r) => (seen.has(r.token_id) ? false : seen.add(r.token_id)))
      .slice(0, limit)
      .map((r) => ({
        token_id: r.token_id,
        timestamp: r.timestamp,
        is_gift: r.recipient.toLowerCase() !== r.tx_sender.toLowerCase(),
      }));
    res.setHeader('Cache-Control', PUBLIC_CACHE_CONTROL);
    return res.status(200).json({ latest });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(error.statusCode || 500).json({ error: 'latest_failed' });
  }
}
