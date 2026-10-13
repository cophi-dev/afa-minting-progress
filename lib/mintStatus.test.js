import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearMintStatusCache,
  fetchAllNftTransfers,
  isMintTransaction,
  loadMintStatus,
  parseTotalSupply,
  processNFTStatuses,
  resolveMintedCount,
} from './mintStatus.js';

const ZERO = '0x0000000000000000000000000000000000000000';

const tx = (overrides) => ({
  hash: '0xabc',
  tokenID: '1',
  transactionIndex: '0',
  from: ZERO,
  to: '0x1111111111111111111111111111111111111111',
  timeStamp: '100',
  ...overrides,
});

const jsonResponse = (body, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => body,
});

describe('parseTotalSupply', () => {
  it('decodes the on-chain hex supply', () => {
    expect(parseTotalSupply('0x16b')).toBe(363);
    expect(parseTotalSupply('0x0')).toBe(0);
  });

  it('rejects unexpected payloads', () => {
    expect(() => parseTotalSupply('363')).toThrow(/totalSupply/);
    expect(() => parseTotalSupply(null)).toThrow(/totalSupply/);
  });
});

describe('resolveMintedCount', () => {
  it('prefers totalSupply over the transfer-derived count', () => {
    expect(resolveMintedCount(363, 10)).toBe(363);
  });

  it('falls back when totalSupply is missing or an empty read contradicts known mints', () => {
    expect(resolveMintedCount(null, 12)).toBe(12);
    expect(resolveMintedCount(0, 12)).toBe(12);
    expect(resolveMintedCount(0, 0)).toBe(0);
  });
});

describe('processNFTStatuses', () => {
  it('keeps the latest transfer and flags secondary sales', () => {
    expect(isMintTransaction(tx({}))).toBe(true);

    const statuses = processNFTStatuses([
      tx({ timeStamp: '10' }),
      tx({
        hash: '0xdef',
        timeStamp: '20',
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
      }),
    ]);

    expect(statuses.size).toBe(1);
    expect(statuses.get(1)).toEqual({
      owner: '0x2222222222222222222222222222222222222222',
      timestamp: 20,
      isTransfer: true,
    });
  });

  it('drops tokens whose latest transfer is a burn', () => {
    const statuses = processNFTStatuses([
      tx({ tokenID: '7' }),
      tx({
        hash: '0xburn',
        tokenID: '7',
        timeStamp: '150',
        from: '0x1111111111111111111111111111111111111111',
        to: ZERO,
      }),
    ]);

    expect(statuses.has(7)).toBe(false);
  });
});

describe('fetchAllNftTransfers', () => {
  it('pages until a short page and does not stop at the first 1000 rows', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      const page = new URL(url).searchParams.get('page');
      calls.push(page);
      const full = page === '1'
        ? [tx({ hash: '0x1', tokenID: '1' }), tx({ hash: '0x2', tokenID: '2' })]
        : [tx({ hash: '0x3', tokenID: '3', timeStamp: '300' })];
      return jsonResponse({ status: '1', message: 'OK', result: full });
    };

    const { transfers, truncated } = await fetchAllNftTransfers('test-key', fetchImpl, {
      pageSize: 2,
      maxPages: 5,
    });

    expect(calls).toEqual(['1', '2']);
    expect(transfers.map((item) => item.tokenID)).toEqual(['1', '2', '3']);
    expect(truncated).toBe(false);
  });

  it('stops when a later page only repeats rows already seen', async () => {
    const row = tx({ hash: '0xsame', tokenID: '9' });
    const fetchImpl = async () => jsonResponse({
      status: '1',
      message: 'OK',
      result: [row, { ...row }],
    });

    const { transfers, truncated } = await fetchAllNftTransfers('test-key', fetchImpl, {
      pageSize: 2,
      maxPages: 5,
    });

    expect(transfers).toHaveLength(1);
    expect(truncated).toBe(false);
  });

  it('treats an empty contract as zero transfers', async () => {
    const fetchImpl = async () => jsonResponse({
      status: '0',
      message: 'No transactions found',
      result: [],
    });

    const { transfers, truncated } = await fetchAllNftTransfers('test-key', fetchImpl, {
      pageSize: 2,
      maxPages: 3,
    });

    expect(transfers).toEqual([]);
    expect(truncated).toBe(false);
  });
});

describe('loadMintStatus', () => {
  afterEach(() => {
    clearMintStatusCache();
    vi.restoreAllMocks();
  });

  it('requires the server env var and does not call upstream without it', async () => {
    const fetchImpl = vi.fn();
    await expect(loadMintStatus({ apiKey: '  ', fetchImpl })).rejects.toThrow(/ETHERSCAN_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('uses totalSupply for the count and still returns every minted token', async () => {
    const fetchImpl = async (url, options = {}) => {
      if (options.method === 'POST') {
        return jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x16b' });
      }
      return jsonResponse({
        status: '1',
        message: 'OK',
        result: [tx({ tokenID: '42', timeStamp: '5' })],
      });
    };

    const body = await loadMintStatus({
      apiKey: 'server-key',
      fetchImpl,
      pageSize: 10,
      maxPages: 2,
    });

    expect(body.mintedCount).toBe(363);
    expect(body.entries).toEqual([[
      42,
      {
        owner: '0x1111111111111111111111111111111111111111',
        timestamp: 5,
        isTransfer: false,
      },
    ]]);
    expect(JSON.stringify(body)).not.toContain('server-key');
  });

  it('reuses a fresh in-memory response', async () => {
    let calls = 0;
    const fetchImpl = async (url, options = {}) => {
      calls += 1;
      if (options.method === 'POST') {
        return jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x2' });
      }
      return jsonResponse({ status: '1', message: 'OK', result: [tx({})] });
    };

    const first = await loadMintStatus({
      apiKey: 'server-key',
      fetchImpl,
      now: 1_000,
      pageSize: 10,
    });
    const second = await loadMintStatus({
      apiKey: 'server-key',
      fetchImpl,
      now: 2_000,
      pageSize: 10,
    });

    expect(second).toEqual(first);
    expect(calls).toBe(2);
  });
});
