import { BLOB_PATHNAME, KV_HASH_KEY, KV_LAST_BLOCK_KEY } from './constants.js';
import { chunk } from './chunk.js';
import {
  emptyMintState,
  mergeMintRecords,
  mintRecordKey,
  parseStoredState,
  stateFromKv,
  toMintRecord,
} from './mintRecords.js';

const storeError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getStoreKind = (env = process.env) => {
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return 'kv';
  if (env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return null;
};

const requireStore = (env) => {
  const kind = getStoreKind(env);
  if (!kind) throw storeError('Mint store is not configured', 503);
  return kind;
};

const kvEndpoint = (env) => env.KV_REST_API_URL.replace(/\/$/, '');

const kvPipeline = async (commands, env = process.env) => {
  if (commands.length === 0) return [];

  let response;
  try {
    response = await fetch(`${kvEndpoint(env)}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });
  } catch {
    throw storeError('Mint store request failed', 502);
  }

  if (!response.ok) throw storeError(`Mint store HTTP ${response.status}`, 502);

  let data;
  try {
    data = await response.json();
  } catch {
    throw storeError('Mint store returned invalid JSON', 502);
  }

  if (!Array.isArray(data)) throw storeError('Mint store returned an unexpected response', 502);

  return data.map((entry) => {
    if (entry?.error) throw storeError('Mint store command failed', 502);
    return entry.result;
  });
};

const readKv = async (env) => {
  const [hash, lastBlock] = await kvPipeline([
    ['HGETALL', KV_HASH_KEY],
    ['GET', KV_LAST_BLOCK_KEY],
  ], env);

  try {
    return stateFromKv(hash, lastBlock);
  } catch {
    throw storeError('Mint store read failed', 500);
  }
};

const upsertKv = async (records, env) => {
  const current = await readKv(env);
  const next = mergeMintRecords(current, records);
  const commands = records.map((record) => {
    const parsed = toMintRecord(record);
    const key = mintRecordKey(parsed);
    return ['HSET', KV_HASH_KEY, key, JSON.stringify(next.mints[key])];
  });

  if (next.lastBlock != null) {
    commands.push(['SET', KV_LAST_BLOCK_KEY, String(next.lastBlock)]);
  }

  for (const group of chunk(commands, 50)) {
    await kvPipeline(group, env);
  }

  return next;
};

const readBlobState = async (env) => {
  const { get, BlobNotFoundError } = await import('@vercel/blob');

  try {
    const result = await get(BLOB_PATHNAME, {
      access: 'private',
      token: env.BLOB_READ_WRITE_TOKEN,
      useCache: false,
    });

    if (!result || result.statusCode !== 200 || !result.stream) return emptyMintState();

    const text = await new Response(result.stream).text();
    return parseStoredState(JSON.parse(text));
  } catch (error) {
    if (error instanceof BlobNotFoundError || error?.name === 'BlobNotFoundError') {
      return emptyMintState();
    }
    if (error?.statusCode) throw error;
    throw storeError('Mint blob read failed', 502);
  }
};

const writeBlobState = async (state, env) => {
  const { put } = await import('@vercel/blob');
  await put(BLOB_PATHNAME, JSON.stringify(state), {
    access: 'private',
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
};

const upsertBlob = async (records, env) => {
  const current = await readBlobState(env);
  const next = mergeMintRecords(current, records);
  try {
    await writeBlobState(next, env);
  } catch (error) {
    if (error?.statusCode) throw error;
    throw storeError('Mint blob write failed', 502);
  }
  return next;
};

export const readMintState = async (env = process.env) => {
  const kind = requireStore(env);
  return kind === 'kv' ? readKv(env) : readBlobState(env);
};

export const listMintRecords = async (env = process.env) => {
  const state = await readMintState(env);
  return Object.values(state.mints);
};

export const upsertMintRecords = async (records, env = process.env) => {
  if (!records.length) return readMintState(env);
  const kind = requireStore(env);
  return kind === 'kv' ? upsertKv(records, env) : upsertBlob(records, env);
};
