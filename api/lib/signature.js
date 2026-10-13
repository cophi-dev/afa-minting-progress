import crypto from 'crypto';

const safeEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Alchemy signs the raw request body with HMAC-SHA256 and sends the hex digest
 * in `X-Alchemy-Signature`.
 */
export const verifyAlchemySignature = (rawBody, signature, signingKey) => {
  if (typeof signingKey !== 'string' || signingKey.length === 0) return false;
  if (typeof signature !== 'string') return false;

  const provided = signature.trim().toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const digest = crypto.createHmac('sha256', signingKey).update(body).digest('hex');
  return safeEqual(digest, provided);
};

export const isAuthorizedBearer = (headerValue, secret) => {
  if (typeof headerValue !== 'string' || typeof secret !== 'string' || secret.length === 0) {
    return false;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(headerValue.trim());
  if (!match) return false;
  return safeEqual(match[1], secret);
};
