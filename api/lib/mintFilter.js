import { CONTRACT_ADDRESS, MAX_TOKEN_ID } from './constants.js';
import {
  isZeroAddress,
  normalizeAddress,
  normalizeTxHash,
  parseQuantity,
  parseTimestamp,
} from './hex.js';

const rawTokenId = (activity) => (
  activity.erc721TokenId
  ?? activity.tokenId
  ?? activity.log?.topics?.[3]
);

const rawBlock = (activity) => (
  activity.blockNum
  ?? activity.blockNumber
  ?? activity.log?.blockNumber
);

const rawHash = (activity) => (
  activity.hash
  ?? activity.transactionHash
  ?? activity.log?.transactionHash
);

/**
 * Keep ERC-721 mints: from the zero address (`0x0` or the 20-byte zero address)
 * and this collection. Token ids are returned as decimal numbers.
 */
export const normalizeMintActivity = (activity, contractAddress = CONTRACT_ADDRESS) => {
  if (!activity || typeof activity !== 'object') return null;
  if (activity.removed === true || activity.log?.removed === true) return null;

  const category = activity.category;
  if (category && String(category).toLowerCase() !== 'erc721') return null;
  if (!isZeroAddress(activity.fromAddress)) return null;

  const expected = String(contractAddress || '').trim().toLowerCase();
  const contract = normalizeAddress(activity.contractAddress);
  if (!contract || contract !== expected) return null;

  const recipient = normalizeAddress(activity.toAddress);
  const txHash = normalizeTxHash(rawHash(activity));
  const tokenId = parseQuantity(rawTokenId(activity));
  const block = parseQuantity(rawBlock(activity));
  if (!recipient || !txHash || tokenId == null || block == null) return null;
  if (tokenId > MAX_TOKEN_ID) return null;

  const draft = {
    token_id: tokenId,
    recipient,
    block,
    tx_hash: txHash,
  };
  const timestamp = parseTimestamp(activity.timestamp);
  if (timestamp != null) draft.timestamp = timestamp;
  return draft;
};

export const filterMintActivities = (activity, contractAddress = CONTRACT_ADDRESS) => {
  if (!Array.isArray(activity)) return [];
  return activity
    .map((item) => normalizeMintActivity(item, contractAddress))
    .filter(Boolean);
};

export const mintDraftFromTransfer = (transfer) => normalizeMintActivity({
  fromAddress: transfer?.from,
  toAddress: transfer?.to,
  contractAddress: transfer?.rawContract?.address,
  blockNum: transfer?.blockNum,
  hash: transfer?.hash,
  erc721TokenId: transfer?.tokenId ?? transfer?.erc721TokenId,
  category: transfer?.category,
  timestamp: transfer?.metadata?.blockTimestamp,
});
