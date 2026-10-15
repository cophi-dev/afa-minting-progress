import { eventPathname, parseEvent } from './lib/events.js';

const BOT_UA = /bot|crawler|spider|preview|facebookexternalhit|slurp|discord|telegram|whatsapp|headless/i;
const ALLOWED_ORIGINS = new Set(['https://afa-editor.app', 'https://www.afa-editor.app', 'https://afa-mint-progress.vercel.app']);

const readBody = (req) => {
  const body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try { return JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : String(body || '')); } catch { return null; }
};

/**
 * POST /api/event (sendBeacon, text/plain → no CORS preflight). Always 204 so clients never wait or retry.
 * Stores only site/event/label + timestamp. No IP, user agent, cookie or referrer is written.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(204).end();
  if (BOT_UA.test(String(req.headers['user-agent'] || ''))) return res.status(204).end();

  const event = parseEvent(readBody(req));
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (event && token) {
    try {
      const { put } = await import('@vercel/blob');
      await Promise.race([
        put(eventPathname(event), '{}', { access: 'private', token, addRandomSuffix: false, contentType: 'application/json' }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch (error) {
      console.error('event log failed', error?.message);
    }
  }
  return res.status(204).end();
}
