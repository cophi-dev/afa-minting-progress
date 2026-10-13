import { redactSecrets } from './redact.js';

export const getAlchemyRpcUrl = (env = process.env) => {
  const explicit = env.ALCHEMY_RPC_URL?.trim();
  if (explicit) return explicit;

  const key = env.ALCHEMY_API_KEY?.trim();
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  return '';
};

const rpcError = (message, statusCode) => {
  const error = new Error(redactSecrets(message));
  error.statusCode = statusCode;
  return error;
};

export const alchemyBatch = async (calls, env = process.env) => {
  if (calls.length === 0) return [];

  const url = getAlchemyRpcUrl(env);
  if (!url) throw rpcError('Alchemy RPC is not configured', 500);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(calls.map((call, id) => ({
        jsonrpc: '2.0',
        id,
        method: call.method,
        params: call.params,
      }))),
    });
  } catch {
    throw rpcError('Alchemy RPC request failed', 502);
  }

  if (!response.ok) throw rpcError(`Alchemy HTTP ${response.status}`, 502);

  let body;
  try {
    body = await response.json();
  } catch {
    throw rpcError('Alchemy RPC returned invalid JSON', 502);
  }

  const results = Array.isArray(body) ? body : [body];
  const byId = new Map(results.map((entry) => [entry.id, entry]));

  return calls.map((_, id) => {
    const entry = byId.get(id);
    if (!entry || entry.error) {
      throw rpcError(entry?.error?.message || 'Alchemy RPC error', 502);
    }
    return entry.result;
  });
};

export const alchemyCall = async (method, params, env = process.env) => {
  const [result] = await alchemyBatch([{ method, params }], env);
  return result;
};
