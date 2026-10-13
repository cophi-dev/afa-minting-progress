import { CONTRACT_ADDRESS, DEPLOY_BLOCK, ZERO_ADDRESS } from './constants.js';

export const resolveDeployBlock = (env = process.env) => {
  const raw = env.MINT_DEPLOY_BLOCK;
  if (raw == null || String(raw).trim() === '') return DEPLOY_BLOCK;

  const trimmed = String(raw).trim();
  if (!/^\d+$/.test(trimmed)) {
    const error = new Error('MINT_DEPLOY_BLOCK must be a non-negative integer');
    error.statusCode = 500;
    throw error;
  }

  return Number(trimmed);
};

/** Inclusive start. An empty store begins at the contract deploy block. */
export const resolveFromBlock = (lastBlock, deployBlock) => (
  lastBlock == null ? deployBlock : lastBlock
);

/**
 * `fromAddress` is the zero address (`0x0` as a 20-byte address). Alchemy
 * rejects the shorthand `0x0` on this method.
 */
export const buildAssetTransferQuery = ({
  fromBlock,
  pageKey,
  contractAddress = CONTRACT_ADDRESS,
}) => {
  const query = {
    fromBlock: `0x${Number(fromBlock).toString(16)}`,
    toBlock: 'latest',
    fromAddress: ZERO_ADDRESS,
    contractAddresses: [contractAddress],
    category: ['erc721'],
    excludeZeroValue: false,
    withMetadata: true,
    order: 'asc',
    maxCount: '0x3e8',
  };

  if (pageKey) query.pageKey = pageKey;
  return query;
};
