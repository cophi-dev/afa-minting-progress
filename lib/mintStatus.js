/**
 * Server-side AFA mint reads. The Etherscan key stays in ETHERSCAN_API_KEY
 * and is never sent to the browser.
 */

export const CONTRACT_ADDRESS = '0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7';
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
// Etherscan's free tier returns at most 1,000 rows per request (since 2026-07-01).
export const PAGE_SIZE = 1000;
export const MAX_PAGES = 40;
export const CACHE_TTL_MS = 30_000;

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const TOTAL_SUPPLY_DATA = '0x18160ddd';
const CHAIN_ID = '1';

const DEFAULT_RPC_URLS = [
  'https://eth.drpc.org',
  'https://rpc.mevblocker.io',
  'https://ethereum.publicnode.com',
];

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export class MintStatusError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'MintStatusError';
    this.statusCode = statusCode;
  }
}

const isZeroAddress = (value) => {
  const from = value?.toLowerCase?.();
  return from === ZERO_ADDRESS || from === '0x0';
};

/** True when the tx is a mint (from zero address), not a secondary transfer. */
export const isMintTransaction = (tx) => isZeroAddress(tx?.from);

export const parseTotalSupply = (hex) => {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) {
    throw new MintStatusError('Unexpected totalSupply result');
  }
  const value = Number(BigInt(hex));
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MintStatusError('Invalid totalSupply');
  }
  return value;
};

/**
 * Headline count comes from totalSupply(). If that call fails, or returns 0
 * while transfers already show mints, fall back to the unique token count.
 */
export const resolveMintedCount = (supply, statusCount) => {
  if (!Number.isFinite(supply)) return statusCount;
  if (supply === 0 && statusCount > 0) return statusCount;
  return supply;
};

const transferKey = (tx) => [
  tx.hash,
  tx.tokenID,
  tx.transactionIndex ?? '',
  tx.from,
  tx.to,
  tx.timeStamp,
].join('|');

export const processNFTStatuses = (transactions) => {
  const nftStatuses = new Map();
  const ordered = [...transactions].sort(
    (a, b) => (Number(a?.timeStamp) || 0) - (Number(b?.timeStamp) || 0)
  );

  ordered.forEach((tx) => {
    if (tx?.tokenID == null || tx.tokenID === '') return;

    const tokenId = parseInt(tx.tokenID, 10);
    if (!Number.isFinite(tokenId)) return;

    const timestamp = parseInt(tx.timeStamp, 10);
    const existing = nftStatuses.get(tokenId);
    if (existing && timestamp < existing.timestamp) return;

    if (isZeroAddress(tx.to)) {
      nftStatuses.delete(tokenId);
      return;
    }

    nftStatuses.set(tokenId, {
      owner: tx.to,
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
      isTransfer: !isMintTransaction(tx),
    });
  });

  return nftStatuses;
};

export const buildLatestMints = (statuses) =>
  Array.from(statuses.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .map(([tokenId, data]) => ({
      tokenId,
      timestamp: data.timestamp,
      owner: data.owner,
      isTransfer: Boolean(data.isTransfer),
    }));

const rpcUrls = () => [process.env.ETH_RPC_URL, ...DEFAULT_RPC_URLS].filter(Boolean);

async function etherscanJson(params, apiKey, fetchImpl) {
  let lastError = new MintStatusError('Etherscan request failed');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(350 * attempt);

    const query = new URLSearchParams({
      chainid: CHAIN_ID,
      ...params,
      apikey: apiKey,
    });
    const response = await fetchImpl(`${ETHERSCAN_BASE}?${query}`, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      lastError = new MintStatusError(`Etherscan HTTP ${response.status}`);
      continue;
    }

    const data = await response.json();
    const resultText = typeof data?.result === 'string' ? data.result : '';
    if (/rate limit|max calls|too many/i.test(`${data?.message || ''} ${resultText}`)) {
      lastError = new MintStatusError('Etherscan rate limit');
      continue;
    }

    return data;
  }

  throw lastError;
}

async function fetchNftTransferPage(apiKey, page, pageSize, fetchImpl) {
  const data = await etherscanJson({
    module: 'account',
    action: 'tokennfttx',
    contractaddress: CONTRACT_ADDRESS,
    page: String(page),
    offset: String(pageSize),
    startblock: '0',
    endblock: '999999999',
    sort: 'asc',
  }, apiKey, fetchImpl);

  if (data?.status === '0' && /no transactions found/i.test(data.message || '')) {
    return [];
  }

  if (data?.status !== '1' || !Array.isArray(data.result)) {
    const detail = typeof data?.result === 'string' ? data.result : data?.message;
    throw new MintStatusError(detail || 'Etherscan API error');
  }

  return data.result;
}

export async function fetchAllNftTransfers(apiKey, fetchImpl = fetch, options = {}) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const maxPages = options.maxPages ?? MAX_PAGES;
  const all = [];
  const seen = new Set();
  let truncated = false;

  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await fetchNftTransferPage(apiKey, page, pageSize, fetchImpl);
    let added = 0;
    batch.forEach((tx) => {
      const key = transferKey(tx);
      if (seen.has(key)) return;
      seen.add(key);
      all.push(tx);
      added += 1;
    });

    if (batch.length < pageSize || added === 0) {
      return { transfers: all, truncated: false };
    }
    if (page === maxPages) truncated = true;
  }

  return { transfers: all, truncated };
}

export async function readTotalSupply({ apiKey, fetchImpl = fetch } = {}) {
  let lastError = new MintStatusError('totalSupply unavailable');

  for (const url of rpcUrls()) {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'afa-mint-progress',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: CONTRACT_ADDRESS, data: TOTAL_SUPPLY_DATA }, 'latest'],
        }),
      });
      if (!response.ok) {
        lastError = new MintStatusError(`RPC HTTP ${response.status}`);
        continue;
      }
      const data = await response.json();
      if (typeof data?.result === 'string') return parseTotalSupply(data.result);
      lastError = new MintStatusError(data?.error?.message || 'RPC error');
    } catch (error) {
      lastError = error instanceof MintStatusError
        ? error
        : new MintStatusError(error?.message || 'RPC error');
    }
  }

  if (apiKey) {
    const data = await etherscanJson({
      module: 'proxy',
      action: 'eth_call',
      to: CONTRACT_ADDRESS,
      data: TOTAL_SUPPLY_DATA,
      tag: 'latest',
    }, apiKey, fetchImpl);
    if (typeof data?.result === 'string') return parseTotalSupply(data.result);
    lastError = new MintStatusError(data?.error?.message || data?.result || 'Etherscan totalSupply failed');
  }

  throw lastError;
}

export async function fetchMintedTokenIds(apiKey, fetchImpl = fetch) {
  const { transfers } = await fetchAllNftTransfers(apiKey, fetchImpl);
  return [...processNFTStatuses(transfers).keys()]
    .map(String)
    .sort((a, b) => Number(a) - Number(b));
}

let cache = null;

export function clearMintStatusCache() {
  cache = null;
}

export async function loadMintStatus({
  apiKey = process.env.ETHERSCAN_API_KEY,
  fetchImpl = fetch,
  now = Date.now(),
  pageSize,
  maxPages,
} = {}) {
  const key = apiKey?.trim();
  if (!key) {
    throw new MintStatusError('Missing ETHERSCAN_API_KEY', 500);
  }

  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.body;
  }

  const [supplyResult, transferResult] = await Promise.all([
    readTotalSupply({ apiKey: key, fetchImpl }).then(
      (value) => ({ ok: true, value }),
      () => ({ ok: false })
    ),
    fetchAllNftTransfers(key, fetchImpl, { pageSize, maxPages }),
  ]);

  const statuses = processNFTStatuses(transferResult.transfers);
  const body = {
    mintedCount: resolveMintedCount(
      supplyResult.ok ? supplyResult.value : null,
      statuses.size
    ),
    truncated: transferResult.truncated,
    entries: Array.from(statuses.entries()),
  };

  cache = { at: now, body };
  return body;
}
