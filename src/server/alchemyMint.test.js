import crypto from 'crypto';
import { CONTRACT_ADDRESS, ZERO_ADDRESS } from '../../api/lib/constants';
import { verifyAlchemySignature, isAuthorizedBearer } from '../../api/lib/signature';
import { filterMintActivities } from '../../api/lib/mintFilter';
import { mergeMintRecords, mintRecordKey } from '../../api/lib/mintRecords';
import { buildMintsResponse, parseSinceBlock } from '../../api/lib/mintsResponse';
import {
  buildAssetTransferQuery,
  resolveDeployBlock,
  resolveFromBlock,
} from '../../api/lib/backfillPlan';
import { runMintBackfill } from '../../api/lib/backfill';
import { enrichMintDrafts } from '../../api/lib/enrichMints';
import { redactSecrets } from '../../api/lib/redact';

const KEY = 'test-signing-key';
const sign = (body) => crypto.createHmac('sha256', KEY).update(body, 'utf8').digest('hex');

const recipient = `0x${'ab'.repeat(20)}`;
const sender = `0x${'11'.repeat(20)}`;
const txHash = `0x${'cd'.repeat(32)}`;
const otherHash = `0x${'ef'.repeat(32)}`;

const mintActivity = (overrides = {}) => ({
  fromAddress: '0x0',
  toAddress: recipient,
  contractAddress: '0xfAa0e99EF34Eae8b288CFEeAEa4BF4f5B5f2eaE7',
  blockNum: '0x10',
  hash: txHash,
  erc721TokenId: '0x1eeb',
  category: 'erc721',
  ...overrides,
});

describe('verifyAlchemySignature', () => {
  const raw = '{"event":{"activity":[]}}';

  it('accepts an HMAC-SHA256 of the raw body', () => {
    expect(verifyAlchemySignature(raw, sign(raw), KEY)).toBe(true);
    expect(verifyAlchemySignature(Buffer.from(raw, 'utf8'), sign(raw), KEY)).toBe(true);
    expect(verifyAlchemySignature(raw, sign(raw).toUpperCase(), KEY)).toBe(true);
  });

  it('rejects a re-serialized body, a bad key, and a short signature without throwing', () => {
    const pretty = '{\n  "event": {"activity": []}\n}';
    expect(verifyAlchemySignature(pretty, sign(raw), KEY)).toBe(false);
    expect(verifyAlchemySignature(raw, sign(raw), 'other-key')).toBe(false);
    expect(verifyAlchemySignature(raw, 'abc', KEY)).toBe(false);
    expect(verifyAlchemySignature(raw, '', KEY)).toBe(false);
    expect(verifyAlchemySignature(raw, sign(raw), '')).toBe(false);
    expect(verifyAlchemySignature(raw, undefined, KEY)).toBe(false);
  });
});

describe('isAuthorizedBearer', () => {
  it('compares the bearer token in constant time and rejects mismatches', () => {
    expect(isAuthorizedBearer('Bearer sync-token', 'sync-token')).toBe(true);
    expect(isAuthorizedBearer('bearer sync-token', 'sync-token')).toBe(true);
    expect(isAuthorizedBearer('Bearer other', 'sync-token')).toBe(false);
    expect(isAuthorizedBearer('sync-token', 'sync-token')).toBe(false);
    expect(isAuthorizedBearer(undefined, 'sync-token')).toBe(false);
    expect(isAuthorizedBearer('Bearer sync-token', '')).toBe(false);
  });
});

describe('filterMintActivities', () => {
  it('keeps zero-address mints for this contract and converts the token id to decimal', () => {
    const [fromShorthand] = filterMintActivities([mintActivity()]);
    const [fromPadded] = filterMintActivities([
      mintActivity({
        fromAddress: ZERO_ADDRESS,
        erc721TokenId: '42',
        hash: otherHash,
      }),
    ]);

    expect(fromShorthand).toEqual({
      token_id: 7915,
      recipient,
      block: 16,
      tx_hash: txHash,
    });
    expect(fromPadded).toEqual({
      token_id: 42,
      recipient,
      block: 16,
      tx_hash: otherHash,
    });
  });

  it('drops other senders, other contracts, removed logs, and non-erc721 rows', () => {
    const kept = filterMintActivities([
      mintActivity({ fromAddress: '0x1111111111111111111111111111111111111111' }),
      mintActivity({ contractAddress: '0x0000000000000000000000000000000000000001' }),
      mintActivity({ log: { removed: true } }),
      mintActivity({ category: 'erc1155' }),
      mintActivity({ erc721TokenId: '0x2710' }),
      mintActivity({ hash: otherHash }),
    ]);

    expect(kept).toEqual([{
      token_id: 7915,
      recipient,
      block: 16,
      tx_hash: otherHash,
    }]);
    expect(filterMintActivities(null)).toEqual([]);
    expect(filterMintActivities({})).toEqual([]);
  });
});

describe('mint record store shape', () => {
  const record = {
    token_id: 7,
    recipient,
    tx_sender: sender,
    block: 20,
    timestamp: 30,
    tx_hash: txHash,
  };

  it('is idempotent on tx_hash:token_id', () => {
    const once = mergeMintRecords({ lastBlock: null, mints: {} }, [record, record]);
    const again = mergeMintRecords(once, [{ ...record, timestamp: 30 }]);
    const later = mergeMintRecords(again, [{
      ...record,
      token_id: 8,
      block: 21,
      tx_hash: otherHash,
    }]);

    expect(Object.keys(once.mints)).toEqual([mintRecordKey(record)]);
    expect(Object.keys(again.mints)).toHaveLength(1);
    expect(later.lastBlock).toBe(21);
    expect(Object.keys(later.mints)).toHaveLength(2);
  });

  it('rejects a record that is missing the transaction sender', () => {
    expect(() => mergeMintRecords({ lastBlock: null, mints: {} }, [{
      token_id: 1,
      recipient,
      block: 1,
      timestamp: 1,
      tx_hash: txHash,
    }])).toThrow('Invalid mint record');
  });
});

describe('buildMintsResponse', () => {
  const records = [
    {
      token_id: 2,
      recipient,
      tx_sender: sender,
      block: 10,
      timestamp: 100,
      tx_hash: txHash,
    },
    {
      token_id: 2,
      recipient,
      tx_sender: sender,
      block: 12,
      timestamp: 120,
      tx_hash: otherHash,
    },
    {
      token_id: 5,
      recipient,
      tx_sender: sender,
      block: 11,
      timestamp: 110,
      tx_hash: `0x${'12'.repeat(32)}`,
    },
  ];

  it('returns a public count and minted ids', () => {
    const response = buildMintsResponse(records, { sinceBlock: null, authorized: false });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2, minted: [2, 5] });
    expect(response.cacheControl).toContain('max-age=15');
    expect(response.cacheControl).toContain('s-maxage=30');
  });

  it('returns full mints after since_block only for an authorized caller', () => {
    expect(parseSinceBlock('10')).toEqual({ ok: true, sinceBlock: 10 });
    expect(parseSinceBlock('nope').ok).toBe(false);

    const denied = buildMintsResponse(records, { sinceBlock: 10, authorized: false });
    expect(denied.status).toBe(401);

    const allowed = buildMintsResponse(records, { sinceBlock: 10, authorized: true });
    expect(allowed.status).toBe(200);
    expect(allowed.cacheControl).toContain('private');
    expect(allowed.body.mints.map((mint) => [mint.token_id, mint.block])).toEqual([
      [5, 11],
      [2, 12],
    ]);
    expect(allowed.body.mints[0]).toEqual({
      token_id: 5,
      recipient,
      tx_sender: sender,
      block: 11,
      timestamp: 110,
      tx_hash: `0x${'12'.repeat(32)}`,
    });
  });
});

describe('backfill plan', () => {
  it('starts at the deploy block and queries zero-address erc721 transfers', () => {
    expect(resolveDeployBlock({})).toBe(18455169);
    expect(resolveDeployBlock({ MINT_DEPLOY_BLOCK: '19000000' })).toBe(19000000);
    expect(() => resolveDeployBlock({ MINT_DEPLOY_BLOCK: 'latest' })).toThrow(/MINT_DEPLOY_BLOCK/);
    expect(resolveFromBlock(null, 18455169)).toBe(18455169);
    expect(resolveFromBlock(190, 18455169)).toBe(190);

    const query = buildAssetTransferQuery({ fromBlock: 18455169 });
    expect(query).toMatchObject({
      fromBlock: '0x1199a81',
      fromAddress: ZERO_ADDRESS,
      contractAddresses: [CONTRACT_ADDRESS],
      category: ['erc721'],
      excludeZeroValue: false,
      order: 'asc',
    });
  });

  it('fills from the deploy block and upserts the same mint once', async () => {
    const transfer = {
      from: ZERO_ADDRESS,
      to: recipient,
      hash: txHash,
      blockNum: '0x1199a81',
      category: 'erc721',
      tokenId: '0x2',
      rawContract: { address: CONTRACT_ADDRESS },
      metadata: { blockTimestamp: '2023-10-29T10:12:35.000Z' },
    };
    const call = vi.fn(async () => ({ transfers: [transfer], pageKey: '' }));
    const enrich = vi.fn(async (drafts) => drafts.map((draft) => ({
      token_id: draft.token_id,
      recipient: draft.recipient,
      tx_sender: sender,
      block: draft.block,
      timestamp: draft.timestamp,
      tx_hash: draft.tx_hash,
    })));

    let state = { lastBlock: null, mints: {} };
    const readState = vi.fn(async () => state);
    const upsert = vi.fn(async (records) => {
      state = mergeMintRecords(state, records);
      return state;
    });

    const first = await runMintBackfill({
      readState,
      upsert,
      call,
      enrich,
      env: {},
    });
    const second = await runMintBackfill({
      readState,
      upsert,
      call,
      enrich,
      env: {},
    });

    expect(first.from_block).toBe(18455169);
    expect(first.stored).toBe(1);
    expect(first.done).toBe(true);
    expect(second.stored).toBe(1);
    expect(Object.keys(state.mints)).toHaveLength(1);
    expect(state.mints[`${txHash}:2`].token_id).toBe(2);
    expect(call.mock.calls[0][0]).toBe('alchemy_getAssetTransfers');
    expect(call.mock.calls[0][1][0].fromAddress).toBe(ZERO_ADDRESS);
    expect(call.mock.calls[0][1][0].fromBlock).toBe('0x1199a81');
  });
});

describe('enrichMintDrafts', () => {
  const draft = {
    token_id: 1,
    recipient,
    block: 5,
    tx_hash: txHash,
  };

  it('loads tx_sender with eth_getTransactionByHash and the block timestamp', async () => {
    const batch = vi.fn(async (calls) => {
      if (calls[0].method === 'eth_getTransactionByHash') {
        return [{ from: `0x${'AB'.repeat(20)}` }];
      }
      return [{ timestamp: '0x65' }];
    });

    const [record] = await enrichMintDrafts([draft], batch);
    expect(record).toEqual({
      token_id: 1,
      recipient,
      tx_sender: `0x${'ab'.repeat(20)}`,
      block: 5,
      timestamp: 101,
      tx_hash: txHash,
    });
    expect(batch).toHaveBeenCalledTimes(2);
    expect(batch.mock.calls[0][0][0]).toEqual({
      method: 'eth_getTransactionByHash',
      params: [txHash],
    });
    expect(batch.mock.calls[1][0][0]).toEqual({
      method: 'eth_getBlockByNumber',
      params: ['0x5', false],
    });
  });

  it('keeps a known timestamp and still requires the transaction sender', async () => {
    const batch = vi.fn(async () => [{ from: sender }]);
    const [record] = await enrichMintDrafts([{ ...draft, timestamp: 55 }], batch);
    expect(record.timestamp).toBe(55);
    expect(record.tx_sender).toBe(sender);
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][0][0].method).toBe('eth_getTransactionByHash');

    const missing = vi.fn(async () => [{ from: null }]);
    await expect(enrichMintDrafts([draft], missing)).rejects.toThrow(/transaction sender/);
  });
});

describe('redactSecrets', () => {
  it('strips Alchemy keys and bearer tokens from log text', () => {
    expect(redactSecrets(
      'https://eth-mainnet.g.alchemy.com/v2/secret-key-123 Authorization: Bearer abc.def',
    )).toBe(
      'https://eth-mainnet.g.alchemy.com/v2/[redacted] Authorization: Bearer [redacted]',
    );
  });
});
