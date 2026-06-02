import { getAllTransactions, processNFTStatuses } from './etherscanService';
import { MINT_STATUS_CACHE_KEY } from '../constants/appCache';

let fetchPromise = null;

const buildLatestMints = (statuses) =>
  Array.from(statuses.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .map(([tokenId, data]) => ({
      tokenId,
      timestamp: data.timestamp,
      owner: data.owner,
      isTransfer: Boolean(data.isTransfer),
    }));

export const loadMintCache = () => {
  try {
    const raw = localStorage.getItem(MINT_STATUS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.entries)) return null;

    const statuses = new Map(
      parsed.entries.map(([tokenId, data]) => [Number(tokenId), data])
    );

    return {
      statuses,
      latestMints: buildLatestMints(statuses),
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    return null;
  }
};

const saveMintCache = (statuses, latestMints) => {
  try {
    localStorage.setItem(
      MINT_STATUS_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        entries: Array.from(statuses.entries()),
        latestMints,
      })
    );
  } catch {
    // Quota exceeded or private browsing — ignore.
  }
};

const fetchMintStatus = async () => {
  const transactions = await getAllTransactions();
  const statuses = processNFTStatuses(transactions);
  const latestMints = buildLatestMints(statuses);
  saveMintCache(statuses, latestMints);
  return { statuses, latestMints };
};

export const prefetchMintStatus = () => {
  if (!fetchPromise) {
    fetchPromise = fetchMintStatus().finally(() => {
      fetchPromise = null;
    });
  }
  return fetchPromise;
};

export const refreshMintStatus = async () => {
  fetchPromise = null;
  return prefetchMintStatus();
};
