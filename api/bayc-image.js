import { MAX_TOKEN_ID } from './lib/constants.js';

const BAYC_CONTRACT = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';

/** Redirects to the full-resolution BAYC original on Alchemy's NFT CDN. */
export default async function handler(req, res) {
  const tokenId = Number(req.query?.tokenId);
  if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId > MAX_TOKEN_ID) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'invalid_token_id' });
  }
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'not_configured' });
  }
  try {
    const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${key}/getNFTMetadata?contractAddress=${BAYC_CONTRACT}&tokenId=${tokenId}`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`alchemy ${response.status}`);
    const data = await response.json();
    const target = data?.image?.cachedUrl || data?.image?.pngUrl || data?.image?.originalUrl;
    if (!target) throw new Error('no image');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, immutable');
    res.setHeader('Location', target);
    return res.status(302).end();
  } catch (error) {
    console.error('bayc image lookup failed', String(error.message).replace(key, '***'));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'lookup_failed' });
  }
}
