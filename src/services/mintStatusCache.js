import { MINT_STATUS_CACHE_KEY } from '../constants/appCache';

let fetchPromise = null;

export const buildLatestMints = (statuses) =>
  Array.from(statuses.entries())
    .filter(([, data]) => Number.isFinite(data?.timestamp))
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .map(([tokenId, data]) => ({
      tokenId,
      timestamp: data.timestamp,
      owner: data.owner,
      isTransfer: Boolean(data.isTransfer),
    }));

export const normalizeMintStatusPayload = (data) => {
  if (!data || !Array.isArray(data.entries)) {
    throw new Error('Unexpected mint status response');
  }

  const statuses = new Map(
    data.entries.map(([tokenId, row]) => [Number(tokenId), {
      owner: row?.owner ?? null,
      timestamp: Number(row?.timestamp) || 0,
      isTransfer: Boolean(row?.isTransfer),
    }])
  );

  return {
    statuses,
    latestMints: buildLatestMints(statuses),
    mintedCount: Number.isFinite(data.mintedCount) ? data.mintedCount : statuses.size,
  };
};

export const loadMintCache = () => {
  try {
    const raw = localStorage.getItem(MINT_STATUS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.entries)) return null;

    const statuses = new Map(
      parsed.entries.map(([tokenId, row]) => [Number(tokenId), row])
    );

    return {
      statuses,
      latestMints: Array.isArray(parsed.latestMints)
        ? parsed.latestMints
        : buildLatestMints(statuses),
      mintedCount: Number.isFinite(parsed.mintedCount) ? parsed.mintedCount : statuses.size,
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    return null;
  }
};

const saveMintCache = (statuses, latestMints, mintedCount) => {
  try {
    localStorage.setItem(
      MINT_STATUS_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        mintedCount,
        entries: Array.from(statuses.entries()),
        latestMints,
      })
    );
  } catch {
    // Quota exceeded or private browsing — ignore.
  }
};

const fetchMintStatus = async () => {
  const response = await fetch('/api/mint-status');
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Mint status failed (${response.status})`);
  }

  const snapshot = normalizeMintStatusPayload(data);
  saveMintCache(snapshot.statuses, snapshot.latestMints, snapshot.mintedCount);
  return snapshot;
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
