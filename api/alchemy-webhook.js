import { enrichMintDrafts } from './lib/enrichMints.js';
import { filterMintActivities } from './lib/mintFilter.js';
import { upsertMintRecords } from './lib/mintStore.js';
import { readRawBody, readRequestHeader } from './lib/rawBody.js';
import { redactSecrets } from './lib/redact.js';
import { verifyAlchemySignature } from './lib/signature.js';

const jsonResponse = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  },
});

export const handleAlchemyWebhook = async (req) => {
  if ((req.method || 'GET') !== 'POST') {
    return {
      status: 405,
      body: { error: 'method_not_allowed' },
      headers: { allow: 'POST' },
    };
  }

  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    return { status: 500, body: { error: 'signing_key_not_configured' } };
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = readRequestHeader(req, 'x-alchemy-signature');
    if (typeof signature !== 'string' || !verifyAlchemySignature(rawBody, signature, signingKey)) {
      return { status: 401, body: { error: 'invalid_signature' } };
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return { status: 400, body: { error: 'invalid_json' } };
    }

    if (payload?.event?.network && payload.event.network !== 'ETH_MAINNET') {
      return { status: 200, body: { ok: true, stored: 0 } };
    }

    const drafts = filterMintActivities(payload?.event?.activity);
    if (drafts.length === 0) return { status: 200, body: { ok: true, stored: 0 } };

    const records = await enrichMintDrafts(drafts);
    await upsertMintRecords(records);
    return { status: 200, body: { ok: true, stored: records.length } };
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) {
      console.error('alchemy webhook failed', redactSecrets(error.message));
    }
    return { status, body: { error: error.code || 'webhook_failed' } };
  }
};

const toResponse = ({ status, body, headers }) => jsonResponse(status, body, headers);

export async function POST(request) {
  return toResponse(await handleAlchemyWebhook(request));
}

export default {
  async fetch(request) {
    return toResponse(await handleAlchemyWebhook(request));
  },
};
