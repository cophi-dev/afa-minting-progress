import {
  buildTargetUrl,
  clickPathname,
  GO_TARGETS,
  parseSlug,
  slugAllowsClickLog,
  targetForSlug,
} from '../lib/goLinks.js';
import { clientIp, hasTrustedProvenance, rateLimitAllows } from '../lib/requestGuard.js';

const BOT_UA = /bot|crawler|spider|preview|facebookexternalhit|slurp|discord|telegram|whatsapp/i;
const FALLBACK_REDIRECT = GO_TARGETS.mint;

const refererHost = (value) => {
  try { return value ? new URL(String(value)).host.slice(0, 100) || null : null; } catch { return null; }
};

const logClick = async (slug, target, req) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  if (!slugAllowsClickLog(slug)) return;
  if (!hasTrustedProvenance(req)) return;
  if (!rateLimitAllows(clientIp(req))) return;
  const ua = String(req.headers['user-agent'] || '');
  if (BOT_UA.test(ua)) return;
  const { put } = await import('@vercel/blob');
  await put(clickPathname(slug, target), JSON.stringify({
    slug,
    target,
    ts: Date.now(),
    country: req.headers['x-vercel-ip-country'] || null,
    referer: refererHost(req.headers.referer),
  }), {
    access: 'private',
    token,
    addRandomSuffix: false,
    contentType: 'application/json',
  });
};

export default async function handler(req, res) {
  const slug = parseSlug(req.query?.slug);
  res.setHeader('Cache-Control', 'no-store');

  if (!slug) {
    res.setHeader('Location', FALLBACK_REDIRECT);
    return res.status(302).end();
  }

  const target = targetForSlug(slug);
  if (!target) {
    res.setHeader('Location', FALLBACK_REDIRECT);
    return res.status(302).end();
  }

  try {
    await Promise.race([
      logClick(slug, target, req),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch (error) {
    console.error('click log failed', error?.message);
  }

  res.setHeader('Location', buildTargetUrl(target, slug));
  return res.status(302).end();
}