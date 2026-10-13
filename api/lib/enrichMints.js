import { alchemyBatch } from './alchemy.js';
import { chunk } from './chunk.js';
import { normalizeAddress, parseQuantity } from './hex.js';
import { toMintRecord } from './mintRecords.js';

const BATCH_SIZE = 100;

export const enrichMintDrafts = async (drafts, batch = alchemyBatch) => {
  if (drafts.length === 0) return [];

  const txHashes = [...new Set(drafts.map((draft) => draft.tx_hash))];
  const senders = new Map();

  for (const group of chunk(txHashes, BATCH_SIZE)) {
    const results = await batch(group.map((hash) => ({
      method: 'eth_getTransactionByHash',
      params: [hash],
    })));

    group.forEach((hash, index) => {
      const sender = normalizeAddress(results[index]?.from);
      if (!sender) {
        const error = new Error(`Missing transaction sender for ${hash}`);
        error.statusCode = 502;
        throw error;
      }
      senders.set(hash, sender);
    });
  }

  const timestamps = new Map();
  drafts.forEach((draft) => {
    if (draft.timestamp != null) timestamps.set(draft.block, draft.timestamp);
  });

  const blocksNeeded = [...new Set(
    drafts.filter((draft) => draft.timestamp == null).map((draft) => draft.block),
  )];

  for (const group of chunk(blocksNeeded, BATCH_SIZE)) {
    const results = await batch(group.map((block) => ({
      method: 'eth_getBlockByNumber',
      params: [`0x${block.toString(16)}`, false],
    })));

    group.forEach((block, index) => {
      const timestamp = parseQuantity(results[index]?.timestamp);
      if (timestamp == null) {
        const error = new Error(`Missing block timestamp for ${block}`);
        error.statusCode = 502;
        throw error;
      }
      timestamps.set(block, timestamp);
    });
  }

  return drafts.map((draft) => toMintRecord({
    token_id: draft.token_id,
    recipient: draft.recipient,
    tx_sender: senders.get(draft.tx_hash),
    block: draft.block,
    timestamp: timestamps.get(draft.block),
    tx_hash: draft.tx_hash,
  }));
};
