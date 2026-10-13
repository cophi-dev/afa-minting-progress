import { enrichMintDrafts } from './lib/enrichMints.js';
import { filterMintActivities } from './lib/mintFilter.js';
import { upsertMintRecords } from './lib/mintStore.js';
import { readRawBody } from './lib/rawBody.js';
import { redactSecrets } from './lib/redact.js';
import { verifyAlchemySignature } from './lib/signature.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const send = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return send(res, 500, { error: 'signing_key_not_configured' });

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['x-alchemy-signature'];
    if (typeof signature !== 'string' || !verifyAlchemySignature(rawBody, signature, signingKey)) {
      return send(res, 401, { error: 'invalid_signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return send(res, 400, { error: 'invalid_json' });
    }

    if (payload?.event?.network && payload.event.network !== 'ETH_MAINNET') {
      return send(res, 200, { ok: true, stored: 0 });
    }

    const drafts = filterMintActivities(payload?.event?.activity);
    if (drafts.length === 0) return send(res, 200, { ok: true, stored: 0 });

    const records = await enrichMintDrafts(drafts);
    await upsertMintRecords(records);
    return send(res, 200, { ok: true, stored: records.length });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('alchemy webhook failed', redactSecrets(error.message));
    }
    return send(res, status, { error: error.code || 'webhook_failed' });
  }
}
