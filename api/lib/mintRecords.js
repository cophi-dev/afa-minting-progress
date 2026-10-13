import { z } from 'zod';

const addressSchema = z.string().regex(/^0x[0-9a-f]{40}$/);
const hashSchema = z.string().regex(/^0x[0-9a-f]{64}$/);

export const mintRecordSchema = z.object({
  token_id: z.number().int().min(0).max(9999),
  recipient: addressSchema,
  tx_sender: addressSchema,
  block: z.number().int().nonnegative(),
  timestamp: z.number().int().nonnegative(),
  tx_hash: hashSchema,
}).strict();

export const mintRecordKey = (record) => `${record.tx_hash}:${record.token_id}`;

export const emptyMintState = () => ({ lastBlock: null, mints: {} });

export const toMintRecord = (input) => {
  const parsed = mintRecordSchema.safeParse(input);
  if (!parsed.success) {
    const error = new Error('Invalid mint record');
    error.statusCode = 500;
    throw error;
  }

  return {
    token_id: parsed.data.token_id,
    recipient: parsed.data.recipient,
    tx_sender: parsed.data.tx_sender,
    block: parsed.data.block,
    timestamp: parsed.data.timestamp,
    tx_hash: parsed.data.tx_hash,
  };
};

export const toApiMint = (record) => ({
  token_id: record.token_id,
  recipient: record.recipient,
  tx_sender: record.tx_sender,
  block: record.block,
  timestamp: record.timestamp,
  tx_hash: record.tx_hash,
});

const parseLastBlock = (value) => (
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
);

export const withDerivedLastBlock = (state) => {
  if (state.lastBlock != null) return state;
  let lastBlock = null;
  Object.values(state.mints).forEach((record) => {
    if (lastBlock == null || record.block > lastBlock) lastBlock = record.block;
  });
  return { ...state, lastBlock };
};

export const mergeMintRecords = (state, records) => {
  const mints = { ...(state?.mints ?? {}) };
  let lastBlock = state?.lastBlock ?? null;

  records.forEach((input) => {
    const record = toMintRecord(input);
    mints[mintRecordKey(record)] = record;
    if (lastBlock == null || record.block > lastBlock) lastBlock = record.block;
  });

  return { lastBlock, mints };
};

export const listRecordsFromState = (state) => Object.values(state?.mints ?? {});

export const entriesFromHash = (result) => {
  if (result == null) return [];

  if (Array.isArray(result)) {
    const entries = [];
    for (let index = 0; index < result.length; index += 2) {
      entries.push([result[index], result[index + 1]]);
    }
    return entries;
  }

  if (typeof result === 'object') return Object.entries(result);

  const error = new Error('Unexpected mint hash shape');
  error.statusCode = 500;
  throw error;
};

export const stateFromKv = (hashResult, lastBlockRaw) => {
  const mints = {};
  entriesFromHash(hashResult).forEach(([, value]) => {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const record = toMintRecord(parsed);
    mints[mintRecordKey(record)] = record;
  });

  const lastBlock = typeof lastBlockRaw === 'string' && /^\d+$/.test(lastBlockRaw)
    ? Number(lastBlockRaw)
    : parseLastBlock(lastBlockRaw);

  return withDerivedLastBlock({ lastBlock, mints });
};

export const parseStoredState = (json) => {
  const mintsInput = json?.mints ?? {};
  if (!mintsInput || typeof mintsInput !== 'object' || Array.isArray(mintsInput)) {
    const error = new Error('Mint store shape is invalid');
    error.statusCode = 500;
    throw error;
  }

  const mints = {};
  Object.values(mintsInput).forEach((value) => {
    const record = toMintRecord(value);
    mints[mintRecordKey(record)] = record;
  });

  return withDerivedLastBlock({
    lastBlock: parseLastBlock(json?.lastBlock),
    mints,
  });
};
