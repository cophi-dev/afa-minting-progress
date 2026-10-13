import { loadMintStatus } from '../lib/mintStatus.js';

const CACHE_CONTROL = 'public, max-age=15, s-maxage=30, stale-while-revalidate=45';

export default async function handler(_req, res) {
  try {
    const body = await loadMintStatus();
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(body);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(error.statusCode || 502).json({
      error: error.message || 'Mint status failed',
    });
  }
}
