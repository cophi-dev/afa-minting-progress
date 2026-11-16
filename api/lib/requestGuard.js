/** Trusted site hosts for analytics blob writes (Origin / Referer). */
export const TRUSTED_HOSTS = new Set([
  'afa-mint-progress.vercel.app',
  'afa-progress.com',
  'www.afa-progress.com',
  'afa-editor.app',
  'www.afa-editor.app',
  'localhost',
  '127.0.0.1',
]);

const hostFromUrl = (value) => {
  if (!value) return null;
  try {
    const host = new URL(String(value)).hostname.toLowerCase();
    return host.startsWith('www.') ? host : host;
  } catch {
    return null;
  }
};

/** At least one of Origin or Referer must point at a trusted host. */
export const hasTrustedProvenance = (req) => {
  const originHost = hostFromUrl(req.headers?.origin);
  if (originHost && TRUSTED_HOSTS.has(originHost)) return true;
  const refererHost = hostFromUrl(req.headers?.referer);
  if (refererHost && TRUSTED_HOSTS.has(refererHost)) return true;
  return false;
};

export const clientIp = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim().slice(0, 45);
  }
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp.trim().slice(0, 45);
  return 'unknown';
};

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const buckets = new Map();

/** Simple in-process rate limit (per serverless instance). */
export const rateLimitAllows = (ip) => {
  if (!ip || ip === 'unknown') return false;
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start >= RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (now - value.start >= RATE_WINDOW_MS) buckets.delete(key);
    }
  }
  return bucket.count <= RATE_MAX;
};

export const MAX_EVENT_BODY_BYTES = 2048;

export const readBodyByteLength = (req) => {
  const body = req.body;
  if (body == null) return 0;
  if (Buffer.isBuffer(body)) return body.length;
  if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
  if (typeof body === 'object') {
    try {
      return Buffer.byteLength(JSON.stringify(body), 'utf8');
    } catch {
      return MAX_EVENT_BODY_BYTES + 1;
    }
  }
  return 0;
};