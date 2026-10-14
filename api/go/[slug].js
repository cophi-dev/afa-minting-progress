import { buildTargetUrl, clickPathname, parseSlug, parseTarget } from '../lib/goLinks.js';

const BOT_UA = /bot|crawler|spider|preview|facebookexternalhit|slurp|discord|telegram|whatsapp/i;

const logClick = async (slug, target, req) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
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

const refererHost = (value) => {
  try { return value ? new URL(String(value)).host.slice(0, 100) || null : null; } catch { return null; }
};

export default async function handler(req, res) {
  const slug = parseSlug(req.query?.slug);
  const target = parseTarget(req.query?.to ?? 'mint');
  res.setHeader('Cache-Control', 'no-store');
  if (!slug || !target) {
    return res.status(400).json({ error: 'invalid_link' });
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
