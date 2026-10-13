const isWebRequest = (req) => req != null
  && typeof req.text === 'function'
  && typeof req.headers?.get === 'function';

/**
 * Bytes Alchemy signed. Never read `req.body`: on Vercel's Node runtime that
 * getter parses JSON and consumes the stream, and `export const config` does
 * not disable it outside Next.js.
 */
export const readRawBody = async (req) => {
  if (isWebRequest(req)) {
    return Buffer.from(await req.text(), 'utf8');
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const readRequestHeader = (req, name) => {
  const headers = req?.headers;
  if (headers && typeof headers.get === 'function') return headers.get(name);
  if (!headers) return undefined;
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};
