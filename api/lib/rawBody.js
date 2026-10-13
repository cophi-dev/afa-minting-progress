export const readRawBody = async (req) => {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');

  if (req.body && typeof req.body === 'object') {
    const error = new Error('Raw request body is unavailable');
    error.statusCode = 500;
    error.code = 'raw_body_unavailable';
    throw error;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};
