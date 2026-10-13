import { alchemyCall } from './alchemy';
import { buildAssetTransferQuery, resolveDeployBlock, resolveFromBlock } from './backfillPlan';
import { enrichMintDrafts } from './enrichMints';
import { mintDraftFromTransfer } from './mintFilter';
import { readMintState, upsertMintRecords } from './mintStore';

const MAX_PAGES = 20;

export const runMintBackfill = async ({
  readState = readMintState,
  upsert = upsertMintRecords,
  call = alchemyCall,
  enrich = enrichMintDrafts,
  env = process.env,
} = {}) => {
  const deployBlock = resolveDeployBlock(env);
  const state = await readState();
  const fromBlock = resolveFromBlock(state.lastBlock, deployBlock);
  let pageKey = '';
  let pages = 0;
  let stored = 0;
  let lastBlock = state.lastBlock;

  while (pages < MAX_PAGES) {
    const result = await call('alchemy_getAssetTransfers', [
      buildAssetTransferQuery({ fromBlock, pageKey }),
    ]);

    if (!result || !Array.isArray(result.transfers)) {
      const error = new Error('Alchemy asset transfer response was empty');
      error.statusCode = 502;
      throw error;
    }

    const drafts = result.transfers.map(mintDraftFromTransfer).filter(Boolean);
    const records = await enrich(drafts);
    if (records.length) {
      const next = await upsert(records);
      stored += records.length;
      lastBlock = next.lastBlock;
    }

    pages += 1;
    pageKey = typeof result.pageKey === 'string' ? result.pageKey : '';
    if (!pageKey) break;
  }

  return {
    from_block: fromBlock,
    stored,
    pages,
    last_block: lastBlock,
    done: !pageKey,
  };
};
