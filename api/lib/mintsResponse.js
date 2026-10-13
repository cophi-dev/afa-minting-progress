import { PRIVATE_CACHE_CONTROL, PUBLIC_CACHE_CONTROL } from './constants';
import { toApiMint } from './mintRecords';

export const parseSinceBlock = (value) => {
  if (value == null || value === '') return { ok: true, sinceBlock: null };

  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return { ok: false };

  const sinceBlock = Number(raw);
  if (!Number.isSafeInteger(sinceBlock)) return { ok: false };
  return { ok: true, sinceBlock };
};

const uniqueMintedIds = (records) => [...new Set(records.map((record) => record.token_id))]
  .sort((left, right) => left - right);

const compareMints = (left, right) => (
  left.block - right.block
  || left.token_id - right.token_id
  || (left.tx_hash < right.tx_hash ? -1 : left.tx_hash > right.tx_hash ? 1 : 0)
);

export const buildMintsResponse = (records, { sinceBlock, authorized }) => {
  if (sinceBlock == null) {
    const minted = uniqueMintedIds(records);
    return {
      status: 200,
      cacheControl: PUBLIC_CACHE_CONTROL,
      body: { count: minted.length, minted },
    };
  }

  if (!authorized) {
    return {
      status: 401,
      cacheControl: 'no-store',
      body: { error: 'unauthorized' },
    };
  }

  const mints = records
    .filter((record) => record.block > sinceBlock)
    .map(toApiMint)
    .sort(compareMints);

  return {
    status: 200,
    cacheControl: PRIVATE_CACHE_CONTROL,
    body: { mints },
  };
};
