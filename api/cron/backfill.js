import { runMintBackfill } from '../lib/backfill';
import { redactSecrets } from '../lib/redact';
import { isAuthorizedBearer } from '../lib/signature';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!isAuthorizedBearer(req.headers.authorization, process.env.CRON_SECRET)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const result = await runMintBackfill();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('mint backfill failed', redactSecrets(error.message));
    return res.status(error.statusCode || 500).json({ error: 'backfill_failed' });
  }
}
