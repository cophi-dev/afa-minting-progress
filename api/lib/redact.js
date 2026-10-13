export const redactSecrets = (message) => String(message)
  .replace(/\/v2\/[A-Za-z0-9_-]+/g, '/v2/[redacted]')
  .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
