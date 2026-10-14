import { listMintRecords } from './lib/mintStore.js';
import { buildMintsResponse, parseSinceBlock } from './lib/mintsResponse.js';
import { redactSecrets } from './lib/redact.js';
import { isAuthorizedBearer } from './lib/signature.js';

const send = (res, status, body, cacheControl) => {
  res.setHeader('Cache-Control', cacheControl);
  return res.status(status).json(body);
};

const CORS_ORIGINS = new Set(['https://afa-editor.app', 'https://www.afa-editor.app']);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'method_not_allowed' }, 'no-store');
  }

  const parsed = parseSinceBlock(req.query?.since_block);
  if (!parsed.ok) return send(res, 400, { error: 'invalid_since_block' }, 'no-store');

  if (parsed.sinceBlock != null) res.setHeader('Vary', 'Origin, Authorization');

  const authorized = isAuthorizedBearer(
    req.headers.authorization,
    process.env.MINTS_SYNC_TOKEN,
  );

  if (parsed.sinceBlock != null && !authorized) {
    return send(res, 401, { error: 'unauthorized' }, 'no-store');
  }

  try {
    const records = await listMintRecords();
    const result = buildMintsResponse(records, {
      sinceBlock: parsed.sinceBlock,
      authorized,
    });
    return send(res, result.status, result.body, result.cacheControl);
  } catch (error) {
    console.error('mint read failed', redactSecrets(error.message));
    return send(res, error.statusCode || 500, { error: 'mint_read_failed' }, 'no-store');
  }
}
