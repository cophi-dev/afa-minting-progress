/**
 * Public mint snapshot from GET /api/mints.
 * The response is `{ count, minted }` where `minted` is decimal token ids.
 */
export const MINTS_API_URL = process.env.REACT_APP_MINTS_API_URL || '/api/mints';

const MAX_TOKEN_ID = 9999;

export const processMintSnapshot = (data) => {
  const minted = Array.isArray(data?.minted) ? data.minted : [];
  const statuses = new Map();

  minted.forEach((rawId) => {
    if (typeof rawId === 'string' && !/^\d+$/.test(rawId.trim())) return;

    const tokenId = typeof rawId === 'number' ? rawId : Number(String(rawId).trim());
    if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId > MAX_TOKEN_ID) return;

    statuses.set(tokenId, {
      owner: null,
      timestamp: null,
      isTransfer: false,
    });
  });

  const count = Number.isInteger(data?.count) ? data.count : statuses.size;
  return { statuses, count };
};

export const fetchMintSnapshot = async () => {
  const response = await fetch(MINTS_API_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Mint API error (${response.status})`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Mint API returned an unreadable response');
  }

  return processMintSnapshot(data);
};
